import { Router } from "express";
import { db } from "../db";
import {
  sales,
  saleItems,
  customers,
  expenses,
  users,
  products,
  productGroups,
  productSubgroups,
  companySettings,
  shelves,
  stockBalances,
  stockMovements,
} from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import {
  eq,
  and,
  inArray,
  sql,
  gte,
  lte,
  desc,
  isNull,
  or,
  ilike,
  not,
} from "drizzle-orm";
import PDFDocument from "pdfkit";
import { loadImageBuffer } from "./pdfHelpers";
import { formatServerCurrency, getServerCurrencySettings } from "./currency";
import { dayStartUtc, dayEndUtc } from "../lib/dateRange";

const router = Router();
router.use(requireAuth);

// Comissões por vendedor no período. Base = subtotal - desconto (faturamento de
// produtos, sem frete). Comissão = base × % do vendedor. status filtra por
// pagamento (PAID por padrão: comissão sobre vendas efetivamente pagas).
router.get("/commissions", requirePermission("reports", "profit"), async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;
    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : undefined;
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : undefined;

    const conditions = [sql`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`];
    const payFilter = String(status || "PAID").toUpperCase();
    if (payFilter === "PAID") conditions.push(eq(sales.paymentStatus, "PAID"));
    if (fromDate) conditions.push(gte(sales.createdAt, fromDate));
    if (toDate) conditions.push(lte(sales.createdAt, toDate));

    const rows = await db.select({
      userId: sales.userId,
      sellerName: users.name,
      commissionPercent: users.commissionPercent,
      subtotal: sql<number>`sum(cast(${sales.subtotalAmount} as numeric))`,
      discount: sql<number>`sum(cast(${sales.discountAmount} as numeric))`,
      total: sql<number>`sum(cast(${sales.totalAmount} as numeric))`,
      salesCount: sql<number>`count(*)`,
    })
    .from(sales)
    .leftJoin(users, eq(sales.userId, users.id))
    .where(and(...conditions))
    .groupBy(sales.userId, users.name, users.commissionPercent)
    .orderBy(sql`sum(cast(${sales.subtotalAmount} as numeric)) desc`);

    const data = rows.map((r) => {
      const base = Math.round((Number(r.subtotal || 0) - Number(r.discount || 0)) * 100) / 100;
      const pct = Number(r.commissionPercent || 0);
      const commission = Math.round(base * (pct / 100) * 100) / 100;
      return {
        userId: r.userId,
        sellerName: r.sellerName || "—",
        commissionPercent: pct,
        salesCount: Number(r.salesCount || 0),
        totalSold: Math.round(Number(r.total || 0) * 100) / 100,
        commissionBase: base,
        commission,
      };
    });

    const summary = data.reduce((acc, d) => {
      acc.totalBase += d.commissionBase;
      acc.totalCommission += d.commission;
      acc.totalSold += d.totalSold;
      return acc;
    }, { sellers: data.length, totalBase: 0, totalCommission: 0, totalSold: 0 });
    summary.totalBase = Math.round(summary.totalBase * 100) / 100;
    summary.totalCommission = Math.round(summary.totalCommission * 100) / 100;
    summary.totalSold = Math.round(summary.totalSold * 100) / 100;

    res.json({ data, summary, status: payFilter });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Curva ABC: classifica produtos pela contribuição no faturamento do período.
// A = até 80% acumulado, B = 80-95%, C = 95-100%.
router.get("/abc", requirePermission("reports", "profit"), async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : undefined;
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : undefined;

    const conditions = [sql`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`];
    if (fromDate) conditions.push(gte(sales.createdAt, fromDate));
    if (toDate) conditions.push(lte(sales.createdAt, toDate));

    const rows = await db.select({
      productId: saleItems.productId,
      productName: products.name,
      sku: products.sku,
      qty: sql<number>`sum(${saleItems.quantity})`,
      revenue: sql<number>`sum(cast(${saleItems.totalPrice} as numeric))`,
      cost: sql<number>`sum(coalesce(cast(${saleItems.totalCostAtSale} as numeric), 0))`,
      profit: sql<number>`sum(coalesce(cast(${saleItems.profitAmount} as numeric), 0))`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(and(...conditions))
    .groupBy(saleItems.productId, products.name, products.sku)
    .orderBy(sql`sum(cast(${saleItems.totalPrice} as numeric)) desc`);

    const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    let cumulative = 0;
    const data = rows.map((r) => {
      const revenue = Number(r.revenue || 0);
      const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      // Classifica pelo acumulado ANTES deste item: quem ajuda a formar os
      // primeiros 80% do faturamento é A (inclui o item que cruza o limite).
      const before = cumulative;
      cumulative += share;
      const cls = before < 80 ? "A" : before < 95 ? "B" : "C";
      return {
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        qty: Number(r.qty || 0),
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(Number(r.cost || 0) * 100) / 100,
        profit: Math.round(Number(r.profit || 0) * 100) / 100,
        share: Math.round(share * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
        classe: cls,
      };
    });

    const byClass = { A: { count: 0, revenue: 0 }, B: { count: 0, revenue: 0 }, C: { count: 0, revenue: 0 } };
    for (const d of data) {
      const k = d.classe as "A" | "B" | "C";
      byClass[k].count += 1;
      byClass[k].revenue = Math.round((byClass[k].revenue + d.revenue) * 100) / 100;
    }

    res.json({ data, totalRevenue: Math.round(totalRevenue * 100) / 100, byClass });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/products-catalog/preview",
  requirePermission("reports", "products_pdf"),
  async (req: AuthRequest, res) => {
    try {
      const {
        groupIds,
        subgroupIds,
        onlyActive = true,
        onlyWithPhoto,
      } = req.body;

      const conditions = [];
      if (onlyActive) conditions.push(eq(products.isActive, true));
      if (groupIds && groupIds.length > 0)
        conditions.push(inArray(products.groupId, groupIds));
      if (subgroupIds && subgroupIds.length > 0)
        conditions.push(inArray(products.subgroupId, subgroupIds));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const prods = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          imageUrl: products.imageUrl,
          groupName: productGroups.name,
          subgroupName: productSubgroups.name,
        })
        .from(products)
        .leftJoin(productGroups, eq(products.groupId, productGroups.id))
        .leftJoin(
          productSubgroups,
          eq(products.subgroupId, productSubgroups.id),
        )
        .where(whereClause)
        .orderBy(
          productGroups.name,
          productSubgroups.name,
          products.name,
          products.sku,
        );

      let filtered = prods;
      if (onlyWithPhoto) {
        filtered = filtered.filter((p) => !!p.imageUrl);
      }

      res.json({
        total: filtered.length,
        items: filtered.slice(0, 20),
      });
    } catch (error: any) {
      console.error("Preview error:", error);
      res.status(500).json({ error: "Erro ao gerar prévia." });
    }
  },
);

router.post(
  "/products-catalog/pdf",
  requirePermission("reports", "products_pdf"),
  async (req: AuthRequest, res) => {
    try {
      const {
        groupIds,
        subgroupIds,
        onlyWithPhoto,
        showPrice,
        priceTable,
        showSku,
        showPhoto,
        onlyActive = true,
      } = req.body;

      const conditions = [];
      if (onlyActive) {
        conditions.push(eq(products.isActive, true));
      }
      if (groupIds && groupIds.length > 0) {
        conditions.push(inArray(products.groupId, groupIds));
      }
      if (subgroupIds && subgroupIds.length > 0) {
        conditions.push(inArray(products.subgroupId, subgroupIds));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const prods = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          imageUrl: products.imageUrl,
          salePriceA: products.salePriceA,
          salePriceB: products.salePriceB,
          salePriceC: products.salePriceC,
          groupName: productGroups.name,
          subgroupName: productSubgroups.name,
        })
        .from(products)
        .leftJoin(productGroups, eq(products.groupId, productGroups.id))
        .leftJoin(
          productSubgroups,
          eq(products.subgroupId, productSubgroups.id),
        )
        .where(whereClause)
        .orderBy(
          productGroups.name,
          productSubgroups.name,
          products.name,
          products.sku,
        );

      let filtered = prods;
      if (onlyWithPhoto) {
        filtered = filtered.filter((p) => !!p.imageUrl);
      }

      const comp = await db.select().from(companySettings).limit(1);
      const company: any = comp[0] || {};
      const currencySettings = await getServerCurrencySettings(company.defaultCurrency);

      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
        layout: "landscape",
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="catalogo_produtos.pdf"`,
      );

      doc.pipe(res);

      // Pre-fetch images to avoid async rendering issues inside the PDF flow
      const imageBuffers = new Map();
      if (company.logoUrl) {
        const b = await loadImageBuffer(company.logoUrl);
        if (b) imageBuffers.set("logo", b);
      }

      if (showPhoto) {
        for (const p of filtered) {
          if (p.imageUrl) {
            const b = await loadImageBuffer(p.imageUrl);
            if (b) imageBuffers.set(p.id, b);
          }
        }
      }

      const drawHeader = () => {
        doc.addPage();

        let logoStartY = 30;
        if (imageBuffers.has("logo")) {
          try {
            doc.image(imageBuffers.get("logo"), 30, logoStartY, {
              fit: [100, 50],
            });
          } catch (e) {}
        }

        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(`Catálogo de Produtos - ${company.tradeName || company.companyName || "Sua loja"}`, { align: "center" });
        doc.moveDown(1);

        // Update doc Y position in case logo is taller
        if (imageBuffers.has("logo") && doc.y < 85) {
          doc.y = 85;
        }

        doc.rect(doc.x, doc.y, 782, 20).fillAndStroke("#f3f4f6", "#e5e7eb");
        doc.fillColor("#111827").fontSize(10);

        let headY = doc.y + 5;
        if (showSku) doc.text("SKU", 35, headY, { width: 80 });
        doc.text("GRUPO", showSku ? 120 : 35, headY, { width: 100 });
        doc.text("SUBGRUPO", showSku ? 225 : 140, headY, { width: 100 });
        doc.text("PRODUTO", showSku ? 335 : 250, headY, {
          width: showPrice && showPhoto ? 200 : 300,
        });
        if (showPhoto) doc.text("FOTO", 545, headY, { width: 100 });
        if (showPrice)
          doc.text(currencySettings.mode === "DUAL" ? "PREÇO US$ / R$" : "PREÇO", 655, headY, { width: 145, align: "right" });

        doc.moveDown(1);
      };

      // First page
      let firstPageY = 30;
      if (imageBuffers.has("logo")) {
        try {
          doc.image(imageBuffers.get("logo"), 30, firstPageY, {
            fit: [100, 50],
          });
        } catch (e) {}
      }
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(`Catálogo de Produtos - ${company.tradeName || company.companyName || "Sua loja"}`, { align: "center" });
      doc.moveDown(1);

      if (imageBuffers.has("logo") && doc.y < 85) {
        doc.y = 85;
      }

      const drawTableHeader = (startY: number) => {
        doc.rect(30, startY, 782, 20).fillAndStroke("#f3f4f6", "#e5e7eb");
        doc.fillColor("#111827").fontSize(10).font("Helvetica-Bold");

        let textY = startY + 5;
        if (showSku) doc.text("SKU", 35, textY, { width: 80 });
        doc.text("GRUPO", showSku ? 120 : 35, textY, { width: 100 });
        doc.text("SUBGRUPO", showSku ? 225 : 140, textY, { width: 100 });
        doc.text("PRODUTO", showSku ? 335 : 250, textY, { width: 200 }); // Fixed width for product
        if (showPhoto) doc.text("FOTO", 545, textY, { width: 100 });
        if (showPrice)
          doc.text(currencySettings.mode === "DUAL" ? "PREÇO US$ / R$" : "PREÇO", 655, textY, { width: 145, align: "right" });

        doc.font("Helvetica").fillColor("black");
      };

      let currentY = doc.y;
      drawTableHeader(currentY);
      currentY += 20;

      let rowToggle = false;

      for (const p of filtered) {
        if (currentY > 500) {
          // Page break
          doc.addPage();
          currentY = 30;
          drawTableHeader(currentY);
          currentY += 20;
        }

        const rowHeight = showPhoto ? 50 : (currencySettings.mode === "DUAL" && showPrice ? 36 : 25);

        if (rowToggle) {
          doc.rect(30, currentY, 782, rowHeight).fill("#f9fafb");
        }
        doc.fillColor("#111827").fontSize(10);

        const textY = currentY + (showPhoto ? 20 : 7);

        if (showSku)
          doc.text(p.sku || "-", 35, textY, { width: 80, lineBreak: false });
        doc.text(p.groupName || "-", showSku ? 120 : 35, textY, {
          width: 100,
          height: rowHeight,
          ellipsis: true,
        });
        doc.text(p.subgroupName || "-", showSku ? 225 : 140, textY, {
          width: 100,
          height: rowHeight,
          ellipsis: true,
        });
        doc.text(p.name || "-", showSku ? 335 : 250, textY, {
          width: 200,
          height: rowHeight,
          ellipsis: true,
        });

        if (showPhoto) {
          const buf = imageBuffers.get(p.id);
          if (buf) {
            try {
              doc.image(buf, 545, currentY + 5, { fit: [40, 40] });
            } catch {
              doc.fillColor("gray").fontSize(8).text("SEM FOTO", 545, textY);
            }
          } else {
            doc.fillColor("gray").fontSize(8).text("SEM FOTO", 545, textY);
          }
        }

        if (showPrice) {
          let price = p.salePriceA;
          if (priceTable === "B") price = p.salePriceB;
          const formattedPrice = formatServerCurrency(price, currencySettings, currencySettings.mode === "DUAL" ? "\n" : " / ");
          doc
            .fillColor("#111827")
            .fontSize(currencySettings.mode === "DUAL" ? 8 : 10)
            .text(formattedPrice, 655, textY, { width: 145, align: "right" });
        }

        currentY += rowHeight;
        rowToggle = !rowToggle;
      }

      doc.end();
    } catch (error: any) {
      console.error("PDF generation error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erro ao gerar PDF" });
      }
    }
  },
);

router.get(
  "/profit",
  requirePermission("reports", "profit"),
  async (req: AuthRequest, res) => {
    try {
      const { dateFrom, dateTo, status } = req.query;

      const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : undefined;
      const toDate = dateTo ? dayEndUtc(String(dateTo)) : undefined;

      const saleConditions = [
        sql`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
        eq(sales.paymentStatus, "PAID"),
      ];

      if (fromDate) saleConditions.push(gte(sales.createdAt, fromDate));
      if (toDate) saleConditions.push(lte(sales.createdAt, toDate));

      if (status === "PAID") saleConditions.push(eq(sales.paymentStatus, "PAID"));
      else if (status === "DELIVERED") saleConditions.push(eq(sales.fulfillmentStatus, "DELIVERED"));

      const expensesConditions = [];
      if (fromDate) expensesConditions.push(gte(expenses.expenseDate, fromDate));
      if (toDate) expensesConditions.push(lte(expenses.expenseDate, toDate));
      expensesConditions.push(eq(expenses.isFixed, false));

      // As despesas independem das vendas; buscar em paralelo evita uma ida extra ao Neon.
      const expensesPromise = Promise.all([
        db
          .select()
          .from(expenses)
          .where(expensesConditions.length > 0 ? and(...expensesConditions) : undefined),
        db
          .select()
          .from(expenses)
          .where(and(eq(expenses.isFixed, true), eq(expenses.isActive, true))),
      ]);

      const [salesList, activeProductsCount, activeCustomersCount] = await Promise.all([
        db
          .select({
            id: sales.id,
            series: sales.series,
            number: sales.number,
            createdAt: sales.createdAt,
            totalAmount: sales.totalAmount,
            subtotalAmount: sales.subtotalAmount,
            customerName: customers.name,
            paymentStatus: sales.paymentStatus,
          })
          .from(sales)
          .leftJoin(customers, eq(sales.customerId, customers.id))
          .where(and(...saleConditions))
          .orderBy(desc(sales.createdAt)),
        db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isActive, true)),
        db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.isActive, true)),
      ]);

      let grossSales = 0;
      let netSales = 0;
      let productCost = 0;
      let itemsSold = 0;
      let profitAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let hasEstimatedCost = false;

      const saleIds = salesList.map((s) => s.id);
      const saleTotals = new Map<string, { cost: number; profit: number; qty: number }>();

      if (saleIds.length) {
        const items = await db
          .select({
            saleId: saleItems.saleId,
            totalCostAtSale: saleItems.totalCostAtSale,
            profitAmount: saleItems.profitAmount,
            totalPrice: saleItems.totalPrice,
            unitCost: products.costPrice,
            quantity: saleItems.quantity,
          })
          .from(saleItems)
          .leftJoin(products, eq(saleItems.productId, products.id))
          .where(inArray(saleItems.saleId, saleIds));

        for (const i of items) {
          const current = saleTotals.get(i.saleId) || { cost: 0, profit: 0, qty: 0 };
          const qty = Number(i.quantity || 0);
          itemsSold += qty;
          current.qty += qty;

          let cost = 0;
          if (i.totalCostAtSale != null) {
            cost = Number(i.totalCostAtSale || 0);
          } else {
            hasEstimatedCost = true;
            cost = Number(i.unitCost || 0) * qty;
          }
          current.cost += cost;
          current.profit += i.profitAmount != null ? Number(i.profitAmount || 0) : Number(i.totalPrice || 0) - cost;
          saleTotals.set(i.saleId, current);
        }
      }

      const salesData = salesList.map((s) => {
        const saleCost = saleTotals.get(s.id)?.cost || 0;
        const saleProfit = saleTotals.get(s.id)?.profit || 0;
        const saleTotal = Number(s.totalAmount || 0);

        if (s.paymentStatus === "PAID") paidAmount += saleTotal;
        else if (s.paymentStatus === "PENDING") pendingAmount += saleTotal;

        grossSales += Number(s.subtotalAmount || 0);
        netSales += saleTotal;
        productCost += saleCost;
        profitAmount += saleProfit;

        return {
          id: s.id,
          series: s.series,
          number: s.number,
          createdAt: s.createdAt,
          customerName: s.customerName || "Consumidor Final",
          totalAmount: saleTotal,
          cost: saleCost,
          profit: saleProfit,
          marginPercent: saleTotal > 0 ? (saleProfit / saleTotal) * 100 : 0,
        };
      });

      const [variableExpensesList, fixedExpensesList] = await expensesPromise;

      let totalExpenses = variableExpensesList.reduce((sum, e) => sum + Number(e.amountUsd || 0), 0);

      const fromD = fromDate || new Date();
      const toD = toDate || new Date();
      const startYear = fromD.getFullYear();
      const startMonth = fromD.getMonth();
      const endYear = toD.getFullYear();
      const endMonth = toD.getMonth();
      const monthsCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

      if (monthsCount > 0) {
        for (const fe of fixedExpensesList) {
          totalExpenses += Number(fe.amountUsd || 0) * monthsCount;
        }
      }

      const grossProfit = profitAmount;
      const netProfit = grossProfit - totalExpenses;
      const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
      const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0;

      res.json({
        hasEstimatedCost,
        summary: {
          activeProducts: Number(activeProductsCount[0]?.count || 0),
          activeCustomers: Number(activeCustomersCount[0]?.count || 0),
          paidAmount,
          pendingAmount,
          grossSales,
          netSales,
          productCost,
          grossProfit,
          expenses: totalExpenses,
          netProfit,
          grossMarginPercent,
          netMarginPercent,
          salesCount: salesList.length,
          itemsSold,
          averageTicket: salesList.length > 0 ? netSales / salesList.length : 0,
        },
        sales: salesData,
        expenses: [...variableExpensesList, ...fixedExpensesList],
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },
);

async function getProductsFinancialReportData(query: any) {
  const {
    dateFrom,
    dateTo,
    groupId,
    subgroupId,
    shelfId,
    q,
    onlySold,
    onlyInStock,
    onlyNegativeProfit,
  } = query;

  let baseWhere = and(eq(products.isActive, true), isNull(products.deletedAt));
  if (groupId)
    baseWhere = and(baseWhere, eq(products.groupId, groupId as string));
  if (subgroupId)
    baseWhere = and(baseWhere, eq(products.subgroupId, subgroupId as string));
  if (shelfId)
    baseWhere = and(baseWhere, eq(products.shelfId, shelfId as string));
  if (q) {
    const qs = q as string;
    baseWhere = and(
      baseWhere,
      or(ilike(products.name, `%${qs}%`), ilike(products.sku, `%${qs}%`)),
    );
  }

  const allProducts = (await db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      group: productGroups.name,
      subgroup: productSubgroups.name,
      shelf: shelves.name,
      cost: products.costPrice,
      salePriceA: products.salePriceA,
      salePriceB: products.salePriceB,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock,
    })
    .from(products)
    .leftJoin(productGroups, eq(products.groupId, productGroups.id))
    .leftJoin(productSubgroups, eq(products.subgroupId, productSubgroups.id))
    .leftJoin(shelves, eq(products.shelfId, shelves.id))
    .leftJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(baseWhere)
    .orderBy(products.name, products.sku)) as any[];

  const dateWhere: any[] = [];
  if (dateFrom)
    dateWhere.push(gte(sales.createdAt, new Date(dateFrom + "T00:00:00.000Z")));
  if (dateTo)
    dateWhere.push(lte(sales.createdAt, new Date(dateTo + "T23:59:59.999Z")));

  const soldItems = (await db
    .select({
      productId: saleItems.productId,
      qty: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      totalCostAtSale: saleItems.totalCostAtSale,
      profitAmount: saleItems.profitAmount,
      totalPrice: saleItems.totalPrice,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .where(
      and(
        ...dateWhere,
        eq(sales.paymentStatus, "PAID"),
        not(inArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])),
        not(inArray(sales.paymentStatus, ["REFUNDED"])),
      ),
    )) as any[];

  const soldMap = new Map();
  soldItems.forEach((s) => {
    const cur = soldMap.get(s.productId) || {
      qty: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };
    cur.qty += Number(s.qty);
    cur.revenue += Number(s.totalPrice);
    if (s.totalCostAtSale != null) {
      cur.cost += Number(s.totalCostAtSale);
      cur.profit += Number(s.profitAmount || 0);
    } else {
      cur.cost = -1;
      cur.profit = -1;
    }
    soldMap.set(s.productId, cur);
  });

  let data = allProducts.map((p) => {
    const sInfo = soldMap.get(p.productId) || {
      qty: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };
    const soldQty = sInfo.qty;
    const revenue = sInfo.revenue;
    let finalCost = 0;
    let profit = 0;

    if (sInfo.cost === -1) {
      finalCost = soldQty * Number(p.cost || 0);
      profit = revenue - finalCost;
    } else {
      finalCost = sInfo.cost;
      profit = sInfo.profit;
    }
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
    const phys = Number(p.physicalStock) || 0;
    const resSt = Number(p.reservedStock) || 0;

    return {
      productId: p.productId,
      sku: p.sku,
      name: p.name,
      group: p.group || "-",
      subgroup: p.subgroup || "-",
      shelf: p.shelf || "-",
      soldQuantity: soldQty,
      revenue,
      cost: finalCost,
      profit,
      marginPercent,
      physicalStock: phys,
      availableStock: phys - resSt,
      costPrice: Number(p.cost || 0),
      salePriceA: Number(p.salePriceA || 0),
      salePriceB: Number(p.salePriceB || 0),
    };
  });

  if (onlySold === "true") data = data.filter((d) => d.soldQuantity > 0);
  if (onlyInStock === "true") data = data.filter((d) => d.availableStock > 0);
  if (onlyNegativeProfit === "true") data = data.filter((d) => d.profit < 0);

  const summary = data.reduce(
    (acc, curr) => {
      acc.totalProducts++;
      acc.totalSoldQuantity += curr.soldQuantity;
      acc.totalRevenue += curr.revenue;
      acc.totalCost += curr.cost;
      acc.totalProfit += curr.profit;
      return acc;
    },
    {
      totalProducts: 0,
      totalSoldQuantity: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      averageMarginPercent: 0,
    },
  );

  if (summary.totalRevenue > 0) {
    summary.averageMarginPercent =
      (summary.totalProfit / summary.totalRevenue) * 100;
  }

  return { summary, data };
}

router.get(
  "/products-financial",
  requirePermission("reports", "profit"),
  async (req: AuthRequest, res) => {
    try {
      const report = await getProductsFinancialReportData(req.query);
      res.json(report);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/products-financial/pdf",
  requirePermission("reports", "profit"),
  async (req: AuthRequest, res) => {
    try {
      const report = await getProductsFinancialReportData(req.query);
      const { dateFrom, dateTo, q } = req.query;
      const data = report.data;
      const summary = report.summary;
      const currencySettings = await getServerCurrencySettings();

      const money = (value: number) =>
        formatServerCurrency(value, currencySettings, currencySettings.mode === "DUAL" ? "\n" : " / ");
      const percent = (value: number) => `${Number(value || 0).toFixed(1)}%`;

      const doc = new PDFDocument({
        margin: 28,
        size: currencySettings.mode === "DUAL" ? "A3" : "A4",
        layout: "landscape",
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="relatorio_financeiro_produtos.pdf"`,
      );
      doc.pipe(res);

      const tableLeft = 28;
      const tableWidth = currencySettings.mode === "DUAL" ? 1135 : 785;
      const rowHeight = currencySettings.mode === "DUAL" ? 30 : 20;
      let y = 28;

      const drawTitle = () => {
        doc
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .fontSize(16)
          .text("Relatório Financeiro de Produtos", tableLeft, y, {
            width: tableWidth,
            align: "center",
          });
        y += 24;
        doc.fillColor("#374151").font("Helvetica").fontSize(9);
        const periodo = `Período: ${dateFrom || "-"} até ${dateTo || "-"}`;
        const busca = q ? ` | Busca: ${q}` : "";
        doc.text(`${periodo}${busca}`, tableLeft, y, {
          width: tableWidth,
          align: "center",
        });
        y += 18;
      };

      const drawSummary = () => {
        const cards = [
          ["Produtos", String(summary.totalProducts)],
          ["Qtd. Vendida", String(summary.totalSoldQuantity)],
          ["Faturamento", money(summary.totalRevenue)],
          ["Custo", money(summary.totalCost)],
          ["Lucro Bruto", money(summary.totalProfit)],
          ["Margem Média", percent(summary.averageMarginPercent)],
        ];
        const cardW = tableWidth / cards.length;
        cards.forEach(([label, value], index) => {
          const x = tableLeft + index * cardW;
          const cardHeight = currencySettings.mode === "DUAL" ? 46 : 34;
          doc.rect(x, y, cardW - 4, cardHeight).fillAndStroke("#f3f4f6", "#e5e7eb");
          doc
            .fillColor("#6b7280")
            .font("Helvetica")
            .fontSize(7)
            .text(label, x + 5, y + 6, { width: cardW - 14 });
          doc
            .fillColor("#111827")
            .font("Helvetica-Bold")
            .fontSize(currencySettings.mode === "DUAL" ? 7 : 9)
            .text(value, x + 5, y + 18, { width: cardW - 14 });
        });
        y += currencySettings.mode === "DUAL" ? 58 : 46;
      };

      const columns = currencySettings.mode === "DUAL" ? [
        { title: "SKU", x: 30, w: 55, align: "left" as const },
        { title: "Produto", x: 89, w: 180, align: "left" as const },
        { title: "Grupo/Subgrupo", x: 273, w: 110, align: "left" as const },
        { title: "Qtd", x: 387, w: 35, align: "right" as const },
        { title: "Faturamento", x: 426, w: 105, align: "right" as const },
        { title: "Custo", x: 535, w: 95, align: "right" as const },
        { title: "Lucro", x: 634, w: 95, align: "right" as const },
        { title: "Margem", x: 733, w: 55, align: "right" as const },
        { title: "Estoque", x: 792, w: 55, align: "right" as const },
        { title: "C. Unit.", x: 851, w: 90, align: "right" as const },
        { title: "Varejo", x: 945, w: 90, align: "right" as const },
        { title: "Atacado", x: 1039, w: 100, align: "right" as const },
      ] : [
        { title: "SKU", x: 30, w: 48, align: "left" as const },
        { title: "Produto", x: 82, w: 142, align: "left" as const },
        { title: "Grupo/Subgrupo", x: 228, w: 88, align: "left" as const },
        { title: "Qtd", x: 320, w: 30, align: "right" as const },
        { title: "Faturamento", x: 354, w: 70, align: "right" as const },
        { title: "Custo", x: 428, w: 64, align: "right" as const },
        { title: "Lucro", x: 496, w: 64, align: "right" as const },
        { title: "Margem", x: 564, w: 44, align: "right" as const },
        { title: "Estoque", x: 612, w: 42, align: "right" as const },
        { title: "C. Unit.", x: 658, w: 46, align: "right" as const },
        { title: "Varejo", x: 708, w: 46, align: "right" as const },
        { title: "Atacado", x: 758, w: 52, align: "right" as const },
      ];

      const drawTableHeader = () => {
        doc
          .rect(tableLeft, y, tableWidth, rowHeight)
          .fillAndStroke("#111827", "#111827");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
        columns.forEach((c) =>
          doc.text(c.title, c.x, y + 6, { width: c.w, align: c.align }),
        );
        y += rowHeight;
      };

      const newPage = () => {
        doc.addPage();
        y = 28;
        drawTitle();
        drawTableHeader();
      };

      drawTitle();
      drawSummary();
      drawTableHeader();

      if (data.length === 0) {
        doc
          .fillColor("#374151")
          .font("Helvetica")
          .fontSize(10)
          .text(
            "Nenhum produto encontrado com os filtros atuais.",
            tableLeft,
            y + 16,
            { width: tableWidth, align: "center" },
          );
      }

      data.forEach((p: any, index: number) => {
        if (y + rowHeight > (currencySettings.mode === "DUAL" ? 780 : 560)) newPage();
        if (index % 2 === 0)
          doc.rect(tableLeft, y, tableWidth, rowHeight).fill("#f9fafb");
        doc.fillColor("#111827").font("Helvetica").fontSize(currencySettings.mode === "DUAL" ? 7 : 7);
        doc.text(p.sku || "-", columns[0].x, y + 6, {
          width: columns[0].w,
          ellipsis: true,
        });
        doc.text(p.name || "-", columns[1].x, y + 6, {
          width: columns[1].w,
          ellipsis: true,
        });
        doc.text(
          `${p.group || "-"} / ${p.subgroup || "-"}`,
          columns[2].x,
          y + 6,
          { width: columns[2].w, ellipsis: true },
        );
        doc.text(String(p.soldQuantity || 0), columns[3].x, y + 6, {
          width: columns[3].w,
          align: "right",
        });
        doc.text(money(p.revenue), columns[4].x, y + 6, {
          width: columns[4].w,
          align: "right",
        });
        doc.text(money(p.cost), columns[5].x, y + 6, {
          width: columns[5].w,
          align: "right",
        });
        doc.fillColor(Number(p.profit || 0) >= 0 ? "#065f46" : "#991b1b");
        doc.text(money(p.profit), columns[6].x, y + 6, {
          width: columns[6].w,
          align: "right",
        });
        doc.fillColor(
          Number(p.marginPercent || 0) >= 0 ? "#065f46" : "#991b1b",
        );
        doc.text(percent(p.marginPercent), columns[7].x, y + 6, {
          width: columns[7].w,
          align: "right",
        });
        doc.fillColor("#111827");
        doc.text(String(p.availableStock || 0), columns[8].x, y + 6, {
          width: columns[8].w,
          align: "right",
        });
        doc.text(money(p.costPrice), columns[9].x, y + 6, {
          width: columns[9].w,
          align: "right",
        });
        doc.text(money(p.salePriceA), columns[10].x, y + 6, {
          width: columns[10].w,
          align: "right",
        });
        doc.text(money(p.salePriceB), columns[11].x, y + 6, {
          width: columns[11].w,
          align: "right",
        });
        y += rowHeight;
      });

      doc.end();
    } catch (error: any) {
      console.error("Products financial PDF error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Erro ao gerar PDF do relatório financeiro de produtos.",
        });
      }
    }
  },
);


router.get(
  "/stock-movements",
  requirePermission("reports", "stock"),
  async (req: AuthRequest, res) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(5000, Math.max(10, Number(req.query.limit || 50)));
      const offset = (page - 1) * limit;
      const dateFrom = String(req.query.dateFrom || "").trim();
      const dateTo = String(req.query.dateTo || "").trim();
      const productId = String(req.query.productId || "").trim();
      const direction = String(req.query.direction || "ALL").trim().toUpperCase();
      const movementType = String(req.query.movementType || "").trim();
      const search = String(req.query.q || "").trim();

      const conditions: any[] = [];
      if (dateFrom) conditions.push(gte(stockMovements.createdAt, dayStartUtc(String(dateFrom))));
      if (dateTo) conditions.push(lte(stockMovements.createdAt, dayEndUtc(String(dateTo))));
      if (productId) conditions.push(eq(stockMovements.productId, productId));
      if (movementType) conditions.push(eq(stockMovements.movementType, movementType));
      if (search) {
        conditions.push(or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(stockMovements.reason, `%${search}%`),
          ilike(stockMovements.notes, `%${search}%`),
        ));
      }

      if (direction === "ENTRY") {
        conditions.push(sql`${stockMovements.afterPhysical} > ${stockMovements.beforePhysical}`);
      } else if (direction === "EXIT") {
        conditions.push(sql`${stockMovements.afterPhysical} < ${stockMovements.beforePhysical}`);
      } else if (direction === "RESERVATION") {
        conditions.push(and(
          sql`${stockMovements.afterPhysical} = ${stockMovements.beforePhysical}`,
          sql`${stockMovements.afterReserved} > ${stockMovements.beforeReserved}`,
        ));
      } else if (direction === "RELEASE") {
        conditions.push(and(
          sql`${stockMovements.afterPhysical} = ${stockMovements.beforePhysical}`,
          sql`${stockMovements.afterReserved} < ${stockMovements.beforeReserved}`,
        ));
      } else if (direction === "ADJUSTMENT") {
        conditions.push(eq(stockMovements.movementType, "MANUAL_ADJUSTMENT"));
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      const baseSelect = {
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        sku: products.sku,
        movementType: stockMovements.movementType,
        referenceId: stockMovements.referenceId,
        quantity: stockMovements.quantity,
        beforePhysical: stockMovements.beforePhysical,
        afterPhysical: stockMovements.afterPhysical,
        beforeReserved: stockMovements.beforeReserved,
        afterReserved: stockMovements.afterReserved,
        reason: stockMovements.reason,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
        userName: users.name,
      };

      const [rows, countRows, summaryRows, typeRows] = await Promise.all([
        db.select(baseSelect)
          .from(stockMovements)
          .innerJoin(products, eq(stockMovements.productId, products.id))
          .leftJoin(users, eq(stockMovements.userId, users.id))
          .where(whereClause)
          .orderBy(desc(stockMovements.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(stockMovements)
          .innerJoin(products, eq(stockMovements.productId, products.id))
          .where(whereClause),
        db.select({
          movements: sql<number>`count(*)`,
          entries: sql<number>`coalesce(sum(case when ${stockMovements.afterPhysical} > ${stockMovements.beforePhysical} then ${stockMovements.afterPhysical} - ${stockMovements.beforePhysical} else 0 end), 0)`,
          exits: sql<number>`coalesce(sum(case when ${stockMovements.afterPhysical} < ${stockMovements.beforePhysical} then ${stockMovements.beforePhysical} - ${stockMovements.afterPhysical} else 0 end), 0)`,
          reservations: sql<number>`coalesce(sum(case when ${stockMovements.afterReserved} > ${stockMovements.beforeReserved} then ${stockMovements.afterReserved} - ${stockMovements.beforeReserved} else 0 end), 0)`,
          releases: sql<number>`coalesce(sum(case when ${stockMovements.afterReserved} < ${stockMovements.beforeReserved} then ${stockMovements.beforeReserved} - ${stockMovements.afterReserved} else 0 end), 0)`,
        })
          .from(stockMovements)
          .innerJoin(products, eq(stockMovements.productId, products.id))
          .where(whereClause),
        db.selectDistinct({ movementType: stockMovements.movementType })
          .from(stockMovements)
          .orderBy(stockMovements.movementType),
      ]);

      const data = rows.map((row) => {
        const physicalDelta = Number(row.afterPhysical) - Number(row.beforePhysical);
        const reservedDelta = Number(row.afterReserved) - Number(row.beforeReserved);
        let movementDirection = "NO_CHANGE";
        if (physicalDelta > 0) movementDirection = "ENTRY";
        else if (physicalDelta < 0) movementDirection = "EXIT";
        else if (reservedDelta > 0) movementDirection = "RESERVATION";
        else if (reservedDelta < 0) movementDirection = "RELEASE";
        return { ...row, physicalDelta, reservedDelta, direction: movementDirection };
      });

      const summary = summaryRows[0] || {} as any;
      res.json({
        data,
        page,
        limit,
        total: Number(countRows[0]?.count || 0),
        summary: {
          movements: Number(summary.movements || 0),
          entries: Number(summary.entries || 0),
          exits: Number(summary.exits || 0),
          reservations: Number(summary.reservations || 0),
          releases: Number(summary.releases || 0),
        },
        movementTypes: typeRows.map((row) => row.movementType).filter(Boolean),
      });
    } catch (error: any) {
      console.error("Stock movements report error:", error);
      res.status(500).json({ error: "Erro ao carregar a movimentação de produtos." });
    }
  },
);

export default router;
