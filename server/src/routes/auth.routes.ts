import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { register, login, linkAccountWithCode } from "../services/auth.service";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(60).optional(),
});

authRouter.post("/register", async (req, res) => {
  try {
    const input = registerSchema.parse(req.body);
    const { user, token } = await register(input.email, input.password, input.displayName);
    res.json({ token, user: toPublicUser(user) });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Registration failed" });
  }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post("/login", async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const { user, token } = await login(input.email, input.password);
    res.json({ token, user: toPublicUser(user) });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Login failed" });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/link", requireAuth, async (req, res) => {
  try {
    const code = z.string().length(6).parse(req.body.code);
    const user = await linkAccountWithCode(req.auth!.userId, code);
    res.json({ user: toPublicUser(user) });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Linking failed" });
  }
});

function toPublicUser(user: {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  balanceVnd: number;
  telegramUsername: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    balanceVnd: user.balanceVnd,
    telegramUsername: user.telegramUsername,
  };
}
