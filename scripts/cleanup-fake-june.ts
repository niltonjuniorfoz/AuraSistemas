// Remove tudo que scripts/seed-fake-june.ts criou (produtos FAKEJUN-*, compras,
// vendas, camadas de custo, câmbio SEED, fornecedor/cliente de teste). Local only.
// Rodar: npx tsx scripts/cleanup-fake-june.ts
import { db } from "../src/db";
import {
  products, stockBalances, suppliers, customers, purchaseOrders, purchaseOrderItems,
  costLayers, costConsumptions, sales, saleItems, fxRates,
} from "../src/db/schema";
import { eq, like, inArray } from "drizzle-orm";

async function main() {
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
  await db.delete(customers).where(eq(customers.name, "Cliente Teste (seed)"));
  await db.delete(fxRates).where(eq(fxRates.source, "SEED"));
  console.log(`Limpo: ${oldIds.length} produtos fake e tudo que dependia deles.`);
}
main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
