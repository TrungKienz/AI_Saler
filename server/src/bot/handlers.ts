import { Telegraf, Context } from "telegraf";
import { findOrCreateTelegramUser, createLinkCode } from "../services/auth.service";
import { getBalance } from "../services/wallet.service";
import { listProductsForSale, getSellableProductById } from "../services/product.service";
import { buyProduct, listUserOrders, InsufficientBalanceError } from "../services/order.service";
import { createDeposit } from "../services/deposit.service";
import { DepositMethod } from "@prisma/client";
import {
  mainMenuKeyboard,
  productListKeyboard,
  buyConfirmKeyboard,
  depositMethodKeyboard,
  backToMenuKeyboard,
} from "./keyboards";

interface SessionData {
  awaitingDepositMethod?: DepositMethod;
}

export interface BotContext extends Context {
  session: SessionData;
}

const WELCOME = "👋 Chào mừng đến với Shop!\nChọn một mục bên dưới để bắt đầu.";

async function getUser(ctx: BotContext) {
  const from = ctx.from!;
  return findOrCreateTelegramUser(String(from.id), from.username, from.first_name);
}

export function registerHandlers(bot: Telegraf<BotContext>) {
  bot.start(async (ctx) => {
    await getUser(ctx);
    await ctx.reply(WELCOME, mainMenuKeyboard);
  });

  bot.command("link", async (ctx) => {
    const from = ctx.from!;
    const code = await createLinkCode(String(from.id), from.username);
    await ctx.reply(
      `🔗 Mã liên kết tài khoản web của bạn: <b>${code}</b>\nMở website, đăng nhập, vào Hồ sơ và nhập mã này để gộp ví (hết hạn sau 10 phút).`,
      { parse_mode: "HTML" }
    );
  });

  bot.action("menu:home", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(WELCOME, mainMenuKeyboard).catch(() => ctx.reply(WELCOME, mainMenuKeyboard));
  });

  bot.action("menu:products", async (ctx) => {
    await ctx.answerCbQuery();
    const products = await listProductsForSale();
    const text = products.length ? "🛍️ Chọn sản phẩm để mua:" : "Hiện chưa có sản phẩm nào.";
    await ctx
      .editMessageText(text, productListKeyboard(products))
      .catch(() => ctx.reply(text, productListKeyboard(products)));
  });

  bot.action("menu:balance", async (ctx) => {
    await ctx.answerCbQuery();
    const user = await getUser(ctx);
    const balance = await getBalance(user.id);
    await ctx.reply(`💰 Số dư ví: <b>${balance.toLocaleString("vi-VN")}đ</b>`, {
      parse_mode: "HTML",
      ...backToMenuKeyboard,
    });
  });

  bot.action("menu:orders", async (ctx) => {
    await ctx.answerCbQuery();
    const user = await getUser(ctx);
    const orders = await listUserOrders(user.id);
    if (!orders.length) {
      await ctx.reply("Bạn chưa có đơn hàng nào.", backToMenuKeyboard);
      return;
    }
    const lines = orders
      .slice(0, 10)
      .map(
        (o) =>
          `${statusEmoji(o.status)} ${o.productName} x${o.quantity} - ${o.totalPriceVnd.toLocaleString("vi-VN")}đ (${o.status})`
      );
    await ctx.reply(`🧾 10 đơn gần nhất:\n\n${lines.join("\n")}`, backToMenuKeyboard);
  });

  bot.action("menu:deposit", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx
      .editMessageText("💳 Chọn phương thức nạp tiền:", depositMethodKeyboard)
      .catch(() => ctx.reply("💳 Chọn phương thức nạp tiền:", depositMethodKeyboard));
  });

  bot.action("menu:link", async (ctx) => {
    await ctx.answerCbQuery();
    const from = ctx.from!;
    const code = await createLinkCode(String(from.id), from.username);
    await ctx.reply(
      `🔗 Mã liên kết tài khoản web của bạn: <b>${code}</b>\nMở website, đăng nhập, vào Hồ sơ và nhập mã này để gộp ví (hết hạn sau 10 phút).`,
      { parse_mode: "HTML", ...backToMenuKeyboard }
    );
  });

  bot.action(/^deposit:method:(VIETQR|USDT)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const method = ctx.match[1] as DepositMethod;
    ctx.session.awaitingDepositMethod = method;
    const prompt =
      method === "VIETQR"
        ? "Nhập số tiền VND muốn nạp (tối thiểu 10,000đ), ví dụ: 100000"
        : "Nhập số USDT muốn nạp (tối thiểu 1), ví dụ: 10";
    await ctx.reply(prompt);
  });

  bot.action(/^buy:show:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = ctx.match[1];
    const sellable = await getSellableProductById(productId);
    if (!sellable) {
      await ctx.reply("Sản phẩm không còn khả dụng.", backToMenuKeyboard);
      return;
    }
    const { product, priceVnd } = sellable;
    const text = `🛍️ <b>${product.name}</b>\nGiá: <b>${priceVnd.toLocaleString("vi-VN")}đ</b>\nCòn lại: ${product.stock}\n\nXác nhận mua số lượng 1?`;
    await ctx
      .editMessageText(text, { parse_mode: "HTML", ...buyConfirmKeyboard(productId) })
      .catch(() => ctx.reply(text, { parse_mode: "HTML", ...buyConfirmKeyboard(productId) }));
  });

  bot.action(/^buy:confirm:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = ctx.match[1];
    const user = await getUser(ctx);
    try {
      const order = await buyProduct(user.id, productId, 1);
      if (order.status === "COMPLETED") {
        await ctx.reply(`✅ Mua thành công: ${order.productName}\nSố tiền: ${order.totalPriceVnd.toLocaleString("vi-VN")}đ`, backToMenuKeyboard);
      } else {
        await ctx.reply(`❌ Giao dịch thất bại: ${order.failReason ?? "Lỗi không xác định"}\nSố dư đã được hoàn lại.`, backToMenuKeyboard);
      }
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        await ctx.reply("❌ Số dư ví không đủ. Vui lòng nạp thêm tiền.", depositMethodKeyboard);
      } else {
        await ctx.reply(`❌ ${(err as Error).message}`, backToMenuKeyboard);
      }
    }
  });

  bot.on("text", async (ctx) => {
    const method = ctx.session.awaitingDepositMethod;
    if (!method) return; // not in a flow, ignore free text
    const amount = Number(ctx.message.text.replace(/[,\.\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      await ctx.reply("Số tiền không hợp lệ, vui lòng nhập lại (chỉ nhập số).");
      return;
    }
    ctx.session.awaitingDepositMethod = undefined;
    const user = await getUser(ctx);
    try {
      if (method === "VIETQR") {
        const { deposit, instructions } = await createDeposit(user.id, { method: "VIETQR", amountVnd: amount });
        if (instructions.type === "VIETQR") {
          await ctx.replyWithPhoto(instructions.qrUrl, {
            caption: `Quét mã để chuyển khoản.\nSố tiền: ${instructions.amountVnd.toLocaleString("vi-VN")}đ\nNội dung: ${instructions.transferContent}\nMã giao dịch: ${deposit.code}\n\n${instructions.note}`,
            ...backToMenuKeyboard,
          });
        }
      } else {
        const { deposit, instructions } = await createDeposit(user.id, { method: "USDT", amountUsdt: amount });
        if (instructions.type === "USDT") {
          await ctx.reply(
            `Gửi <b>${instructions.amountUsdt} USDT</b> (mạng ${instructions.network}) tới địa chỉ:\n<code>${instructions.address}</code>\n\nƯớc tính quy đổi: ${instructions.estimatedVnd.toLocaleString("vi-VN")}đ\nMã giao dịch: ${deposit.code}\n\n${instructions.note}`,
            { parse_mode: "HTML", ...backToMenuKeyboard }
          );
        }
      }
    } catch (err) {
      await ctx.reply(`❌ ${(err as Error).message}`, backToMenuKeyboard);
    }
  });
}

function statusEmoji(status: string) {
  switch (status) {
    case "COMPLETED":
      return "✅";
    case "FAILED":
      return "❌";
    case "REFUNDED":
      return "↩️";
    default:
      return "⏳";
  }
}
