import axios from "axios";
import { env } from "../env";

// Sends a plain Telegram message via the raw Bot API, independent of the
// Telegraf bot process, so the web/API server can notify users too
// (e.g. when an admin confirms a deposit made through the website).
export async function notifyTelegram(telegramId: string | null | undefined, text: string) {
  if (!telegramId || !env.telegramBotToken) return;
  try {
    await axios.post(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
      chat_id: telegramId,
      text,
      parse_mode: "HTML",
    });
  } catch {
    // Notifications are best-effort; never let a failed push break the request.
  }
}
