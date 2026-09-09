import { useState } from "react";
import { api, apiErrorMessage } from "../api/client";

type Method = "VIETQR" | "USDT";

function formatVnd(digits: string): string {
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

export function DepositModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [method, setMethod] = useState<Method>("VIETQR");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [qrError, setQrError] = useState(false);

  async function submit() {
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    setLoading(true);
    try {
      const body = method === "VIETQR" ? { method, amountVnd: value } : { method, amountUsdt: value };
      const { data } = await api.post("/api/deposits", body);
      setResult(data.instructions);
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Nạp tiền vào ví</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {!result ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Phương thức</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${method === "VIETQR" ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-slate-700 text-slate-300"}`}
                  onClick={() => { setMethod("VIETQR"); setAmount(""); }}
                >
                  🏦 VietQR (VND)
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${method === "USDT" ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-slate-700 text-slate-300"}`}
                  onClick={() => { setMethod("USDT"); setAmount(""); }}
                >
                  🪙 USDT
                </button>
              </div>
            </div>

            <div>
              <label className="label">{method === "VIETQR" ? "Số tiền (VND)" : "Số USDT"}</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder={method === "VIETQR" ? "vd: 100.000" : "vd: 10"}
                value={method === "VIETQR" ? formatVnd(amount) : amount}
                onChange={(e) =>
                  setAmount(method === "VIETQR" ? e.target.value.replace(/[^\d]/g, "") : e.target.value)
                }
              />
            </div>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button className="btn-primary" disabled={loading} onClick={submit}>
              {loading ? "Đang tạo..." : "Tạo yêu cầu nạp tiền"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            {result.type === "VIETQR" ? (
              <>
                {qrError ? (
                  <div className="w-56 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-xs text-rose-300">
                    Không tải được ảnh mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên dưới.
                  </div>
                ) : (
                  <img
                    src={result.qrUrl}
                    alt="VietQR"
                    className="w-56 rounded-xl border border-slate-800"
                    onError={() => setQrError(true)}
                  />
                )}
                <p className="text-sm text-slate-300">
                  Chuyển khoản tới <b>{result.bankAccountNo}</b> ({result.bankAccountName})<br />
                  Số tiền: <b className="text-brand-400">{result.amountVnd.toLocaleString("vi-VN")}đ</b><br />
                  Nội dung: <b>{result.transferContent}</b>
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-300">
                Gửi <b className="text-brand-400">{result.amountUsdt} USDT</b> (mạng {result.network}) tới:<br />
                <code className="mt-1 block break-all rounded-lg bg-slate-800 px-2 py-1 text-xs">{result.address}</code>
                Ước tính quy đổi: {result.estimatedVnd.toLocaleString("vi-VN")}đ<br />
                Mã giao dịch: <b>{result.transferMemo}</b>
              </p>
            )}
            <p className="text-xs text-slate-500">{result.note}</p>
            <button className="btn-secondary w-full" onClick={onClose}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}
