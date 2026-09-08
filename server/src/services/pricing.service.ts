import { MarginType } from "@prisma/client";
import { getConfig } from "./config.service";
import { getVndPerUsdRate } from "./rate.service";

export interface Priceable {
  basePriceVnd: number;
  marginOverride: { type: MarginType; value: number } | null;
}

// Computes the customer-facing sell price in VND from the source's base price,
// applying either a per-product override (percent, or a fixed USD markup
// converted at the current rate) or the global percent margin as a fallback.
export async function computeSellPriceVnd(product: Priceable): Promise<number> {
  const config = await getConfig();

  if (product.marginOverride) {
    if (product.marginOverride.type === MarginType.PERCENT) {
      return roundVnd(product.basePriceVnd * (1 + product.marginOverride.value / 100));
    }
    const rate = await getVndPerUsdRate();
    return roundVnd(product.basePriceVnd + product.marginOverride.value * rate);
  }

  return roundVnd(product.basePriceVnd * (1 + config.globalMarginPercent / 100));
}

function roundVnd(amount: number): number {
  return Math.round(amount);
}
