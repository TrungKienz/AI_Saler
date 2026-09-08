import { Router } from "express";
import { z } from "zod";
import { DepositStatus, MarginType } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
  adminListDeposits,
  adminConfirmDeposit,
  adminRejectDeposit,
  adminListBankTransactions,
  adminMatchBankTransaction,
} from "../services/deposit.service";
import { getConfig, updateConfig, getSourceApiKey } from "../services/config.service";
import { refreshProductCache } from "../services/product.service";
import { computeSellPriceVnd } from "../services/pricing.service";
import { sourceApi } from "../lib/sourceApi";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// --- Deposits ---
adminRouter.get("/deposits", async (req, res) => {
  const status = req.query.status as DepositStatus | undefined;
  const deposits = await adminListDeposits(status);
  res.json({ deposits });
});

adminRouter.post("/deposits/:id/confirm", async (req, res) => {
  try {
    const confirmedVnd = req.body.confirmedVnd ? Number(req.body.confirmedVnd) : undefined;
    const result = await adminConfirmDeposit(req.params.id, confirmedVnd);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to confirm deposit" });
  }
});

adminRouter.post("/deposits/:id/reject", async (req, res) => {
  try {
    const deposit = await adminRejectDeposit(req.params.id, req.body.note);
    res.json({ deposit });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to reject deposit" });
  }
});

// --- Bank transactions (SePay webhook audit log) ---
adminRouter.get("/bank-transactions", async (_req, res) => {
  const transactions = await adminListBankTransactions();
  res.json({ transactions });
});

adminRouter.post("/bank-transactions/:id/match", async (req, res) => {
  try {
    const depositId = z.string().min(1).parse(req.body.depositId);
    const result = await adminMatchBankTransaction(req.params.id, depositId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to match transaction" });
  }
});

// --- Config ---
adminRouter.get("/config", async (_req, res) => {
  res.json({ config: await getConfig() });
});

const configSchema = z.object({
  globalMarginPercent: z.number().min(0).max(1000).optional(),
  bankId: z.string().nullable().optional(),
  bankAccountNo: z.string().nullable().optional(),
  bankAccountName: z.string().nullable().optional(),
  usdtAddress: z.string().nullable().optional(),
  usdtNetwork: z.string().nullable().optional(),
  sourceApiKeyOverride: z.string().nullable().optional(),
  sepayWebhookApiKey: z.string().nullable().optional(),
});

adminRouter.put("/config", async (req, res) => {
  try {
    const input = configSchema.parse(req.body);
    const config = await updateConfig(input);
    res.json({ config });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to update config" });
  }
});

// --- Products & margin ---
adminRouter.get("/products", async (_req, res) => {
  const products = await prisma.productCache.findMany({
    include: { marginOverride: true },
    orderBy: { name: "asc" },
  });
  const withPrice = await Promise.all(
    products.map(async (p) => ({ ...p, sellPriceVnd: await computeSellPriceVnd(p) }))
  );
  res.json({ products: withPrice });
});

adminRouter.post("/products/refresh", async (_req, res) => {
  try {
    const count = await refreshProductCache();
    res.json({ refreshed: count });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Failed to refresh from source" });
  }
});

const marginSchema = z.object({
  type: z.nativeEnum(MarginType),
  value: z.number(),
});

adminRouter.put("/products/:id/margin", async (req, res) => {
  try {
    const input = marginSchema.parse(req.body);
    const margin = await prisma.productMargin.upsert({
      where: { productCacheId: req.params.id },
      create: { productCacheId: req.params.id, ...input },
      update: input,
    });
    res.json({ margin });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to set margin" });
  }
});

adminRouter.delete("/products/:id/margin", async (req, res) => {
  await prisma.productMargin.deleteMany({ where: { productCacheId: req.params.id } });
  res.json({ ok: true });
});

adminRouter.put("/products/:id/active", async (req, res) => {
  const isActive = z.boolean().parse(req.body.isActive);
  const product = await prisma.productCache.update({ where: { id: req.params.id }, data: { isActive } });
  res.json({ product });
});

// --- Users ---
adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      telegramUsername: true,
      role: true,
      balanceVnd: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});

// --- Source wallet status (so the admin knows when to top up) ---
adminRouter.get("/source-balance", async (_req, res) => {
  try {
    const apiKey = await getSourceApiKey();
    const balance = await sourceApi.getBalance(apiKey);
    res.json({ balance });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Failed to reach source API" });
  }
});
