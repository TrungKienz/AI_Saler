import { Telegraf, session } from "telegraf";
import { env } from "./env";
import { registerHandlers, BotContext } from "./bot/handlers";

if (!env.telegramBotToken) {
  console.error("TELEGRAM_BOT_TOKEN is not set. Add it to server/.env before running the bot.");
  process.exit(1);
}

const bot = new Telegraf<BotContext>(env.telegramBotToken);
bot.use(session({ defaultSession: () => ({}) }));

registerHandlers(bot);

bot.catch((err) => {
  console.error("Telegram bot error:", err);
});

bot.launch().then(() => console.log("Telegram bot started"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
