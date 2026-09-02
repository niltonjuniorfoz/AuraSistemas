// Seed de dados FALSOS só pra testar as telas de Inteligência/custo real em
// LOCAL (nunca roda em produção, não é chamado pelo app). Cria ~20 produtos,
// compras aprovadas em junho/2026, ~100 vendas em junho/2026 (~R$100 mil) e
// histórico de câmbio diário (jun-ago) pros cards de "momento do câmbio".
// Tudo prefixado FAKEJUN- pra ser fácil de achar e apagar depois.
//
// Rodar: npx tsx scripts/seed-fake-june.ts
import { db } from "../src/db";
import {
  products, stockBalances, suppliers, customers, users, purchaseOrders, purchaseOrderItems,
  costLayers, costConsumptions, sales, saleItems, fxRates,
} from "../src/db/schema";
import { eq, like, inArray, and } from "drizzle-orm";

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)];

async function main() {
  console.log("Limpando seed anterior (se houver)...");
  const oldProducts = await db.select({ id: products.id }).from(products).where(like(products.sku, "FAKEJUN-%"));
  const oldIds = oldProducts.map((p) => p.id);
  if (oldIds.length) {
    await db.delete(costConsumptions).where(inArray(costConsumptions.productId, oldIds));
    await db.delete(costLayers).where(inArray(costLayers.productId, oldIds));
    const oldSaleItems = await db.select({ saleId: saleItems.saleId }).from(saleItems).where(inArray(saleItems.productId, oldIds));
    const oldSaleIds = Array.from(new Set(oldSaleItems.map((s) => s.saleId)));
    if (oldSaleIds.length) {
      await db.delete(saleItems).where(inArray(saleItems.saleId, oldSaleIds));
      await db.delete(sales).where(inArray(sales.id, oldSaleIds));
    }
    const oldPoItems = await db.select({ purchaseOrderId: purchaseOrderItems.purchaseOrderId }).from(purchaseOrderItems).where(inArray(purchaseOrderItems.productId, oldIds));
    const oldPoIds = Array.from(new Set(oldPoItems.map((p) => p.purchaseOrderId)));
    if (oldPoIds.length) {
      await db.delete(purchaseOrderItems).where(inArray(purchaseOrderItems.purchaseOrderId, oldPoIds));
      await db.delete(purchaseOrders).where(inArray(purchaseOrders.id, oldPoIds));
    }
    await db.delete(stockBalances).where(inArray(stockBalances.productId, oldIds));
    await db.delete(products).where(inArray(products.id, oldIds));
  }
  await db.delete(suppliers).where(eq(suppliers.name, "Fornecedor Teste (seed)"));
  await db.delete(fxRates).where(eq(fxRates.source, "SEED"));

  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  if (!user) throw new Error("Nenhum usuário encontrado — crie o Master antes de rodar o seed.");

  let [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.name, "CLIENTE ESTRANGEIRO")).limit(1);
  if (!customer) {
    [customer] = await db.insert(customers).values({ name: "Cliente Teste (seed)", nationality: "PY" }).returning({ id: customers.id });
  }

  const [supplier] = await db.insert(suppliers).values({ name: "Fornecedor Teste (seed)", document: "80099999-1" }).returning({ id: suppliers.id });

  // ---------- 1) Histórico de câmbio diário: 01/jun a 29/ago ----------
  console.log("Gravando histórico de câmbio...");
  const fxStart = new Date("2026-06-01T12:00:00Z");
  const fxEnd = new Date("2026-08-29T12:00:00Z");
  let usdBrl = 5.42;
  let brlPyg = 1360;
  const fxByDay = new Map<string, number>(); // USDBRL por dia, pra usar nas compras
  for (let d = new Date(fxStart); d <= fxEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    usdBrl = r4(Math.max(4.9, Math.min(5.7, usdBrl + rand(-0.035, 0.03))));
    brlPyg = r2(Math.max(1280, Math.min(1450, brlPyg + rand(-12, 11))));
    const day = d.toISOString().slice(0, 10);
    fxByDay.set(day, usdBrl);
    await db.insert(fxRates).values([
      { day, pair: "USDBRL", rate: usdBrl.toFixed(6), source: "SEED" },
      { day, pair: "BRLPYG", rate: brlPyg.toFixed(6), source: "SEED" },
    ]).onConflictDoNothing();
  }
  // puxa só o USDBRL pra baixo nos últimos dias, pra dar sinal "bom momento" de verdade
  // (bug corrigido: a versão anterior atualizava sem filtrar por par e also
  // sobrescrevia o BRLPYG daqueles dias com o valor de escala do dólar)
  for (let i = 0; i < 4; i++) {
    const d = new Date(fxEnd); d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    const lowRate = r4(4.95 + i * 0.03);
    await db.update(fxRates).set({ rate: lowRate.toFixed(6) }).where(and(eq(fxRates.day, day), eq(fxRates.pair, "USDBRL")));
  }

  // ---------- 2) 20 produtos ----------
  console.log("Criando produtos...");
  const productDefs = Array.from({ length: 20 }, (_, i) => {
    const n = i + 1;
    const costUsd = r2(rand(8, 60));
    return { sku: `FAKEJUN-${String(n).padStart(2, "0")}`, name: `[TESTE] Produto Fake ${n}`, costUsd };
  });
  const createdProducts: { id: string; costUsd: number; salePriceA: number }[] = [];
  for (const p of productDefs) {
    const [row] = await db.insert(products).values({
      sku: p.sku, name: p.name, unitMeasure: "UN", costCurrency: "USD",
    }).returning({ id: products.id });
    await db.insert(stockBalances).values({ productId: row.id, physicalStock: 0, reservedStock: 0 });
    createdProducts.push({ id: row.id, costUsd: p.costUsd, salePriceA: 0 });
  }

  // ---------- 3) Compras aprovadas (junho, USD, câmbio do dia) ----------
  console.log("Criando compras aprovadas...");
  const purchaseDays = ["2026-06-03", "2026-06-05", "2026-06-08", "2026-06-11", "2026-06-15", "2026-06-19"];
  const stockRemaining = new Map<string, number>(); // productId -> qty disponível pra vender (simulação)
  for (let batch = 0; batch < purchaseDays.length; batch++) {
    const day = purchaseDays[batch];
    const rate = fxByDay.get(day) || 5.4;
    const itemsForThisPo = createdProducts.filter((_, idx) => idx % purchaseDays.length === batch);
    const qtyByItem = itemsForThisPo.map(() => randInt(30, 90));
    const subtotal = itemsForThisPo.reduce((a, p, idx) => a + p.costUsd * qtyByItem[idx], 0);
    const freightUsd = r2(subtotal * 0.02);
    const totalQty = qtyByItem.reduce((a, q) => a + q, 0);
    const freightPerUnitUsd = totalQty > 0 ? freightUsd / totalQty : 0;

    const [po] = await db.insert(purchaseOrders).values({
      supplierId: supplier.id, invoiceNumber: `NF-SEED-${1000 + batch}`,
      invoiceDate: new Date(`${day}T10:00:00Z`), currency: "USD", fxRateToBrl: rate.toFixed(6),
      freightAmount: freightUsd.toFixed(2), totalAmount: r2(subtotal + freightUsd).toFixed(2),
      status: "APPROVED", createdBy: user.id, approvedBy: user.id,
      createdAt: new Date(`${day}T10:00:00Z`), approvedAt: new Date(`${day}T10:05:00Z`),
    }).returning({ id: purchaseOrders.id });

    for (let idx = 0; idx < itemsForThisPo.length; idx++) {
      const prod = itemsForThisPo[idx];
      const qty = qtyByItem[idx];
      const landedUnitBrl = r4((prod.costUsd + freightPerUnitUsd) * rate);
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: po.id, productId: prod.id, quantity: qty,
        costPrice: prod.costUsd.toFixed(4), salePriceA: r2(landedUnitBrl * 1.7).toFixed(2),
      });
      await db.insert(costLayers).values({
        productId: prod.id, purchaseOrderId: po.id, qtyOriginal: qty, qtyRemaining: qty,
        unitCostBrl: landedUnitBrl.toFixed(4), sourceCurrency: "USD", fxRate: rate.toFixed(6),
        note: `Compra NF-SEED-${1000 + batch}`, createdAt: new Date(`${day}T10:05:00Z`),
      });
      await db.update(products).set({ costPrice: landedUnitBrl.toFixed(4) }).where(eq(products.id, prod.id));
      await db.update(stockBalances).set({ physicalStock: qty }).where(eq(stockBalances.productId, prod.id));
      prod.salePriceA = r2(landedUnitBrl * 1.7);
      await db.update(products).set({ salePriceA: prod.salePriceA.toFixed(2) }).where(eq(products.id, prod.id));
      stockRemaining.set(prod.id, qty);
    }
  }

  // ---------- 4) 100 vendas em junho, consumindo as camadas FIFO ----------
  console.log("Criando 100 vendas...");
  let totalRevenue = 0;
  const sellable = createdProducts.filter((p) => (stockRemaining.get(p.id) || 0) > 0);
  for (let i = 0; i < 100; i++) {
    const day = randInt(6, 28); // vendas a partir do dia 6, depois que as compras já chegaram
    const hour = randInt(9, 19);
    const createdAt = new Date(`2026-06-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`);

    const itemCount = randInt(1, 2);
    const chosen = new Set<string>();
    const items: { product: typeof sellable[number]; qty: number }[] = [];
    for (let k = 0; k < itemCount; k++) {
      const candidates = sellable.filter((p) => !chosen.has(p.id) && (stockRemaining.get(p.id) || 0) >= 1);
      if (!candidates.length) break;
      const prod = pick(candidates);
      chosen.add(prod.id);
      const maxQty = Math.min(4, stockRemaining.get(prod.id) || 0);
      if (maxQty < 1) continue;
      const qty = randInt(1, maxQty);
      items.push({ product: prod, qty });
      stockRemaining.set(prod.id, (stockRemaining.get(prod.id) || 0) - qty);
    }
    if (!items.length) continue;

    const totalAmount = r2(items.reduce((a, it) => a + it.product.salePriceA * it.qty, 0));
    totalRevenue += totalAmount;

    const [sale] = await db.insert(sales).values({
      customerId: customer.id, userId: user.id, orderStatus: "CONFIRMED", paymentStatus: "PAID",
      fulfillmentStatus: "DELIVERED", subtotalAmount: totalAmount.toFixed(2), totalAmount: totalAmount.toFixed(2),
      currency: "BRL", createdAt,
    }).returning({ id: sales.id });

    for (const it of items) {
      const unitPrice = it.product.salePriceA;
      const totalPrice = r2(unitPrice * it.qty);

      // Consome camadas FIFO mais antigas primeiro (mesma lógica de consumeFifo, com data explícita).
      let remainingQty = it.qty;
      let costConsumed = 0;
      const layers = await db.select().from(costLayers)
        .where(eq(costLayers.productId, it.product.id));
      const openLayers = layers.filter((l) => l.qtyRemaining > 0).sort((a, b) => (a.createdAt as any) - (b.createdAt as any));
      for (const layer of openLayers) {
        if (remainingQty <= 0) break;
        const take = Math.min(remainingQty, layer.qtyRemaining);
        costConsumed += take * Number(layer.unitCostBrl);
        await db.update(costLayers).set({ qtyRemaining: layer.qtyRemaining - take }).where(eq(costLayers.id, layer.id));
        await db.insert(costConsumptions).values({
          layerId: layer.id, productId: it.product.id, saleId: sale.id, qty: take,
          unitCostBrl: layer.unitCostBrl, reason: "SALE", createdAt,
        });
        remainingQty -= take;
      }

      await db.insert(saleItems).values({
        saleId: sale.id, productId: it.product.id, quantity: it.qty, unitPrice: unitPrice.toFixed(2),
        unitCostAtSale: it.qty > 0 ? (costConsumed / it.qty).toFixed(4) : "0",
        totalCostAtSale: costConsumed.toFixed(2), profitAmount: r2(totalPrice - costConsumed).toFixed(2),
        totalPrice: totalPrice.toFixed(2),
      });
    }
  }

  console.log(`Pronto. ${createdProducts.length} produtos, ${purchaseDays.length} compras aprovadas, receita total ~R$ ${r2(totalRevenue).toLocaleString("pt-BR")}.`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
