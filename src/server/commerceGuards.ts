import { Router } from "express";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  customers,
  payments,
  productSerials,
  products,
  saleItemLots,
  saleItems,
  saleReturns,
  sales,
  storeCoupons,
  storeOrders,
  storePageviews,
  systemSettings,
  users,
} from "../db/schema";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { CustomerAuthRequest, requireCustomerAuth } from "./customerAuth";
import { logAction } from "./audit";

const COUPON_POLICIES_KEY = "store_coupon_policies";
const VISIT_WINDOW_MS = 4 * 60 * 60 * 1000;

type CouponPolicy = {
  firstPurchaseOnly?: boolean;
  perCustomerLimit?: number | null;
};
type CouponPolicyMap = Record<string, CouponPolicy>;

function privileged(roleName?: string | null) {
  return ["master", "admin", "administrador", "administrator", "super admin", "super_admin"]
    .includes(String(roleName || "").trim().toLowerCase());
}

async function readCouponPolicies(): Promise<CouponPolicyMap> {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, COUPON_POLICIES_KEY)).limit(1);
  const value = row?.value;
  return value && typeof value === "object" && !Array.isArray(value) ? value as CouponPolicyMap : {};
}

async function writeCouponPolicies(value: CouponPolicyMap) {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, COUPON_POLICIES_KEY)).limit(1);
  if (row) {
    await db.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.key, COUPON_POLICIES_KEY));
  } else {
    await db.insert(systemSettings).values({ key: COUPON_POLICIES_KEY, value });
  }
}

function couponBody(body: any) {
  const code = String(body?.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new Error("Use um código de 3 a 30 caracteres, sem espaços.");
  const type = body?.type === "FIXED" ? "FIXED" : "PERCENT";
  const value = Number(body?.value);
  if (!(value > 0)) throw new Error("Informe um desconto maior que zero.");
  if (type === "PERCENT" && value > 100) throw new Error("O desconto percentual não pode passar de 100%.");
  const minOrder = body?.minOrderBrl === "" || body?.minOrderBrl == null ? null : Number(body.minOrderBrl);
  const maxUses = body?.maxUses === "" || body?.maxUses == null ? null : Math.max(1, Math.floor(Number(body.maxUses)));
  return {
    coupon: {
      code,
      type,
      value: String(value),
      minOrderBrl: minOrder != null && Number.isFinite(minOrder) ? String(Math.max(0, minOrder)) : null,
      maxUses: maxUses != null && Number.isFinite(maxUses) ? maxUses : null,
      validFrom: body?.validFrom ? new Date(String(body.validFrom)) : null,
      validUntil: body?.validUntil ? new Date(`${String(body.validUntil).slice(0, 10)}T23:59:59.999Z`) : null,
      isActive: body?.isActive !== false,
    },
    policy: {
      firstPurchaseOnly: !!body?.firstPurchaseOnly,
      perCustomerLimit: body?.perCustomerLimit === "" || body?.perCustomerLimit == null
        ? null
        : Math.max(1, Math.floor(Number(body.perCustomerLimit) || 1)),
    } satisfies CouponPolicy,
  };
}

async function ensureFirstPurchaseCoupon() {
  const code = "PRIMEIRA5OFF";
  const [existing] = await db.select().from(storeCoupons).where(eq(storeCoupons.code, code)).limit(1);
  if (!existing) {
    await db.insert(storeCoupons).values({
      code,
      type: "PERCENT",
      value: "5",
      minOrderBrl: null,
      maxUses: null,
      isActive: true,
    });
  }
  const policies = await readCouponPolicies();
  if (!policies[code]) {
    policies[code] = { firstPurchaseOnly: true, perCustomerLimit: 1 };
    await writeCouponPolicies(policies);
  }
}

// Guardas operacionais: venda não paga não segue fisicamente sem uma decisão
// explícita de Admin/Master. O front recebe 409 e oferece Continuar/Cancelar.
export const operationsGuardRouter = Router();
operationsGuardRouter.patch("/sales/:id/fulfillment", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const requested = String(req.body?.fulfillmentStatus || "").toUpperCase();
    if (!["DELIVERING", "DELIVERED"].includes(requested)) return next();
    const [sale] = await db.select({ paymentStatus: sales.paymentStatus }).from(sales).where(eq(sales.id, req.params.id)).limit(1);
    if (!sale || sale.paymentStatus === "PAID") return next();
    if (!privileged(req.user?.roleName)) {
      return res.status(409).json({ code: "UNPAID_BLOCKED", error: "Esta venda ainda não está paga. Somente Admin ou Master pode liberar a entrega." });
    }
    if (req.body?.allowUnpaid === true) return next();
    return res.status(409).json({ code: "UNPAID_CONFIRM_REQUIRED", error: "Esta venda ainda não está paga. Deseja continuar mesmo assim?" });
  } catch (error) { next(error); }
});

operationsGuardRouter.post("/separation/sales/:saleId/start", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const [sale] = await db.select({ paymentStatus: sales.paymentStatus }).from(sales).where(eq(sales.id, req.params.saleId)).limit(1);
    if (!sale || sale.paymentStatus === "PAID") return next();
    if (!privileged(req.user?.roleName)) {
      return res.status(409).json({ code: "UNPAID_BLOCKED", error: "Esta venda ainda não está paga. Somente Admin ou Master pode iniciar a separação." });
    }
    if (req.body?.allowUnpaid === true) return next();
    return res.status(409).json({ code: "UNPAID_CONFIRM_REQUIRED", error: "Esta venda ainda não está paga. Deseja iniciar a separação mesmo assim?" });
  } catch (error) { next(error); }
});

// Detalhe defensivo de Vendas Realizadas. Consultas auxiliares opcionais não
// derrubam a página inteira caso um dado antigo esteja incompleto.
operationsGuardRouter.get("/sales/:id", requireAuth, requirePermission("sales", "view"), async (req: AuthRequest, res, next) => {
  try {
    const saleId = req.params.id;
    const [sale] = await db.select({
      id: sales.id, series: sales.series, number: sales.number,
      orderStatus: sales.orderStatus, paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus, deliveryScheduledAt: sales.deliveryScheduledAt,
      deliveryNotes: sales.deliveryNotes, observations: sales.observations, lotStatus: sales.lotStatus,
      totalAmount: sales.totalAmount, subtotalAmount: sales.subtotalAmount, discountAmount: sales.discountAmount,
      ivaAmount: sales.ivaAmount, priceTable: sales.priceTable, currency: sales.currency, createdAt: sales.createdAt,
      customerName: customers.name, customerDocument: customers.document, customerPhone: customers.phone,
      userName: users.name,
    }).from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.userId, users.id))
      .where(eq(sales.id, saleId)).limit(1);
    if (!sale) return next();

    const items = await db.select({
      id: saleItems.id, quantity: saleItems.quantity, unitPrice: saleItems.unitPrice,
      totalPrice: saleItems.totalPrice, ivaAmount: saleItems.ivaAmount, discountAmount: saleItems.discountAmount,
      productName: products.name, productSku: products.sku, productId: products.id,
      hasSerialNumber: products.hasSerialNumber, requiresLot: products.requiresLot,
    }).from(saleItems).leftJoin(products, eq(saleItems.productId, products.id)).where(eq(saleItems.saleId, saleId));

    const itemIds = items.map((item) => item.id);
    const [serials, lots, paymentActor, returnInfo] = await Promise.all([
      itemIds.length ? db.select({ saleItemId: productSerials.saleItemId, serialNumber: productSerials.serialNumber }).from(productSerials).where(inArray(productSerials.saleItemId, itemIds)).catch(() => []) : Promise.resolve([]),
      itemIds.length ? db.select({ saleItemId: saleItemLots.saleItemId, lotNumber: saleItemLots.lotNumber, quantity: saleItemLots.quantity }).from(saleItemLots).where(inArray(saleItemLots.saleItemId, itemIds)).catch(() => []) : Promise.resolve([]),
      db.select({ userName: users.name, createdAt: payments.createdAt }).from(payments).leftJoin(users, eq(payments.receivedBy, users.id)).where(and(eq(payments.saleId, saleId), eq(payments.status, "COMPLETED"))).orderBy(desc(payments.createdAt)).limit(1).catch(() => []),
      db.select({ id: saleReturns.id, notes: saleReturns.notes, totalAmountUsd: saleReturns.totalAmountUsd, createdAt: saleReturns.createdAt, returnedByName: users.name }).from(saleReturns).leftJoin(users, eq(saleReturns.returnedBy, users.id)).where(eq(saleReturns.saleId, saleId)).orderBy(desc(saleReturns.createdAt)).limit(1).catch(() => []),
    ]);

    res.json({
      ...sale,
      items: items.map((item) => ({
        ...item,
        serials: serials.filter((row: any) => row.saleItemId === item.id).map((row: any) => row.serialNumber),
        lots: lots.filter((row: any) => row.saleItemId === item.id).map((row: any) => ({ lotNumber: row.lotNumber, quantity: row.quantity })),
      })),
      actors: {
        order: { userName: sale.userName, at: sale.createdAt },
        payment: (paymentActor as any[])[0] ? { userName: (paymentActor as any[])[0].userName, at: (paymentActor as any[])[0].createdAt } : null,
        separation: null,
        delivery: null,
      },
      returnInfo: (returnInfo as any[])[0] || null,
    });
  } catch (error) { next(error); }
});

// Visita = um dispositivo por janela de 4h. Refresh e navegação interna não
// geram outra visualização; depois da janela, o mesmo aparelho conta novamente.
export const publicStoreGuardRouter = Router();
publicStoreGuardRouter.post("/pageview", async (req, res, next) => {
  try {
    const visitorId = String(req.body?.visitorId || "").trim().slice(0, 64);
    if (!visitorId) return next();
    const since = new Date(Date.now() - VISIT_WINDOW_MS);
    const [recent] = await db.select({ id: storePageviews.id }).from(storePageviews)
      .where(and(eq(storePageviews.visitorId, visitorId), gte(storePageviews.createdAt, since)))
      .orderBy(desc(storePageviews.createdAt)).limit(1);
    if (recent) return res.status(204).end();
    next();
  } catch { next(); }
});

// O cupom padrão precisa existir mesmo que o lojista nunca tenha aberto a tela
// administrativa antes de o primeiro cliente tentar usá-lo.
publicStoreGuardRouter.post("/coupon/preview", async (req, _res, next) => {
  try {
    if (String(req.body?.code || "").trim().toUpperCase() === "PRIMEIRA5OFF") await ensureFirstPurchaseCoupon();
  } catch {}
  next();
});

// Regras por cliente só exigem login quando o cupom realmente usa uma regra
// por cliente. Cupons genéricos continuam funcionando para checkout convidado.
publicStoreGuardRouter.post("/orders", async (req, res, next) => {
  try {
    const code = String(req.body?.couponCode || "").trim().toUpperCase();
    if (!code) return next();
    const policy = (await readCouponPolicies())[code];
    if (!policy?.firstPurchaseOnly && !policy?.perCustomerLimit) return next();

    return requireCustomerAuth(req as CustomerAuthRequest, res, async () => {
      try {
        const customerId = (req as CustomerAuthRequest).customer?.customerId;
        if (!customerId) return res.status(401).json({ error: "Faça login para usar este cupom." });

        if (policy.firstPurchaseOnly) {
          const [previous] = await db.select({ count: sql<number>`count(*)` }).from(storeOrders)
            .where(and(eq(storeOrders.customerId, customerId), sql`${storeOrders.status} not in ('CANCELED','CANCELLED')`));
          if (Number(previous?.count || 0) > 0) {
            return res.status(400).json({ error: "Este cupom é exclusivo para a primeira compra." });
          }
        }

        if (policy.perCustomerLimit) {
          const [used] = await db.select({ count: sql<number>`count(*)` }).from(storeOrders)
            .where(and(eq(storeOrders.customerId, customerId), eq(storeOrders.couponCode, code), sql`${storeOrders.status} not in ('CANCELED','CANCELLED')`));
          if (Number(used?.count || 0) >= Number(policy.perCustomerLimit)) {
            return res.status(400).json({ error: `Este cupom pode ser usado no máximo ${policy.perCustomerLimit}x por cliente.` });
          }
        }
        next();
      } catch (error) { next(error); }
    });
  } catch (error) { next(error); }
});

export const storeCouponsAdminRouter = Router();
storeCouponsAdminRouter.use(requireAuth);
storeCouponsAdminRouter.use(requirePermission("settings", "manage"));

storeCouponsAdminRouter.get("/", async (_req: AuthRequest, res) => {
  try {
    await ensureFirstPurchaseCoupon();
    const [rows, policies] = await Promise.all([
      db.select().from(storeCoupons).orderBy(desc(storeCoupons.createdAt)),
      readCouponPolicies(),
    ]);
    res.json({ data: rows.map((row) => ({ ...row, ...(policies[row.code] || {}) })) });
  } catch (error: any) { res.status(500).json({ error: error.message || "Erro ao carregar cupons." }); }
});

storeCouponsAdminRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const parsed = couponBody(req.body);
    const [created] = await db.insert(storeCoupons).values(parsed.coupon).returning();
    const policies = await readCouponPolicies();
    policies[parsed.coupon.code] = parsed.policy;
    await writeCouponPolicies(policies);
    await logAction(req.user!.userId, "STORE_COUPON_CREATE", "store_coupons", created.id, null, { code: created.code, ...parsed.policy });
    res.json({ data: { ...created, ...parsed.policy } });
  } catch (error: any) {
    const msg = String(error?.message || "Erro ao criar cupom.");
    const duplicate = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate");
    res.status(duplicate ? 409 : 400).json({ error: duplicate ? "Já existe um cupom com esse código." : msg });
  }
});

storeCouponsAdminRouter.put("/:id", async (req: AuthRequest, res) => {
  try {
    const parsed = couponBody(req.body);
    const [before] = await db.select().from(storeCoupons).where(eq(storeCoupons.id, req.params.id)).limit(1);
    if (!before) return res.status(404).json({ error: "Cupom não encontrado." });
    const [updated] = await db.update(storeCoupons).set({ ...parsed.coupon, updatedAt: new Date() }).where(eq(storeCoupons.id, req.params.id)).returning();
    const policies = await readCouponPolicies();
    if (before.code !== parsed.coupon.code) delete policies[before.code];
    policies[parsed.coupon.code] = parsed.policy;
    await writeCouponPolicies(policies);
    await logAction(req.user!.userId, "STORE_COUPON_UPDATE", "store_coupons", updated.id, before, { ...updated, ...parsed.policy });
    res.json({ data: { ...updated, ...parsed.policy } });
  } catch (error: any) { res.status(400).json({ error: error.message || "Erro ao salvar cupom." }); }
});

storeCouponsAdminRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const [updated] = await db.update(storeCoupons).set({ isActive: false, updatedAt: new Date() }).where(eq(storeCoupons.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Cupom não encontrado." });
    await logAction(req.user!.userId, "STORE_COUPON_DISABLE", "store_coupons", updated.id, null, { code: updated.code });
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error.message || "Erro ao desativar cupom." }); }
});
