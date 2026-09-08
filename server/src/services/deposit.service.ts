import crypto from "crypto";
import { DepositStatus, DepositMethod, ConfirmSource } from "@prisma/client";
import { prisma } from "../prisma";
import { getConfig } from "./config.service";
import { buildVietQrImageUrl } from "../lib/vietqr";
import { getVndPerUsdRate } from "./rate.service";
import { notifyTelegram } from "./notify.service";

// Deposit codes look like "DEP" + 10 uppercase hex chars. Keeping this fixed
// and easy to spot lets us recover it even if a bank truncates/mangles the
// free-text transfer content the customer's banking app actually sent.
const DEPOSIT_CODE_RE = /DEP[0-9A-F]{10}/;

function generateCode(): string {
  return "DEP" + crypto.randomBytes(5).toString("hex").toUpperCase();
}

export async function createDeposit(userId: string, input: { method: DepositMethod; amountVnd?: number; amountUsdt?: number }) {
  const config = await getConfig();
  const code = generateCode();

  if (input.method === DepositMethod.VIETQR) {
    if (!config.bankId || !config.bankAccountNo || !config.bankAccountName) {
      throw new Error("Bank transfer is not configured yet. Contact the shop admin.");
    }
    if (!input.amountVnd || input.amountVnd < 10000) {
      throw new Error("Minimum deposit is 10,000 VND");
    }
    const deposit = await prisma.deposit.create({
      data: { userId, code, method: "VIETQR", amountVnd: input.amountVnd, status: DepositStatus.PENDING },
    });
    const qrUrl = buildVietQrImageUrl({
      bankId: config.bankId,
      accountNo: config.bankAccountNo,
      accountName: config.bankAccountName,
      amountVnd: input.amountVnd,
      content: code,
    });
    return {
      deposit,
      instructions: {
        type: "VIETQR" as const,
        qrUrl,
        bankAccountNo: config.bankAccountNo,
        bankAccountName: config.bankAccountName,
        amountVnd: input.amountVnd,
        transferContent: code,
        note: "Chuyển khoản ĐÚNG số tiền và nội dung ở trên. Ví sẽ tự động được cộng tiền trong vòng khoảng 1 phút sau khi hệ thống nhận được báo có từ ngân hàng.",
      },
    };
  }

  // USDT
  if (!config.usdtAddress) {
    throw new Error("USDT deposits are not configured yet. Contact the shop admin.");
  }
  if (!input.amountUsdt || input.amountUsdt < 1) {
    throw new Error("Minimum deposit is 1 USDT");
  }
  const rate = await getVndPerUsdRate();
  const deposit = await prisma.deposit.create({
    data: { userId, code, method: "USDT", amountUsdt: input.amountUsdt, status: DepositStatus.PENDING },
  });
  return {
    deposit,
    instructions: {
      type: "USDT" as const,
      address: config.usdtAddress,
      network: config.usdtNetwork ?? "BEP20",
      amountUsdt: input.amountUsdt,
      estimatedVnd: Math.round(input.amountUsdt * rate),
      transferMemo: code,
      note: "Gửi đúng số USDT ở trên tới địa chỉ ví, sau đó gửi mã giao dịch (nếu có) cho admin để được xác nhận nhanh hơn.",
    },
  };
}

export async function attachTxHash(userId: string, depositId: string, txHash: string) {
  const deposit = await prisma.deposit.findFirst({ where: { id: depositId, userId } });
  if (!deposit) throw new Error("Deposit not found");
  return prisma.deposit.update({ where: { id: depositId }, data: { txHash } });
}

export async function listUserDeposits(userId: string) {
  return prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function adminListDeposits(status?: DepositStatus) {
  return prisma.deposit.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, email: true, displayName: true, telegramUsername: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// Shared by the admin "confirm" button and the auto-detect bank webhook.
// Credits the wallet and flips the deposit to CONFIRMED atomically.
async function applyConfirm(depositId: string, finalVnd: number, source: ConfirmSource) {
  const pending = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } });

  // Atomically claim the PENDING row so two near-simultaneous confirms (e.g. an
  // admin click racing a webhook retry) can't both credit the wallet.
  const claim = await prisma.deposit.updateMany({
    where: { id: depositId, status: DepositStatus.PENDING },
    data: { status: DepositStatus.CONFIRMED, confirmedVnd: finalVnd, confirmedAt: new Date(), confirmedBy: source },
  });
  if (claim.count === 0) {
    throw new Error("Deposit already processed");
  }

  const [updatedDeposit, , user] = await prisma.$transaction([
    prisma.deposit.findUniqueOrThrow({ where: { id: depositId } }),
    prisma.user.update({ where: { id: pending.userId }, data: { balanceVnd: { increment: finalVnd } } }),
    prisma.user.findUniqueOrThrow({ where: { id: pending.userId } }),
  ]);

  await notifyTelegram(
    user.telegramId,
    `✅ Nạp tiền thành công! Đã cộng <b>${finalVnd.toLocaleString("vi-VN")}đ</b> vào ví.\nMã giao dịch: ${updatedDeposit.code}`
  );

  return { deposit: updatedDeposit, creditedVnd: finalVnd };
}

export async function adminConfirmDeposit(depositId: string, confirmedVnd?: number) {
  const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } });
  if (deposit.status !== DepositStatus.PENDING) {
    throw new Error("Deposit already processed");
  }

  let finalVnd = confirmedVnd;
  if (!finalVnd) {
    if (deposit.method === "VIETQR" && deposit.amountVnd) {
      finalVnd = deposit.amountVnd;
    } else if (deposit.method === "USDT" && deposit.amountUsdt) {
      const rate = await getVndPerUsdRate();
      finalVnd = Math.round(deposit.amountUsdt * rate);
    } else {
      throw new Error("Unable to determine credited amount, pass confirmedVnd explicitly");
    }
  }

  return applyConfirm(depositId, finalVnd, ConfirmSource.ADMIN);
}

// Called from the SePay webhook for every incoming ("in") bank transaction.
// Tries to recover our deposit code from the free-text transfer content and,
// if it matches a still-pending VietQR deposit for the same amount, credits
// the wallet automatically — no admin click needed. Every transaction is
// logged to BankTransaction (keyed by the gateway's own id) both so retried
// webhook deliveries are idempotent and so admins can see what didn't match.
export async function processIncomingBankTransaction(input: {
  provider: string;
  externalId: string;
  gateway?: string;
  accountNumber?: string;
  transferAmount: number;
  content: string;
  referenceCode?: string;
}) {
  const existing = await prisma.bankTransaction.findUnique({ where: { externalId: input.externalId } });
  if (existing) {
    return { alreadyProcessed: true, matched: !!existing.matchedDepositId };
  }

  const normalizedContent = input.content.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = normalizedContent.match(DEPOSIT_CODE_RE);
  let matchedDepositId: string | null = null;

  if (match) {
    const deposit = await prisma.deposit.findUnique({ where: { code: match[0] } });
    if (
      deposit &&
      deposit.status === DepositStatus.PENDING &&
      deposit.method === DepositMethod.VIETQR &&
      deposit.amountVnd === input.transferAmount
    ) {
      await applyConfirm(deposit.id, input.transferAmount, ConfirmSource.WEBHOOK);
      matchedDepositId = deposit.id;
    }
  }

  await prisma.bankTransaction.create({
    data: {
      provider: input.provider,
      externalId: input.externalId,
      gateway: input.gateway,
      accountNumber: input.accountNumber,
      transferAmount: input.transferAmount,
      content: input.content,
      referenceCode: input.referenceCode,
      matchedDepositId,
    },
  });

  return { alreadyProcessed: false, matched: !!matchedDepositId };
}

export async function adminListBankTransactions() {
  return prisma.bankTransaction.findMany({
    include: { matchedDeposit: { include: { user: { select: { email: true, displayName: true, telegramUsername: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

// Manual fallback for when a bank truncates/alters the transfer content enough
// that auto-matching missed it, so an admin can still reconcile it by hand.
export async function adminMatchBankTransaction(bankTransactionId: string, depositId: string) {
  const tx = await prisma.bankTransaction.findUniqueOrThrow({ where: { id: bankTransactionId } });
  if (tx.matchedDepositId) throw new Error("Transaction already matched to a deposit");

  const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } });
  if (deposit.status !== DepositStatus.PENDING) throw new Error("Deposit already processed");

  const result = await applyConfirm(depositId, tx.transferAmount, ConfirmSource.ADMIN);
  await prisma.bankTransaction.update({ where: { id: bankTransactionId }, data: { matchedDepositId: depositId } });
  return result;
}

export async function adminRejectDeposit(depositId: string, note?: string) {
  const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } });
  if (deposit.status !== DepositStatus.PENDING) {
    throw new Error("Deposit already processed");
  }
  const updated = await prisma.deposit.update({
    where: { id: depositId },
    data: { status: DepositStatus.REJECTED, note },
  });
  const user = await prisma.user.findUnique({ where: { id: deposit.userId } });
  await notifyTelegram(user?.telegramId, `❌ Yêu cầu nạp tiền ${deposit.code} đã bị từ chối.${note ? " Lý do: " + note : ""}`);
  return updated;
}
