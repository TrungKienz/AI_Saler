import { Router } from "express";
import { z } from "zod";
import { getConfig } from "../services/config.service";
import { processIncomingBankTransaction } from "../services/deposit.service";

export const webhooksRouter = Router();

// SePay (sepay.vn) calls this for every transaction on the connected bank
// account. Configure this exact URL as the webhook in the SePay dashboard,
// and set the same secret there as Config.sepayWebhookApiKey (admin Settings
// page) so we can verify the call actually came from SePay.
// Docs: https://docs.sepay.vn (Webhooks / Integrate with your own system)
const sepayPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
  gateway: z.string().optional(),
  accountNumber: z.string().optional(),
  content: z.string().default(""),
  transferType: z.enum(["in", "out"]).optional(),
  transferAmount: z.number(),
  referenceCode: z.string().optional().nullable(),
});

webhooksRouter.post("/sepay", async (req, res) => {
  const config = await getConfig();
  if (config.sepayWebhookApiKey) {
    const header = req.headers.authorization ?? "";
    const provided = header.replace(/^Apikey\s+/i, "").trim();
    if (provided !== config.sepayWebhookApiKey) {
      return res.status(401).json({ success: false, error: "Invalid webhook API key" });
    }
  }

  const parsed = sepayPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Invalid payload" });
  }
  const payload = parsed.data;

  // Only money coming IN can pay a deposit; ignore outgoing transactions.
  if (payload.transferType === "out") {
    return res.json({ success: true, ignored: true });
  }

  try {
    const result = await processIncomingBankTransaction({
      provider: "sepay",
      externalId: String(payload.id),
      gateway: payload.gateway,
      accountNumber: payload.accountNumber,
      transferAmount: Math.round(payload.transferAmount),
      content: payload.content,
      referenceCode: payload.referenceCode ?? undefined,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    // Still 200 so SePay doesn't hammer us with retries for a bug on our side
    // that a retry won't fix; the failure is visible in server logs either way.
    console.error("SePay webhook processing error:", err);
    res.status(200).json({ success: false, error: err.message ?? "Processing error" });
  }
});
