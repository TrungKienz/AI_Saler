import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable, ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
    >
      {copied ? "Đã copy" : "Copy"}
    </button>
  );
}

function OrderItemRow({ item, index }: { item: string; index: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-xs">
      <span className="w-5 shrink-0 text-right text-slate-500">{index + 1}.</span>
      <code className="min-w-0 flex-1 truncate text-slate-100" title={item}>
        {item}
      </code>
      <CopyButton text={item} />
    </div>
  );
}

export function OrderItemsList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-slate-500">{items.length} tài khoản</p>
      <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <OrderItemRow key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
