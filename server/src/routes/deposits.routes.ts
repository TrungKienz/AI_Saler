import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { createDeposit, listUserDeposits, attachTxHash } from "../services/deposit.service";

export const depositsRouter = Router();

const createSchema = z.object({
  method: z.enum(["VIETQR", "USDT"]),
  amountVnd: z.number().int().positive().optional(),
  amountUsdt: z.number().positive().optional(),
});

depositsRouter.post("/", requireAuth, async (req, res) => {
  try {
    const input = createSchema.parse(req.body);
    const result = await createDeposit(req.auth!.userId, input);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to create deposit" });
  }
});

depositsRouter.get("/", requireAuth, async (req, res) => {
  const deposits = await listUserDeposits(req.auth!.userId);
  res.json({ deposits });
});

depositsRouter.post("/:id/tx-hash", requireAuth, async (req, res) => {
  try {
    const txHash = z.string().min(4).parse(req.body.txHash);
    const deposit = await attachTxHash(req.auth!.userId, req.params.id, txHash);
    res.json({ deposit });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to attach tx hash" });
  }
});
