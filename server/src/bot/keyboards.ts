import { Markup } from "telegraf";

export const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🛍️ Danh mục", "menu:products")],
  [Markup.button.callback("💰 Số dư", "menu:balance"), Markup.button.callback("💳 Nạp tiền", "menu:deposit")],
  [Markup.button.callback("🧾 Lịch sử", "menu:orders"), Markup.button.callback("🔗 Liên kết web", "menu:link")],
]);

export function productListKeyboard(products: { id: string; name: string; priceVnd: number; inStock: boolean }[]) {
  const rows = products.map((p) => [
    Markup.button.callback(
      `${p.inStock ? "" : "⛔ "}${p.name} - ${p.priceVnd.toLocaleString("vi-VN")}đ`,
      `buy:show:${p.id}`
    ),
  ]);
  rows.push([Markup.button.callback("🔄 Làm mới", "menu:products")]);
  rows.push([Markup.button.callback("⬅️ Menu", "menu:home")]);
  return Markup.inlineKeyboard(rows);
}

export function buyConfirmKeyboard(productId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ Xác nhận mua 1", `buy:confirm:${productId}`)],
    [Markup.button.callback("⬅️ Quay lại danh mục", "menu:products")],
  ]);
}

export const depositMethodKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🏦 Chuyển khoản VietQR", "deposit:method:VIETQR")],
  [Markup.button.callback("🪙 USDT", "deposit:method:USDT")],
  [Markup.button.callback("⬅️ Menu", "menu:home")],
]);

export const backToMenuKeyboard = Markup.inlineKeyboard([[Markup.button.callback("⬅️ Menu", "menu:home")]]);
