import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-base font-medium transition ${
    isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
              <div className="hidden md:block">
                <button
                  className="btn-secondary !px-3 !py-1.5 text-sm"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <NavLink to="/login" className="btn-secondary !px-3 !py-1.5 text-sm">Đăng nhập</NavLink>
              <NavLink to="/register" className="btn-primary !px-3 !py-1.5 text-sm">Đăng ký</NavLink>
            </div>
          )}

          <button
            type="button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-200 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/products" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>Sản phẩm</NavLink>
            {user && <NavLink to="/wallet" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>Ví</NavLink>}
            {user && <NavLink to="/orders" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>Đơn hàng</NavLink>}
            {user && <NavLink to="/profile" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>Hồ sơ</NavLink>}
            {user?.role === "ADMIN" && (
              <NavLink to="/admin" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>Quản trị</NavLink>
            )}

            <div className="mt-2 border-t border-slate-800 pt-3">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-brand-400">
                    {user.balanceVnd.toLocaleString("vi-VN")}đ
                  </span>
                  <button
                    className="btn-secondary !px-3 !py-1.5 text-sm"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate("/");
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <NavLink to="/login" className="btn-secondary !px-3 !py-1.5 text-sm" onClick={() => setMenuOpen(false)}>Đăng nhập</NavLink>
                  <NavLink to="/register" className="btn-primary !px-3 !py-1.5 text-sm" onClick={() => setMenuOpen(false)}>Đăng ký</NavLink>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
