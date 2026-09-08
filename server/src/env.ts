import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",

  sourceBaseUrl: process.env.SOURCE_BASE_URL ?? "https://tunvnmmo.duckdns.org",
  sourceApiKey: process.env.SOURCE_API_KEY ?? "",

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",

  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
};
