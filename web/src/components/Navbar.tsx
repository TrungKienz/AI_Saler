import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">🛒</span>
          Shop
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/products" className={linkClass}>Sản phẩm</NavLink>
          {user && <NavLink to="/wallet" className={linkClass}>Ví</NavLink>}
          {user && <NavLink to="/orders" className={linkClass}>Đơn hàng</NavLink>}
          {user && <NavLink to="/profile" className={linkClass}>Hồ sơ</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/admin" className={linkClass}>Quản trị</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-brand-400 sm:block">
                {user.balanceVnd.toLocaleString("vi-VN")}đ
              </span>
              <button
                className="btn-secondary !px-3 !py-1.5 text-sm"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn-secondary !px-3 !py-1.5 text-sm">Đăng nhập</NavLink>
              <NavLink to="/register" className="btn-primary !px-3 !py-1.5 text-sm">Đăng ký</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
