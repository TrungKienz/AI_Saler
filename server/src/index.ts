import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { env } from "./env";
import { prisma } from "./prisma";
import { authRouter } from "./routes/auth.routes";
import { productsRouter } from "./routes/products.routes";
import { walletRouter } from "./routes/wallet.routes";
import { depositsRouter } from "./routes/deposits.routes";
import { ordersRouter } from "./routes/orders.routes";
import { adminRouter } from "./routes/admin.routes";
import { webhooksRouter } from "./routes/webhooks.routes";

async function seedAdmin() {
  if (!env.adminEmail || !env.adminPassword) return;
  const existing = await prisma.user.findUnique({ where: { email: env.adminEmail } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await prisma.user.create({
    data: { email: env.adminEmail, passwordHash, displayName: "Admin", role: "ADMIN" },
  });
  console.log(`Seeded admin account: ${env.adminEmail}`);
}

async function main() {
  await seedAdmin();

  const app = express();
  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/wallet", walletRouter);
  app.use("/api/deposits", depositsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/webhooks", webhooksRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(env.port, () => {
    console.log(`API server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
