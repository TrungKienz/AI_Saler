import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-4 inline-block rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
          Giao hàng tự động sau khi thanh toán
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Nạp ví, mua ngay <span className="text-brand-400">tài khoản &amp; dịch vụ số</span>
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          ChatGPT, Claude API, Capcut Pro, MS365 và nhiều sản phẩm khác. Nạp tiền một lần, mua bất cứ lúc nào.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/products" className="btn-primary px-6 py-3 text-base">Xem sản phẩm</Link>
          <Link to="/register" className="btn-secondary px-6 py-3 text-base">Tạo tài khoản</Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        <Feature icon="⚡" title="Tự động" desc="Đơn hàng được xử lý ngay sau khi ví đủ số dư." />
        <Feature icon="🔒" title="An toàn" desc="Ví được quản lý riêng, tiền vào được ngân hàng báo về và tự động cộng ví." />
        <Feature icon="🤖" title="Đa nền tảng" desc="Mua qua Website hoặc Telegram Bot, cùng một ví." />
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card p-5">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-2 font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </div>
  );
}
