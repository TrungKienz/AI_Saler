import { useEffect, useState } from "react";
import { api, Order } from "../api/client";

const statusClass: Record<Order["status"], string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  COMPLETED: "bg-emerald-500/10 text-emerald-400",
  FAILED: "bg-rose-500/10 text-rose-400",
  REFUNDED: "bg-slate-500/10 text-slate-400",
};

const statusLabel: Record<Order["status"], string> = {
  PENDING: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn tiền",
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get("/api/orders").then(({ data }) => setOrders(data.orders));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Lịch sử đơn hàng</h1>
      <div className="card divide-y divide-slate-800">
        {orders.length === 0 && <p className="p-5 text-sm text-slate-400">Bạn chưa có đơn hàng nào.</p>}
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-100">{o.productName} x{o.quantity}</p>
              <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString("vi-VN")}</p>
              {o.failReason && <p className="text-xs text-rose-400">{o.failReason}</p>}
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-100">{o.totalPriceVnd.toLocaleString("vi-VN")}đ</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[o.status]}`}>
                {statusLabel[o.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
