import { sourceApi } from "../lib/sourceApi";

let cachedRate: number | null = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

// The source /api/rate response shape isn't fully documented, so we defensively
// look for a handful of likely field names for "VND per 1 USD".
function extractVndPerUsd(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const candidates = [d.rate, d.usd_vnd, d.vnd_per_usd, d.usdt_vnd, d.price, d.vnd];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 1000) return n; // VND/USD rates are always > 1000
  }
  return null;
}

export async function getVndPerUsdRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && now - cachedAt < CACHE_MS) {
    return cachedRate;
  }
  try {
    const data = await sourceApi.getRate();
    const rate = extractVndPerUsd(data);
    if (rate) {
      cachedRate = rate;
      cachedAt = now;
      return rate;
    }
  } catch {
    // fall through to stale/default below
  }
  // Fallback: reuse the last known good rate, or a sane default so the store
  // never fully breaks if the source rate endpoint is briefly unavailable.
  return cachedRate ?? 25000;
}
