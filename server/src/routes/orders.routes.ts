import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { buyProduct, listUserOrders, InsufficientBalanceError } from "../services/order.service";

export const ordersRouter = Router();

const buySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100).default(1),
});

ordersRouter.post("/", requireAuth, async (req, res) => {
  try {
    const input = buySchema.parse(req.body);
    const order = await buyProduct(req.auth!.userId, input.productId, input.quantity);
    res.json({ order });
  } catch (err: any) {
    if (err instanceof InsufficientBalanceError) {
      return res.status(402).json({ error: err.message });
    }
    res.status(400).json({ error: err.message ?? "Purchase failed" });
  }
});

ordersRouter.get("/", requireAuth, async (req, res) => {
  const orders = await listUserOrders(req.auth!.userId);
  res.json({ orders });
});
