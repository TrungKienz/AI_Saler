import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getBalance } from "../services/wallet.service";
import { getVndPerUsdRate } from "../services/rate.service";

export const walletRouter = Router();

walletRouter.get("/", requireAuth, async (req, res) => {
  const balanceVnd = await getBalance(req.auth!.userId);
  res.json({ balanceVnd });
});

walletRouter.get("/rate", async (_req, res) => {
  const vndPerUsd = await getVndPerUsdRate();
  res.json({ vndPerUsd });
});
