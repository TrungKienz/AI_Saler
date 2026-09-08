import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Profile() {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function link(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      await api.post("/api/auth/link", { code });
      await refreshUser();
      setMessage({ type: "ok", text: "Liên kết tài khoản Telegram thành công!" });
      setCode("");
    } catch (err) {
      setMessage({ type: "err", text: apiErrorMessage(err, "Liên kết thất bại") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">Hồ sơ</h1>

      <div className="card mb-6 p-6">
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-slate-400">Tên hiển thị</dt>
          <dd className="col-span-2 text-slate-100">{user?.displayName}</dd>
          <dt className="text-slate-400">Email</dt>
          <dd className="col-span-2 text-slate-100">{user?.email ?? "—"}</dd>
          <dt className="text-slate-400">Telegram</dt>
          <dd className="col-span-2 text-slate-100">{user?.telegramUsername ? `@${user.telegramUsername}` : "Chưa liên kết"}</dd>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-white">Liên kết tài khoản Telegram</h2>
        <p className="mt-1 text-sm text-slate-400">
          Mở bot Telegram, gõ lệnh <code className="rounded bg-slate-800 px-1.5 py-0.5">/link</code> để lấy mã 6 số, rồi nhập vào ô dưới đây. Ví sẽ được gộp làm một.
        </p>
        <form onSubmit={link} className="mt-4 flex gap-2">
          <input
            className="input"
            placeholder="Nhập mã 6 số"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn-primary shrink-0" disabled={loading || code.length !== 6}>
            {loading ? "Đang liên kết..." : "Liên kết"}
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${message.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
