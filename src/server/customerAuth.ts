import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { customers, customerAddresses, customerWishlist, storeOrders, products, emailSettings } from "../db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { isValidCpf, isFullName, onlyDigits } from "../lib/cpf";
import { createNotification } from "./notifications";
import nodemailer from "nodemailer";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}
const SECRET = process.env.JWT_SECRET;
// Reaproveita o mesmo segredo do admin (evita depender de uma env var nova em cada ambiente),
// mas o payload carrega `kind: 'customer'` — um token de cliente nunca tem o formato que
// `authMiddleware.requireAuth`/`requirePermission` esperam (userId/roleId/roleName), então
// mesmo vazado ele não abre nada no admin. `requireCustomerAuth` abaixo faz a checagem inversa.
const CUSTOMER_TOKEN_TTL = "30d";
const RESET_TOKEN_TTL = "30m";

// Rate limit simples em memória por IP — mesmo padrão de src/server/store.ts (loja é pública).
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.resetAt) { hits.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}
const clientIp = (req: any) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();

export interface CustomerAuthRequest extends Request {
  customer?: { customerId: string };
}

export function requireCustomerAuth(req: CustomerAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Faça login para continuar." });
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET) as any;
    if (payload.kind !== "customer") return res.status(401).json({ error: "Sessão inválida." });
    req.customer = { customerId: payload.customerId };
    next();
  } catch {
    return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  }
}

function signCustomerToken(customerId: string) {
  return jwt.sign({ customerId, kind: "customer" }, SECRET, { expiresIn: CUSTOMER_TOKEN_TTL });
}

function publicCustomer(c: typeof customers.$inferSelect) {
  return { id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city };
}

async function findByCpf(cpf: string) {
  const [row] = await db.select().from(customers)
    .where(sql`regexp_replace(coalesce(${customers.document}, ''), '\\D', '', 'g') = ${cpf}`)
    .limit(1);
  return row || null;
}

async function findByEmail(email: string) {
  const [row] = await db.select().from(customers).where(sql`lower(${customers.email}) = ${email}`).limit(1);
  return row || null;
}

const router = Router();

router.post("/login", async (req, res) => {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const found = email ? await findByEmail(email) : null;
    if (!found || !found.passwordHash || !(await bcrypt.compare(password, found.passwordHash))) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }
    res.json({ token: signCustomerToken(found.id), customer: publicCustomer(found) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

// Cadastro por e-mail+senha. Se o documento informado já é de um cliente brasileiro que comprou
// como convidado antes dessa conta existir (sem senha), a conta nova assume esse cadastro em vez
// de duplicar — assim o histórico de pedidos antigos aparece em "Meus pedidos" sem passo extra.
// Documento é sempre exigido (sustenta a nota fiscal e a declaração do pagamento PIX no checkout),
// mas só CPF brasileiro tem validação por dígito verificador — CI paraguaia e passaporte não têm
// um algoritmo de checagem equivalente disponível aqui.
router.post("/register", async (req, res) => {
  try {
    if (!rateLimit(`account-write:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = onlyDigits(req.body?.phone);
    const country = ["BR", "AR", "PY", "OTHER"].includes(req.body?.country) ? req.body.country : "BR";
    const documentRaw = String(req.body?.document || "").trim();
    const document = country === "BR" ? onlyDigits(documentRaw) : documentRaw;
    const password = String(req.body?.password || "");
    const marketingOptIn = !!req.body?.marketingOptIn;
    const acceptedTerms = !!req.body?.acceptedTerms;

    if (!isFullName(name)) return res.status(400).json({ error: "Informe seu nome completo." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Informe um e-mail válido." });
    if (phone.length < 10) return res.status(400).json({ error: "Informe um telefone válido com DDD." });
    if (country === "BR" ? !isValidCpf(document) : document.length < 4) {
      return res.status(400).json({ error: "Documento inválido." });
    }
    if (password.length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    if (!acceptedTerms) return res.status(400).json({ error: "É preciso aceitar os termos de uso para continuar." });

    if (await findByEmail(email)) return res.status(409).json({ error: "Esse e-mail já tem conta. Faça login." });

    const passwordHash = await bcrypt.hash(password, 10);
    const nationality = country === "PY" ? "PY" : "FOREIGN";
    const documentType = country === "BR" ? "CPF" : country === "AR" ? "DNI" : country === "PY" ? "CI" : "PASSPORT";
    // Cadastro de convidado (pré-login) sempre foi feito com CPF — só faz sentido tentar
    // "adotar" um registro antigo quando o documento novo também é CPF brasileiro.
    const existingByCpf = country === "BR" ? await findByCpf(document) : null;

    if (existingByCpf) {
      if (existingByCpf.passwordHash) return res.status(409).json({ error: "Esse documento já está vinculado a outra conta." });
      // CPF sozinho não é segredo (circula em recibo/etiqueta) — exige o telefone já
      // cadastrado bater, senão qualquer um que soubesse o CPF sequestraria a conta.
      if (existingByCpf.phone && existingByCpf.phone !== phone) {
        return res.status(409).json({ error: "Esse documento já tem pedidos no sistema. Informe o telefone usado na última compra para vincular a conta, ou fale com o suporte." });
      }
      const [updated] = await db.update(customers).set({
        email, passwordHash, marketingOptIn,
        phone: existingByCpf.phone || phone,
        name: existingByCpf.name || name,
        updatedAt: new Date(),
      }).where(eq(customers.id, existingByCpf.id)).returning();
      return res.json({ token: signCustomerToken(updated.id), customer: publicCustomer(updated) });
    }

    const [created] = await db.insert(customers).values({
      name, type: "PERSON", nationality, documentType, document,
      phone, email, passwordHash, marketingOptIn,
      country: country === "BR" ? "Brasil" : country === "AR" ? "Argentina" : country === "PY" ? "Paraguai" : "Outro",
      observations: "Cadastrado pela loja online (Minha Conta).",
    }).returning();

    await createNotification(db, {
      type: "CUSTOMER_NEW", title: "Novo cliente cadastrado",
      message: `${name} criou uma conta na loja online.`, link: "/customers",
    });

    res.json({ token: signCustomerToken(created.id), customer: publicCustomer(created) });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Esse e-mail já tem conta. Faça login." });
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    if (!rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    const found = email ? await findByEmail(email) : null;
    // Resposta genérica sempre — não confirma nem nega se o e-mail existe.
    const genericOk = { ok: true, message: "Se esse e-mail tiver conta, enviamos um link de redefinição." };
    if (!found) return res.json(genericOk);

    const [conf] = await db.select().from(emailSettings).limit(1);
    if (!conf) return res.json(genericOk);

    const resetToken = jwt.sign({ customerId: found.id, kind: "password-reset" }, SECRET, { expiresIn: RESET_TOKEN_TTL });
    const origin = `${req.protocol}://${req.get("host")}`;
    const link = `${origin}/loja/conta/redefinir-senha?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: conf.host, port: conf.port, secure: conf.port === 465,
      auth: { user: conf.user, pass: conf.password },
      tls: conf.useTls ? { rejectUnauthorized: false } : undefined,
    });
    await transporter.sendMail({
      from: `"${conf.fromName}" <${conf.fromEmail}>`,
      to: found.email!,
      subject: "Redefinir sua senha",
      text: `Olá, ${found.name}.\n\nPra redefinir sua senha, acesse:\n${link}\n\nEsse link expira em 30 minutos. Se não foi você, ignore este e-mail.`,
    });
    res.json(genericOk);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    let payload: any;
    try {
      payload = jwt.verify(String(req.body?.token || ""), SECRET);
    } catch {
      return res.status(400).json({ error: "Link inválido ou expirado. Peça um novo." });
    }
    if (payload.kind !== "password-reset") return res.status(400).json({ error: "Link inválido." });

    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(customers).set({ passwordHash, updatedAt: new Date() }).where(eq(customers.id, payload.customerId));
    res.json({ token: signCustomerToken(payload.customerId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.get("/me", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const [c] = await db.select().from(customers).where(eq(customers.id, req.customer!.customerId)).limit(1);
  if (!c) return res.status(404).json({ error: "Conta não encontrada." });
  res.json(publicCustomer(c));
});

router.put("/me", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  try {
    const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
    const phone = onlyDigits(req.body?.phone);
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
    if (!isFullName(name)) return res.status(400).json({ error: "Informe seu nome completo." });
    if (phone.length < 10) return res.status(400).json({ error: "Informe um telefone válido com DDD." });
    if (email) {
      const other = await findByEmail(email);
      if (other && other.id !== req.customer!.customerId) {
        return res.status(409).json({ error: "Esse e-mail já está em uso por outra conta." });
      }
    }
    const [updated] = await db.update(customers).set({ name, phone, email, updatedAt: new Date() })
      .where(eq(customers.id, req.customer!.customerId)).returning();
    res.json(publicCustomer(updated));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Esse e-mail já está em uso por outra conta." });
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.post("/password", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    if (newPassword.length < 6) return res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
    const [c] = await db.select().from(customers).where(eq(customers.id, req.customer!.customerId)).limit(1);
    if (!c?.passwordHash || !(await bcrypt.compare(currentPassword, c.passwordHash))) {
      return res.status(401).json({ error: "Senha atual incorreta." });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(customers).set({ passwordHash, updatedAt: new Date() }).where(eq(customers.id, c.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.get("/orders", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const rows = await db.select({
    id: storeOrders.id, code: storeOrders.code, status: storeOrders.status,
    totalAmount: storeOrders.totalAmount, deliveryType: storeOrders.deliveryType,
    createdAt: storeOrders.createdAt,
  }).from(storeOrders)
    .where(eq(storeOrders.customerId, req.customer!.customerId))
    .orderBy(desc(storeOrders.createdAt));
  res.json(rows);
});

router.get("/addresses", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const rows = await db.select().from(customerAddresses)
    .where(eq(customerAddresses.customerId, req.customer!.customerId))
    .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));
  res.json(rows);
});

router.post("/addresses", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  try {
    const { label, cep, street, number, neighborhood, city, state, isDefault } = req.body || {};
    if (String(street || "").trim().length < 3) return res.status(400).json({ error: "Informe a rua." });
    const existing = await db.select({ id: customerAddresses.id }).from(customerAddresses)
      .where(eq(customerAddresses.customerId, req.customer!.customerId)).limit(1);
    // O primeiro endereço sempre nasce como padrão; evita um cadastro válido
    // sem endereço selecionável por padrão no checkout.
    const makeDefault = !!isDefault || existing.length === 0;
    if (makeDefault) {
      await db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.customerId, req.customer!.customerId));
    }
    const [created] = await db.insert(customerAddresses).values({
      customerId: req.customer!.customerId, label: label || "Endereço", cep, street, number, neighborhood, city, state,
      isDefault: makeDefault,
    }).returning();
    res.json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.put("/addresses/:id", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  try {
    const { label, cep, street, number, neighborhood, city, state, isDefault } = req.body || {};
    if (isDefault) {
      await db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.customerId, req.customer!.customerId));
    }
    const [updated] = await db.update(customerAddresses).set({ label, cep, street, number, neighborhood, city, state, isDefault: !!isDefault })
      .where(and(eq(customerAddresses.id, req.params.id), eq(customerAddresses.customerId, req.customer!.customerId)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Endereço não encontrado." });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.delete("/addresses/:id", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const [removed] = await db.delete(customerAddresses)
    .where(and(eq(customerAddresses.id, req.params.id), eq(customerAddresses.customerId, req.customer!.customerId)))
    .returning({ wasDefault: customerAddresses.isDefault });
  if (removed?.wasDefault) {
    const [replacement] = await db.select({ id: customerAddresses.id }).from(customerAddresses)
      .where(eq(customerAddresses.customerId, req.customer!.customerId)).orderBy(desc(customerAddresses.createdAt)).limit(1);
    if (replacement) await db.update(customerAddresses).set({ isDefault: true }).where(eq(customerAddresses.id, replacement.id));
  }
  res.json({ ok: true });
});

router.get("/wishlist", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  const rows = await db.select({
    id: customerWishlist.id, productId: products.id, name: products.name,
    imageUrl: products.imageUrl, salePriceA: products.salePriceA, isActive: products.isActive,
    storeVisible: products.storeVisible, createdAt: customerWishlist.createdAt,
  }).from(customerWishlist)
    .innerJoin(products, eq(customerWishlist.productId, products.id))
    .where(eq(customerWishlist.customerId, req.customer!.customerId))
    .orderBy(desc(customerWishlist.createdAt));
  res.json(rows);
});

router.post("/wishlist", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  try {
    const productId = String(req.body?.productId || "");
    if (!productId) return res.status(400).json({ error: "Produto inválido." });
    await db.insert(customerWishlist).values({ customerId: req.customer!.customerId, productId })
      .onConflictDoNothing();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});

router.delete("/wishlist/:productId", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  await db.delete(customerWishlist).where(and(
    eq(customerWishlist.customerId, req.customer!.customerId),
    eq(customerWishlist.productId, req.params.productId),
  ));
  res.json({ ok: true });
});

export default router;
