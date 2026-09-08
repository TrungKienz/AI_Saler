import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";

type Tab = "deposits" | "bank" | "products" | "settings" | "users";

const tabs: { id: Tab; label: string }[] = [
  { id: "deposits", label: "Nạp tiền" },
  { id: "bank", label: "Đối soát ngân hàng" },
  { id: "products", label: "Sản phẩm & Margin" },
  { id: "settings", label: "Cấu hình" },
  { id: "users", label: "Người dùng" },
];

export function Admin() {
  const [tab, setTab] = useState<Tab>("deposits");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Quản trị</h1>
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? "bg-brand-600 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "deposits" && <DepositsTab />}
      {tab === "bank" && <BankTransactionsTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}

// --- Deposits ---
function DepositsTab() {
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED" | "REJECTED" | "">("PENDING");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get("/api/admin/deposits", { params: status ? { status } : {} });
    setDeposits(data.deposits);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function confirm(id: string) {
    setBusyId(id);
    setMsg(null);
    try {
      await api.post(`/api/admin/deposits/${id}/confirm`, {});
      await load();
    } catch (err) {
      setMsg(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    setMsg(null);
    try {
      await api.post(`/api/admin/deposits/${id}/reject`, {});
      await load();
    } catch (err) {
      setMsg(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["PENDING", "CONFIRMED", "REJECTED", ""] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${status === s ? "bg-brand-600 text-white" : "border border-slate-700 text-slate-300"}`}
          >
            {s || "Tất cả"}
          </button>
        ))}
      </div>
      {msg && <p className="mb-3 text-sm text-rose-400">{msg}</p>}
      <div className="card divide-y divide-slate-800">
        {deposits.length === 0 && <p className="p-5 text-sm text-slate-400">Không có giao dịch nào.</p>}
        {deposits.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-100">
                {d.user?.displayName || d.user?.email || d.user?.telegramUsername} — {d.method === "VIETQR" ? `${d.amountVnd?.toLocaleString("vi-VN")}đ` : `${d.amountUsdt} USDT`}
              </p>
              <p className="text-xs text-slate-500">{d.code} · {new Date(d.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            {d.status === "PENDING" ? (
              <div className="flex gap-2">
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={busyId === d.id} onClick={() => confirm(d.id)}>
                  Xác nhận
                </button>
                <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busyId === d.id} onClick={() => reject(d.id)}>
                  Từ chối
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-400">
                {d.status}
                {d.confirmedBy && <span className="ml-1 text-slate-500">({d.confirmedBy === "WEBHOOK" ? "tự động" : "admin"})</span>}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Bank transactions (SePay webhook audit log) ---
function BankTransactionsTab() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Record<string, string>>({});

  async function load() {
    const [tx, deposits] = await Promise.all([
      api.get("/api/admin/bank-transactions"),
      api.get("/api/admin/deposits", { params: { status: "PENDING" } }),
    ]);
    setTransactions(tx.data.transactions);
    setPendingDeposits(deposits.data.deposits);
  }

  useEffect(() => {
    load();
  }, []);

  async function match(bankTransactionId: string) {
    const depositId = selectedDeposit[bankTransactionId];
    if (!depositId) {
      setMsg({ type: "err", text: "Chọn một giao dịch nạp tiền đang chờ để khớp" });
      return;
    }
    setMatchingId(bankTransactionId);
    setMsg(null);
    try {
      await api.post(`/api/admin/bank-transactions/${bankTransactionId}/match`, { depositId });
      setMsg({ type: "ok", text: "Đã khớp và cộng ví thành công" });
      await load();
    } catch (err) {
      setMsg({ type: "err", text: apiErrorMessage(err) });
    } finally {
      setMatchingId(null);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-400">
        Nhật ký mọi giao dịch tiền vào mà SePay báo về. Giao dịch nào tự khớp được mã nạp tiền sẽ tự động cộng ví; giao
        dịch chưa khớp (do nội dung chuyển khoản bị ngân hàng cắt bớt/đổi) có thể khớp thủ công bên dưới.
      </p>
      {msg && <p className={`mb-3 text-sm ${msg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}
      <div className="card divide-y divide-slate-800">
        {transactions.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có giao dịch ngân hàng nào được ghi nhận.</p>}
        {transactions.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-100">{t.transferAmount.toLocaleString("vi-VN")}đ — {t.content}</p>
              <p className="text-xs text-slate-500">
                {t.gateway ?? t.provider} · {t.referenceCode ?? t.externalId} · {new Date(t.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            {t.matchedDepositId ? (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                Đã khớp {t.matchedDeposit?.user?.displayName ? `— ${t.matchedDeposit.user.displayName}` : ""}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  className="input !w-auto !py-1.5 text-xs"
                  value={selectedDeposit[t.id] ?? ""}
                  onChange={(e) => setSelectedDeposit((s) => ({ ...s, [t.id]: e.target.value }))}
                >
                  <option value="">Chọn giao dịch nạp tiền...</option>
                  {pendingDeposits.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {(d.amountVnd ?? 0).toLocaleString("vi-VN")}đ ({d.user?.displayName || d.user?.email})
                    </option>
                  ))}
                </select>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={matchingId === t.id} onClick={() => match(t.id)}>
                  Khớp
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Products / Margin ---
function ProductsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data } = await api.get("/api/admin/products");
    setProducts(data.products);
  }

  useEffect(() => {
    load();
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await api.post("/api/admin/products/refresh");
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function saveMargin(id: string, type: "PERCENT" | "FIXED_USD", value: number) {
    await api.put(`/api/admin/products/${id}/margin`, { type, value });
    await load();
  }

  async function clearMargin(id: string) {
    await api.delete(`/api/admin/products/${id}/margin`);
    await load();
  }

  async function toggleHot(id: string, isHot: boolean) {
    await api.put(`/api/admin/products/${id}/hot`, { isHot });
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-secondary text-sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? "Đang đồng bộ..." : "🔄 Đồng bộ từ nguồn"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Giá gốc</th>
              <th className="px-4 py-3">Giá bán</th>
              <th className="px-4 py-3">Override margin</th>
              <th className="px-4 py-3">HOT</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} onSave={saveMargin} onClear={clearMargin} onToggleHot={toggleHot} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  onSave,
  onClear,
  onToggleHot,
}: {
  product: any;
  onSave: (id: string, type: "PERCENT" | "FIXED_USD", value: number) => Promise<void>;
  onClear: (id: string) => Promise<void>;
  onToggleHot: (id: string, isHot: boolean) => Promise<void>;
}) {
  const [type, setType] = useState<"PERCENT" | "FIXED_USD">(product.marginOverride?.type ?? "PERCENT");
  const [value, setValue] = useState<string>(product.marginOverride?.value?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [hotSaving, setHotSaving] = useState(false);

  return (
    <tr>
      <td className="px-4 py-3 text-slate-100">{product.name}</td>
      <td className="px-4 py-3 text-slate-400">{product.basePriceVnd.toLocaleString("vi-VN")}đ</td>
      <td className="px-4 py-3 font-semibold text-brand-400">{product.sellPriceVnd.toLocaleString("vi-VN")}đ</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <select className="input !w-auto !py-1.5" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="PERCENT">%</option>
            <option value="FIXED_USD">+ USD</option>
          </select>
          <input
            className="input !w-24 !py-1.5"
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            product.isHot ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white" : "border border-slate-700 text-slate-400 hover:bg-slate-800"
          }`}
          disabled={hotSaving}
          onClick={async () => {
            setHotSaving(true);
            await onToggleHot(product.id, !product.isHot);
            setHotSaving(false);
          }}
        >
          {product.isHot ? "🔥 HOT" : "Đặt HOT"}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            className="btn-primary !px-3 !py-1.5 text-xs"
            disabled={saving || value === ""}
            onClick={async () => {
              setSaving(true);
              await onSave(product.id, type, Number(value));
              setSaving(false);
            }}
          >
            Lưu
          </button>
          {product.marginOverride && (
            <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => onClear(product.id)}>
              Xoá
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// --- Settings ---
function SettingsTab() {
  const [config, setConfig] = useState<any | null>(null);
  const [sourceBalance, setSourceBalance] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api.get("/api/admin/config").then(({ data }) => setConfig(data.config));
    api
      .get("/api/admin/source-balance")
      .then(({ data }) => setSourceBalance(data.balance))
      .catch(() => setSourceBalance(null));
  }, []);

  if (!config) return <p className="text-slate-400">Đang tải...</p>;

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const { data } = await api.put("/api/admin/config", config);
      setConfig(data.config);
      setMsg({ type: "ok", text: "Đã lưu cấu hình" });
    } catch (err) {
      setMsg({ type: "err", text: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  function set(field: string, value: any) {
    setConfig((c: any) => ({ ...c, [field]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-white">Chênh lệch giá (margin)</h2>
        <label className="label">Margin mặc định toàn cục (%)</label>
        <input className="input" type="number" step="0.1" value={config.globalMarginPercent}
          onChange={(e) => set("globalMarginPercent", Number(e.target.value))} />
        <p className="mt-1 text-xs text-slate-500">Áp dụng cho mọi sản phẩm chưa có override riêng.</p>

        <h2 className="mb-4 mt-6 font-semibold text-white">API key nguồn hàng</h2>
        <label className="label">Ghi đè SOURCE_API_KEY (để trống nếu dùng .env)</label>
        <input className="input" value={config.sourceApiKeyOverride ?? ""} onChange={(e) => set("sourceApiKeyOverride", e.target.value || null)} />

        {sourceBalance && (
          <div className="mt-4 rounded-xl bg-slate-800/50 p-3 text-sm text-slate-300">
            Số dư ví nguồn: <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{JSON.stringify(sourceBalance, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-white">Nạp tiền qua VietQR (SePay tài khoản phụ)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tên ngân hàng</label>
            <input className="input" value={config.bankId ?? ""} onChange={(e) => set("bankId", e.target.value || null)} placeholder="vd: VietinBank" />
          </div>
          <div>
            <label className="label">Số tài khoản nhận tiền</label>
            <input className="input" value={config.bankAccountNo ?? ""} onChange={(e) => set("bankAccountNo", e.target.value || null)} placeholder="vd: 109869589431" />
          </div>
          <div>
            <label className="label">Số tài khoản phụ (VA)</label>
            <input className="input" value={config.sepayVaNumber ?? ""} onChange={(e) => set("sepayVaNumber", e.target.value || null)} placeholder="vd: BTK" />
          </div>
          <div>
            <label className="label">Tên chủ tài khoản (hiển thị, tuỳ chọn)</label>
            <input className="input" value={config.bankAccountName ?? ""} onChange={(e) => set("bankAccountName", e.target.value || null)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Lấy 3 giá trị trên từ trang cấu hình Tài khoản phụ trên SePay (qr.sepay.vn). Nội dung chuyển khoản sẽ tự động
          tạo theo đúng chuẩn SePay: <code>SEVQR TKP&lt;Số VA&gt; &lt;mã đơn&gt;</code>.
        </p>

        <h2 className="mb-4 mt-6 font-semibold text-white">Tự động xác nhận (SePay webhook)</h2>
        <label className="label">Webhook URL (khai báo trong dashboard SePay)</label>
        <input className="input" readOnly value={`${(import.meta as any).env.VITE_API_URL ?? "http://localhost:4000"}/api/webhooks/sepay`} onFocus={(e) => e.target.select()} />
        <p className="mt-1 text-xs text-slate-500">
          Vào SePay → Công ty/Tài khoản ngân hàng → Webhooks → thêm URL trên, phương thức POST, và đặt "API Key" bằng
          đúng giá trị bên dưới.
        </p>
        <label className="label mt-3">API Key webhook (phải khớp với SePay)</label>
        <input className="input" value={config.sepayWebhookApiKey ?? ""} onChange={(e) => set("sepayWebhookApiKey", e.target.value || null)} placeholder="Để trống = không kiểm tra (không khuyến khích)" />

        <h2 className="mb-4 mt-6 font-semibold text-white">Nạp tiền qua USDT</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Địa chỉ ví</label>
            <input className="input" value={config.usdtAddress ?? ""} onChange={(e) => set("usdtAddress", e.target.value || null)} />
          </div>
          <div>
            <label className="label">Mạng</label>
            <input className="input" value={config.usdtNetwork ?? ""} onChange={(e) => set("usdtNetwork", e.target.value || null)} placeholder="BEP20" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {msg && <p className={`mb-3 text-sm ${msg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}
        <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Đang lưu..." : "Lưu cấu hình"}</button>
      </div>
    </div>
  );
}

// --- Users ---
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.get("/api/admin/users").then(({ data }) => setUsers(data.users));
  }, []);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-4 py-3">Người dùng</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Telegram</th>
            <th className="px-4 py-3">Vai trò</th>
            <th className="px-4 py-3">Số dư</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 text-slate-100">{u.displayName}</td>
              <td className="px-4 py-3 text-slate-400">{u.email ?? "—"}</td>
              <td className="px-4 py-3 text-slate-400">{u.telegramUsername ? `@${u.telegramUsername}` : "—"}</td>
              <td className="px-4 py-3 text-slate-400">{u.role}</td>
              <td className="px-4 py-3 font-semibold text-brand-400">{u.balanceVnd.toLocaleString("vi-VN")}đ</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
