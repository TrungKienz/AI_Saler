import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/products");
    } catch (err) {
      setError(apiErrorMessage(err, "Đăng nhập thất bại"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="card w-full p-6">
        <h1 className="text-xl font-bold text-white">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-400">Chào mừng trở lại!</p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button className="btn-primary" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          Chưa có tài khoản? <Link to="/register" className="font-semibold text-brand-400">Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}
