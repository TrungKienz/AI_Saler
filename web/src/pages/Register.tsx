import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      navigate("/products");
    } catch (err) {
      setError(apiErrorMessage(err, "Đăng ký thất bại"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="card w-full p-6">
        <h1 className="text-xl font-bold text-white">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-slate-400">Chỉ mất chưa đầy một phút.</p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="label">Tên hiển thị</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button className="btn-primary" disabled={loading}>{loading ? "Đang tạo..." : "Đăng ký"}</button>
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          Đã có tài khoản? <Link to="/login" className="font-semibold text-brand-400">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}
