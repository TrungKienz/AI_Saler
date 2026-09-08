import { prisma } from "../prisma";
import { sourceApi } from "../lib/sourceApi";
import { getSourceApiKey } from "./config.service";
import { computeSellPriceVnd } from "./pricing.service";

const STALE_MS = 2 * 60 * 1000; // refresh cache if older than 2 minutes

function extractPriceVnd(raw: Record<string, unknown>): number {
  const candidates = [raw.price, raw.price_vnd, raw.priceVnd, raw.amount];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return 0;
}

function extractStock(raw: Record<string, unknown>): number {
  const candidates = [raw.stock, raw.quantity, raw.available];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }
  return 0;
}

export async function refreshProductCache(): Promise<number> {
  const apiKey = await getSourceApiKey();
  const products = await sourceApi.getProducts(apiKey);

  for (const p of products) {
    const raw = p as unknown as Record<string, unknown>;
    const sourceProductId = Number(raw.id);
    if (!Number.isFinite(sourceProductId)) continue;

    await prisma.productCache.upsert({
      where: { sourceProductId },
      create: {
        sourceProductId,
        name: String(raw.name ?? `Product #${sourceProductId}`),
        basePriceVnd: extractPriceVnd(raw),
        stock: extractStock(raw),
        isActive: true,
        raw: raw as any,
      },
      update: {
        name: String(raw.name ?? `Product #${sourceProductId}`),
        basePriceVnd: extractPriceVnd(raw),
        stock: extractStock(raw),
        raw: raw as any,
      },
    });
  }

  return products.length;
}

async function ensureFreshCache() {
  const newest = await prisma.productCache.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!newest || Date.now() - newest.updatedAt.getTime() > STALE_MS) {
    try {
      await refreshProductCache();
    } catch {
      // Serve whatever is cached if the source is temporarily unreachable.
    }
  }
}

export async function listProductsForSale() {
  await ensureFreshCache();
  const products = await prisma.productCache.findMany({
    where: { isActive: true },
    include: { marginOverride: true },
    orderBy: { name: "asc" },
  });

  const withPricing = await Promise.all(
    products.map(async (p) => ({
      id: p.id,
      sourceProductId: p.sourceProductId,
      name: p.name,
      priceVnd: await computeSellPriceVnd(p),
      inStock: p.stock > 0,
      stock: p.stock,
      isHot: p.isHot,
    }))
  );

  // Hot-tagged products pinned to the top, then in-stock before out-of-stock;
  // stable sort keeps the underlying name-asc order within each group.
  return withPricing.sort(
    (a, b) => Number(b.isHot) - Number(a.isHot) || Number(b.inStock) - Number(a.inStock)
  );
}

export async function getSellableProductById(productCacheId: string) {
  const product = await prisma.productCache.findUnique({
    where: { id: productCacheId },
    include: { marginOverride: true },
  });
  if (!product || !product.isActive) return null;
  const priceVnd = await computeSellPriceVnd(product);
  return { product, priceVnd };
}
