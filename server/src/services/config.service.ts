import { prisma } from "../prisma";
import { env } from "../env";

export async function getConfig() {
  let config = await prisma.config.findUnique({ where: { id: 1 } });
  if (!config) {
    config = await prisma.config.create({ data: { id: 1 } });
  }
  return config;
}

export async function updateConfig(data: Partial<{
  globalMarginPercent: number;
  bankId: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  usdtAddress: string | null;
  usdtNetwork: string | null;
  sourceApiKeyOverride: string | null;
  sepayWebhookApiKey: string | null;
}>) {
  await getConfig(); // ensure row exists
  return prisma.config.update({ where: { id: 1 }, data });
}

export async function getSourceApiKey(): Promise<string> {
  const config = await getConfig();
  return config.sourceApiKeyOverride || env.sourceApiKey;
}
