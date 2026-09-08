import { prisma } from "../prisma";

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return user.balanceVnd;
}

export async function creditWallet(userId: string, amountVnd: number) {
  if (amountVnd <= 0) throw new Error("amountVnd must be positive");
  return prisma.user.update({
    where: { id: userId },
    data: { balanceVnd: { increment: amountVnd } },
  });
}

// Atomically debits the wallet only if there is enough balance, to avoid
// double-spend races when two purchases happen at nearly the same time.
export async function debitWalletIfSufficient(userId: string, amountVnd: number): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { id: userId, balanceVnd: { gte: amountVnd } },
    data: { balanceVnd: { decrement: amountVnd } },
  });
  return result.count === 1;
}
