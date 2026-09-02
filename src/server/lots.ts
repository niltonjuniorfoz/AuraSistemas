import { Router } from "express";
import { db } from "../db";
import { productLots, products, saleItemLots, saleItems, sales } from "../db/schema";
import { and, asc, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";

const router = Router();
router.use(requireAuth);

function asExpiryDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Cria o lote se não existir e soma quantidade ao saldo físico. Atualiza a validade se informada.
// Usada na entrada de mercadoria (compra) e na entrada manual de estoque.
export async function addLotStock(
  tx: any,
  productId: string,
  lotNumber: string,
  quantity: number,
  expiryDate: Date | null,
) {
  const lot = String(lotNumber || "").trim().toUpperCase();
  const qty = Math.floor(Number(quantity) || 0);
  if (!lot || qty <= 0) return;

  const existing = await tx.select().from(productLots)
    .where(and(eq(productLots.productId, productId), eq(productLots.lotNumber, lot)))
    .limit(1);

  if (existing.length === 0) {
    await tx.insert(productLots).values({
      productId,
      lotNumber: lot,
      expiryDate: expiryDate || null,
      physicalStock: qty,
    });
  } else {
    await tx.update(productLots).set({
      physicalStock: Number(existing[0].physicalStock) + qty,
      expiryDate: expiryDate || existing[0].expiryDate,
      updatedAt: new Date(),
    }).where(eq(productLots.id, existing[0].id));
  }
}

// Baixa saldo físico do lote (na entrega/saída real). Não deixa o saldo do lote ficar negativo.
export async function consumeLotStock(tx: any, productId: string, lotNumber: string, quantity: number) {
  const lot = String(lotNumber || "").trim().toUpperCase();
  const qty = Math.floor(Number(quantity) || 0);
  if (!lot || qty <= 0) return;

  const existing = await tx.select().from(productLots)
    .where(and(eq(productLots.productId, productId), eq(productLots.lotNumber, lot)))
    .limit(1);
  if (existing.length === 0) return;
  const next = Math.max(0, Number(existing[0].physicalStock) - qty);
  await tx.update(productLots).set({ physicalStock: next, updatedAt: new Date() }).where(eq(productLots.id, existing[0].id));
}

// Consome `quantity` de um produto pelos lotes em FEFO (vence primeiro sai primeiro). Usado nas saídas
// manuais (baixa/ajuste) de produto com lote obrigatório, pra manter sum(productLots)==stock_balances.
// Retorna quanto sobrou sem lote pra consumir (0 = ok).
export async function consumeLotsFEFO(tx: any, productId: string, quantity: number): Promise<number> {
  let remaining = Math.floor(Number(quantity) || 0);
  if (remaining <= 0) return 0;
  const lots = await tx.select().from(productLots)
    .where(and(eq(productLots.productId, productId), gt(productLots.physicalStock, 0)))
    .orderBy(asc(productLots.expiryDate), asc(productLots.lotNumber));
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(lot.physicalStock));
    await tx.update(productLots).set({ physicalStock: Number(lot.physicalStock) - take, updatedAt: new Date() }).where(eq(productLots.id, lot.id));
    remaining -= take;
  }
  return remaining;
}

// Consome os lotes alocados a uma venda (usado na entrega). Baixa cada lote informado em sale_item_lots.
export async function consumeSaleLots(tx: any, saleId: string) {
  const allocs = await tx.select({
    productId: saleItemLots.productId,
    lotNumber: saleItemLots.lotNumber,
    quantity: saleItemLots.quantity,
  }).from(saleItemLots).where(eq(saleItemLots.saleId, saleId));
  for (const a of allocs) {
    await consumeLotStock(tx, a.productId, a.lotNumber, Number(a.quantity || 0));
  }
}

// Devolve ao lote as quantidades alocadas (usado ao cancelar/devolver uma venda já entregue).
export async function restoreSaleLots(tx: any, saleId: string) {
  const allocs = await tx.select({
    productId: saleItemLots.productId,
    lotNumber: saleItemLots.lotNumber,
    quantity: saleItemLots.quantity,
  }).from(saleItemLots).where(eq(saleItemLots.saleId, saleId));
  for (const a of allocs) {
    await addLotStock(tx, a.productId, a.lotNumber, Number(a.quantity || 0), null);
  }
}

// Lotes disponíveis de um produto, ordenados por validade (FEFO — vence primeiro, sai primeiro).
router.get("/product/:productId", async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      id: productLots.id,
      lotNumber: productLots.lotNumber,
      expiryDate: productLots.expiryDate,
      physicalStock: productLots.physicalStock,
    })
    .from(productLots)
    .where(and(eq(productLots.productId, req.params.productId), gt(productLots.physicalStock, 0)))
    .orderBy(asc(productLots.expiryDate), asc(productLots.lotNumber));
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Alerta de validade: lotes com saldo cujo vencimento cai dentro de N dias (ou já vencidos).
router.get("/expiring", requirePermission("product", "view"), async (req: AuthRequest, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "90"), 10) || 90, 1), 365);
    const limit = new Date();
    limit.setDate(limit.getDate() + days);

    const rows = await db.select({
      id: productLots.id,
      productId: productLots.productId,
      productName: products.name,
      sku: products.sku,
      lotNumber: productLots.lotNumber,
      expiryDate: productLots.expiryDate,
      physicalStock: productLots.physicalStock,
    })
    .from(productLots)
    .innerJoin(products, eq(productLots.productId, products.id))
    .where(and(
      gt(productLots.physicalStock, 0),
      isNotNull(productLots.expiryDate),
      lte(productLots.expiryDate, limit),
    ))
    .orderBy(asc(productLots.expiryDate));

    const now = Date.now();
    const data = rows.map((r) => {
      const exp = r.expiryDate ? new Date(r.expiryDate).getTime() : 0;
      const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      return { ...r, daysLeft, expired: daysLeft < 0 };
    });
    res.json({ data, count: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Divide a quantidade DESTE lote entre Oferta/Outlet — productLots é 1
// linha por lote com uma quantidade (physicalStock), não por unidade, então
// aqui é número, não uma escolha de linha inteira. Nunca deixa passar do
// saldo físico do próprio lote.
router.patch("/:lotId", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const ofertaQty = Math.max(0, parseInt(req.body?.ofertaQty) || 0);
    const outletQty = Math.max(0, parseInt(req.body?.outletQty) || 0);
    const [lot] = await db.select().from(productLots).where(eq(productLots.id, req.params.lotId)).limit(1);
    if (!lot) return res.status(404).json({ error: "Lote não encontrado." });
    if (ofertaQty + outletQty > Number(lot.physicalStock)) {
      return res.status(400).json({ error: `Oferta + Outlet (${ofertaQty + outletQty}) não pode passar do saldo do lote (${lot.physicalStock}).` });
    }
    await db.update(productLots).set({ ofertaQty, outletQty, updatedAt: new Date() }).where(eq(productLots.id, req.params.lotId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { asExpiryDate };
export default router;
