import { useEffect, useState } from "react";
import { api, apiErrorMessage, Product } from "../api/client";
import { ProductCard } from "../components/ProductCard";
import { OrderItemsList } from "../components/OrderItemsList";
import { useAuth } from "../context/AuthContext";

export function Products() {
  const { user, refreshUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/products");
      setProducts(data.products);
    } catch (err) {
      setMessage({ type: "err", text: apiErrorMessage(err, "Không tải được sản phẩm") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(product: Product) {
    if (!user) {
      setMessage({ type: "err", text: "Vui lòng đăng nhập để mua hàng" });
      return;
    }
    setBuyingId(product.id);
    setMessage(null);
    setPurchasedItems([]);
    try {
      const { data } = await api.post("/api/orders", { productId: product.id, quantity: 1 });
      if (data.order.status === "COMPLETED") {
        setMessage({ type: "ok", text: `Mua thành công: ${data.order.productName}` });
        setPurchasedItems(data.order.items ?? []);
      } else {
        setMessage({ type: "err", text: `Thất bại: ${data.order.failReason ?? "Lỗi không xác định"} (đã hoàn tiền)` });
      }
      await refreshUser();
      await load();
    } catch (err) {
      setMessage({ type: "err", text: apiErrorMessage(err, "Mua hàng thất bại") });
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Sản phẩm</h1>
        <button className="btn-secondary text-sm" onClick={load}>🔄 Làm mới</button>
      </div>

      {message && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${message.type === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {message.text}
        </div>
      )}

      {purchasedItems.length > 0 && (
        <div className="card mb-6 p-5">
          <h2 className="mb-3 font-semibold text-white">Nội dung đơn hàng vừa mua</h2>
          <OrderItemsList items={purchasedItems} />
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Đang tải sản phẩm...</p>
      ) : products.length === 0 ? (
        <p className="text-slate-400">Chưa có sản phẩm nào.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} buying={buyingId === p.id} onBuy={() => buy(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
