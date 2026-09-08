import { OrderStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { getSellableProductById } from "./product.service";
import { debitWalletIfSufficient, creditWallet } from "./wallet.service";
import { sourceApi } from "../lib/sourceApi";
import { getSourceApiKey } from "./config.service";

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient wallet balance");
  }
}

export async function buyProduct(userId: string, productCacheId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("Quantity must be an integer between 1 and 100");
  }

  const sellable = await getSellableProductById(productCacheId);
  if (!sellable) throw new Error("Product not found or unavailable");
  const { product, priceVnd } = sellable;
  if (product.stock < quantity) throw new Error("Not enough stock");

  const totalVnd = priceVnd * quantity;

  const debited = await debitWalletIfSufficient(userId, totalVnd);
  if (!debited) throw new InsufficientBalanceError();

  const order = await prisma.order.create({
    data: {
      userId,
      productCacheId: product.id,
      productName: product.name,
      quantity,
      unitPriceVnd: priceVnd,
      totalPriceVnd: totalVnd,
      status: OrderStatus.PENDING,
    },
  });

  try {
    const apiKey = await getSourceApiKey();
    const result = await sourceApi.buy(apiKey, product.sourceProductId, quantity, "vnd");
    const sourceOrderId =
      (result?.order?.id ?? result?.id ?? result?.order_id ?? "")?.toString() || undefined;

    return prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.COMPLETED, sourceOrderId },
    });
  } catch (err: any) {
    // Fulfilment at the source failed after we already charged the customer's
    // internal wallet: refund immediately and record why.
    await creditWallet(userId, totalVnd);
    const failReason = err?.response?.data?.message || err?.message || "Unknown error from source";
    return prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FAILED, failReason },
    });
  }
}

export async function listUserOrders(userId: string) {
  return prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}
