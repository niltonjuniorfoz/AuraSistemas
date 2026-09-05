import { Router } from "express";
import nodemailer from "nodemailer";
import { db } from "../db";
import { emailSettings } from "../db/schema";
import { SYSTEM_BRAND } from "../lib/branding";

const router = Router();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 4;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clean(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function clientKey(req: any) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0]?.trim();
  return forwarded || String(req.ip || req.socket?.remoteAddress || "anonymous");
}

function consumeAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

function isConfigured(conf: any) {
  const host = String(conf?.host || "").trim();
  const user = String(conf?.user || "").trim();
  const password = String(conf?.password || "").trim();
  const fromEmail = String(conf?.fromEmail || "").trim();
  return !!host
    && !!user
    && !!password
    && !!fromEmail
    && !host.includes("example.com")
    && !user.includes("example.com")
    && !fromEmail.includes("example.com");
}

router.post("/", async (req, res) => {
  try {
    const key = clientKey(req);
    if (!consumeAttempt(key)) {
      return res.status(429).json({ error: "Muitas solicitações em pouco tempo. Aguarde alguns minutos ou use o WhatsApp do suporte." });
    }

    const name = clean(req.body?.name, 100);
    const contact = clean(req.body?.contact, 160);
    const message = clean(req.body?.message, 2500);

    if (message.length < 5) {
      return res.status(400).json({ error: "Descreva o problema para enviar o chamado." });
    }

    const [conf] = await db.select().from(emailSettings).limit(1);
    if (!isConfigured(conf)) {
      return res.status(503).json({
        error: "O envio por e-mail ainda não está configurado neste ambiente. Use o WhatsApp do suporte.",
        whatsapp: SYSTEM_BRAND.supportWhatsApp,
      });
    }

    const transporter = nodemailer.createTransport({
      host: conf.host,
      port: Number(conf.port || 587),
      secure: Number(conf.port) === 465,
      auth: {
        user: conf.user,
        pass: conf.password,
      },
      tls: conf.useTls ? { rejectUnauthorized: false } : undefined,
    });

    const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? contact : undefined;
    const body = [
      `Novo chamado de suporte - ${SYSTEM_BRAND.name}`,
      "",
      `Nome: ${name || "Não informado"}`,
      `Contato: ${contact || "Não informado"}`,
      "",
      "Mensagem:",
      message,
      "",
      `Referência técnica: ${SYSTEM_BRAND.platformId}`,
      `Data: ${new Date().toISOString()}`,
      `Origem: ${clean(req.headers?.["user-agent"], 300) || "Não informada"}`,
    ].join("\n");

    await transporter.sendMail({
      from: `"${conf.fromName || SYSTEM_BRAND.name}" <${conf.fromEmail}>`,
      to: SYSTEM_BRAND.supportEmail,
      replyTo,
      subject: `${SYSTEM_BRAND.name} | Suporte de acesso | ${SYSTEM_BRAND.platformId}`,
      text: body,
    });

    return res.json({ success: true, message: "Chamado enviado com sucesso." });
  } catch (error: any) {
    console.error("Erro ao enviar chamado de suporte:", error);
    return res.status(500).json({ error: "Não foi possível enviar o chamado agora. Tente pelo WhatsApp do suporte." });
  }
});

export default router;
