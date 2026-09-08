import { Product } from "../api/client";

export function ProductCard({ product, onBuy, buying }: { product: Product; onBuy: () => void; buying: boolean }) {
  return (
    <div
      className={`card relative flex flex-col gap-3 p-5 ${
        product.isHot ? "ring-2 ring-orange-500/70" : ""
      }`}
    >
      {product.isHot && (
        <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-2.5 py-0.5 text-xs font-bold text-white shadow">
          🔥 HOT
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-slate-100">{product.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            product.inStock ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
          }`}
        >
          {product.inStock ? `Còn ${product.stock}` : "Hết hàng"}
        </span>
      </div>
      <div className="text-2xl font-extrabold text-brand-400">{product.priceVnd.toLocaleString("vi-VN")}đ</div>
      <button className="btn-primary mt-auto" disabled={!product.inStock || buying} onClick={onBuy}>
        {buying ? "Đang xử lý..." : "Mua ngay"}
      </button>
    </div>
  );
}
