import { useEffect, useState } from "react";
import { api, Deposit } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DepositModal } from "../components/DepositModal";

const statusLabel: Record<Deposit["status"], string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã cộng tiền",
  REJECTED: "Từ chối",
};

const statusClass: Record<Deposit["status"], string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  CONFIRMED: "bg-emerald-500/10 text-emerald-400",
  REJECTED: "bg-rose-500/10 text-rose-400",
};

export function Wallet() {
  const { user, refreshUser } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    const { data } = await api.get("/api/deposits");
    setDeposits(data.deposits);
    return data.deposits as Deposit[];
  }

  useEffect(() => {
    load();
  }, []);

  // While a deposit is still pending, poll so the balance updates the moment
  // the SePay webhook auto-confirms it — no manual refresh needed.
  useEffect(() => {
    const hasPending = deposits.some((d) => d.status === "PENDING");
    if (!hasPending) return;
    const interval = setInterval(async () => {
      await load();
      refreshUser();
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deposits.some((d) => d.status === "PENDING")]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="card mb-6 flex flex-col items-center gap-2 p-8 text-center">
        <p className="text-sm text-slate-400">Số dư khả dụng</p>
        <p className="text-4xl font-extrabold text-white">{(user?.balanceVnd ?? 0).toLocaleString("vi-VN")}đ</p>
        <button className="btn-primary mt-3" onClick={() => setShowModal(true)}>+ Nạp tiền</button>
      </div>

      <h2 className="mb-3 text-lg font-bold text-white">Lịch sử nạp tiền</h2>
      <div className="card divide-y divide-slate-800">
        {deposits.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có giao dịch nạp tiền nào.</p>}
        {deposits.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-100">
                {d.method === "VIETQR" ? `${d.amountVnd?.toLocaleString("vi-VN")}đ` : `${d.amountUsdt} USDT`}
              </p>
              <p className="text-xs text-slate-500">
                {d.code} · {new Date(d.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[d.status]}`}>
              {statusLabel[d.status]}
            </span>
          </div>
        ))}
      </div>

      {showModal && (
        <DepositModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            load();
            refreshUser();
          }}
        />
      )}
    </div>
  );
}
