import { Router } from "express";
import { db } from "../db";
import { sales, saleItems, products, customers, users, companySettings, printLogs, emailLogs, emailSettings, productSerials, saleItemLots } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, and, inArray, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { loadImageBuffer } from "./pdfHelpers";
import { formatServerCurrency, getServerCurrencySettings } from "./currency";

const router = Router();
router.use(requireAuth);

let companySettingsCompatReady = false;
async function ensureCompanySettingsCompat() {
  if (companySettingsCompatReady) return;
  await db.execute(sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'RUC'`);
  companySettingsCompatReady = true;
}

async function getReceiptData(saleId: string) {
  await ensureCompanySettingsCompat();
  const saleData = await db.select({
      id: sales.id,
      number: sales.number,
      series: sales.series,
      createdAt: sales.createdAt,
      orderStatus: sales.orderStatus,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      subtotalAmount: sales.subtotalAmount,
      discountAmount: sales.discountAmount,
      ivaAmount: sales.ivaAmount,
      totalAmount: sales.totalAmount,
      currency: sales.currency,
      observations: sales.observations
  }).from(sales).where(eq(sales.id, saleId)).limit(1);

  if (!saleData.length) throw new Error("Venda não encontrada.");
  const sale = saleData[0];

  const sItems = await db.select({
      id: saleItems.id,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      discountAmount: saleItems.discountAmount,
      ivaAmount: saleItems.ivaAmount,
      totalPrice: saleItems.totalPrice,
      product: {
          name: products.name,
          sku: products.sku,
          upc: products.upc
      }
  }).from(saleItems)
  .leftJoin(products, eq(saleItems.productId, products.id))
  .where(eq(saleItems.saleId, saleId));

  // get serials if any
  const sis = sItems.map(i => i.id);
  let saleSerials: any[] = [];
  let saleLots: any[] = [];
  if (sis.length > 0) {
      saleSerials = await db.select({
          saleItemId: productSerials.saleItemId,
          serialNumber: productSerials.serialNumber
      }).from(productSerials).where(and(inArray(productSerials.saleItemId, sis), eq(productSerials.status, 'SOLD')));
      saleLots = await db.select({
          saleItemId: saleItemLots.saleItemId,
          lotNumber: saleItemLots.lotNumber,
          quantity: saleItemLots.quantity
      }).from(saleItemLots).where(inArray(saleItemLots.saleItemId, sis));
  }

  const items = sItems.map(si => ({
      ...si,
      serials: saleSerials.filter(s => s.saleItemId === si.id).map(s => s.serialNumber),
      lots: saleLots.filter(l => l.saleItemId === si.id).map(l => ({ lotNumber: l.lotNumber, quantity: l.quantity }))
  }));

  const customerObj = await db.select().from(sales).leftJoin(customers, eq(sales.customerId, customers.id)).where(eq(sales.id, saleId)).limit(1);
  const userObj = await db.select().from(sales).leftJoin(users, eq(sales.userId, users.id)).where(eq(sales.id, saleId)).limit(1);
  const company = await db.select().from(companySettings).limit(1);
  const currencySettings = await getServerCurrencySettings(company[0]?.defaultCurrency);

  return {
    sale,
    items,
    customer: customerObj[0]?.customers || null,
    user: userObj[0]?.users || null,
    company: company[0] || null,
    currencySettings
  };
}

const getCompanyDocumentLabel = (company: any) => `${company?.documentType || "RUC"}: ${company?.documentNumber || "N/D"}`;

async function generateA4Doc(doc: typeof PDFDocument.prototype, saleData: any) {
   const { sale, items, customer, user, company, currencySettings } = saleData;
   const money = (value: unknown, separator = currencySettings?.mode === "DUAL" ? "\n" : " / ") =>
      formatServerCurrency(value, currencySettings, separator);

   const pageX = 30;
   const pageWidth = 535;
   const headerY = 30;
   const generatedDate = new Date().toLocaleDateString("pt-BR");
   const saleCode = `${sale.series}-${String(sale.number).padStart(6, "0")}`;
   const companyName = company?.tradeName || company?.companyName || "Sua loja";
   const companyLines = [
      getCompanyDocumentLabel(company),
      company?.phone ? `Tel: ${company.phone}` : "Tel: N/D",
      company?.email ? `Email: ${company.email}` : "Email: N/D",
      [company?.address, company?.city].filter(Boolean).join(" - ")
   ].filter(Boolean);

   const logoBuffer = await loadImageBuffer(company?.logoUrl || undefined);
   doc.fillColor("#000");

   // Cabeçalho A4 padronizado com o orçamento: logo à esquerda, dados ao lado e data à direita.
   if (logoBuffer) {
      try {
         doc.image(logoBuffer, pageX, headerY, { fit: [54, 54] });
      } catch {
         doc.fontSize(10).font("Helvetica-Bold").text(companyName, pageX, headerY, { width: 54, align: "center" });
      }
   } else {
      doc.fontSize(10).font("Helvetica-Bold").text(companyName, pageX, headerY + 14, { width: 54, align: "center" });
   }

   const companyX = pageX + 66;
   const rightX = pageX + pageWidth - 110;
   doc.fontSize(13).font("Helvetica-Bold").text(companyName, companyX, headerY + 2, { width: 300, lineGap: 0 });
   doc.fontSize(8).font("Helvetica");
   let infoY = doc.y + 1;
   for (const line of companyLines) {
      doc.text(line, companyX, infoY, { width: 330, lineGap: 1 });
      infoY = doc.y + 1;
   }

   doc.fontSize(7.5).font("Helvetica").text("Gerado em", rightX, headerY + 4, { width: 110, align: "right" });
   doc.fontSize(8).font("Helvetica-Bold").text(generatedDate, rightX, doc.y, { width: 110, align: "right" });
   doc.fontSize(7.5).font("Helvetica").text("Venda", rightX, doc.y + 4, { width: 110, align: "right" });
   doc.fontSize(8).font("Helvetica-Bold").text(saleCode, rightX, doc.y, { width: 110, align: "right" });

   doc.y = headerY + 66;
   doc.moveTo(pageX, doc.y).lineTo(pageX + pageWidth, doc.y).strokeColor("#d1d5db").lineWidth(1).stroke();
   doc.strokeColor("#000").lineWidth(1);
   doc.y += 10;

   doc.fillColor("#000").fontSize(14).font("Helvetica-Bold").text("RECIBO INTERNO / ROMANEIO DE VENDA", pageX, doc.y, { align: "center", width: pageWidth });
   doc.y += 20;

   const yInfo = doc.y;
   doc.fontSize(10).font("Helvetica-Bold").text("Venda:", 30, yInfo);
   doc.font("Helvetica").text(saleCode, 70, yInfo);
   
   doc.font("Helvetica-Bold").text("Data:", 200, yInfo);
   doc.font("Helvetica").text(`${new Date(sale.createdAt!).toLocaleDateString()}`, 235, yInfo);
   
   doc.font("Helvetica-Bold").text("Vendedor:", 350, yInfo);
   doc.font("Helvetica").text(`${user?.name || "N/D"}`, 410, yInfo);
   doc.moveDown(0.5);

   const yCust = doc.y;
   doc.font("Helvetica-Bold").text("Cliente:", 30, yCust);
   doc.font("Helvetica").text(`${customer?.name || "Consumidor Final"}`, 75, yCust);
   
   doc.font("Helvetica-Bold").text("Documento:", 350, yCust);
   if (customer?.document) {
       doc.font("Helvetica").text(`${customer.documentType || 'Doc'} ${customer.document}`, 420, yCust);
   } else {
       doc.font("Helvetica").text(`N/D`, 420, yCust);
   }
   doc.moveDown(1.4);

   // Table Header
   doc.font("Helvetica-Bold");
   const tY = doc.y;
   doc.text("SKU", 30, tY, { width: 65 });
   doc.text("Produto", 95, tY, { width: 180 });
   doc.text("Qtd", 275, tY, { width: 30, align: 'center' });
   doc.text("Unitário", 305, tY, { width: 85, align: 'right' });
   doc.text("Frete", 390, tY, { width: 80, align: 'right' });
   doc.text("Total", 470, tY, { width: 95, align: 'right' });
   
   doc.y = tY + 16;
   doc.rect(30, doc.y, 535, 1).fill("#e5e7eb");
   doc.y += 6;
   
   doc.fillColor("#000").font("Helvetica");
   for (const it of items) {
      const rowY = doc.y;
      const metaParts: string[] = [];
      if (it.serials && it.serials.length > 0) metaParts.push(`S/N: ${it.serials.join(", ")}`);
      if (it.lots && it.lots.length > 0) {
         metaParts.push(`Lote: ${it.lots.map((lot: any) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")}`);
      }
      const hasMeta = metaParts.length > 0;
      const rowHeight = currencySettings?.mode === "DUAL" ? (hasMeta ? 33 : 28) : (hasMeta ? 24 : 18);
      doc.fontSize(currencySettings?.mode === "DUAL" ? 7.5 : 9);
      doc.text(it.product!.sku, 30, rowY, { width: 65, height: rowHeight, ellipsis: true });
      doc.text(it.product!.name, 95, rowY, { width: 180, height: 10, ellipsis: true });
      if (hasMeta) {
         doc.fontSize(7).fillColor("#555").text(metaParts.join(" | "), 95, rowY + 10, { width: 280, height: 11, ellipsis: true });
         doc.fillColor("#000").fontSize(currencySettings?.mode === "DUAL" ? 7.5 : 9);
      }
      doc.text(String(it.quantity), 275, rowY, { width: 30, align: 'center' });
      doc.text(money(it.unitPrice), 305, rowY, { width: 85, align: 'right' });
      doc.text(money(it.ivaAmount), 390, rowY, { width: 80, align: 'right' });
      doc.text(money(it.totalPrice), 470, rowY, { width: 95, align: 'right' });
      doc.y = rowY + rowHeight;
      doc.fillColor("#000");
   }
   doc.fontSize(10);
   doc.moveDown(2);
   doc.rect(30, doc.y, 535, 1).fill("#e5e7eb").moveDown(1);

   // Totals
   doc.fillColor("#000").font("Helvetica-Bold");
   const labelX = 315;
   const valueX = 420;
   const valueWidth = 145;
   const totalStep = currencySettings?.mode === "DUAL" ? 26 : 16;
   
   let totalsY = doc.y;
   doc.text("Subtotal", labelX, totalsY, { width: 100, align: 'right' });
   doc.text(money(sale.subtotalAmount), valueX, totalsY, { width: valueWidth, align: 'right' });
   totalsY += totalStep;
   
   if (Number(sale.discountAmount) > 0) {
      doc.text("Desconto", labelX, totalsY, { width: 100, align: 'right' });
      doc.text(money(sale.discountAmount), valueX, totalsY, { width: valueWidth, align: 'right' });
      totalsY += totalStep;
   }
   
   if (Number(sale.ivaAmount) > 0) {
      doc.text("Frete", labelX, totalsY, { width: 100, align: 'right' });
      doc.text(money(sale.ivaAmount), valueX, totalsY, { width: valueWidth, align: 'right' });
      totalsY += totalStep;
   }
   
   totalsY += 8;
   doc.fontSize(12);
   doc.text("Total", labelX, totalsY, { width: 100, align: 'right' });
   doc.text(money(sale.totalAmount), valueX, totalsY, { width: valueWidth, align: 'right' });
   doc.fontSize(10);
   
   doc.y = totalsY + 30;
   doc.fontSize(8).font("Helvetica-Oblique").text("Documento interno de controle da loja. Não substitui documento fiscal oficial quando exigido pela legislação aplicável.", 30, doc.y, { align: "center", width: 535 });
}

const safeBudgetText = (value: unknown, fallback = "") => {
  const text = String(value ?? fallback).replace(/\s+/g, " ").trim();
  return text || fallback;
};

const budgetNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

router.post("/budget/pdf", requirePermission("sales", "create"), async (req: AuthRequest, res) => {
  try {
    await ensureCompanySettingsCompat();
    const body = req.body || {};
    const companyRows = await db.select().from(companySettings).limit(1);
    const company = companyRows[0] || null;
    const currencySettings = await getServerCurrencySettings(company?.defaultCurrency);
    const money = (value: unknown) => formatServerCurrency(value, currencySettings, " | ");
    const items = Array.isArray(body.items)
      ? body.items.slice(0, 120).map((item: any) => ({
          name: safeBudgetText(item?.name, "Produto"),
          quantity: Math.max(0, budgetNumber(item?.quantity)),
          unitPrice: budgetNumber(item?.unitPrice),
          totalPrice: budgetNumber(item?.totalPrice),
        })).filter((item: any) => item.quantity > 0)
      : [];

    if (!items.length) {
      res.status(400).json({ error: "Adicione produtos para gerar o orçamento." });
      return;
    }

    const customerLabel = safeBudgetText(body.customerLabel, "Cliente padrão");
    const subtotal = budgetNumber(body.subtotal);
    const discountAmount = budgetNumber(body.discountAmount);
    const freight = budgetNumber(body.freight);
    const grandTotal = budgetNumber(body.grandTotal);
    const companyName = company?.tradeName || company?.companyName || "Empresa";
    const companyLines = [
      company?.documentNumber ? `${company?.documentType || "RUC"}: ${company.documentNumber}` : "",
      company?.phone ? `Tel: ${company.phone}` : "",
      company?.email ? `Email: ${company.email}` : "",
      [company?.address, company?.city].filter(Boolean).join(" - "),
    ].filter(Boolean);

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="orcamento_${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    doc.pipe(res);

    const pageX = 30;
    const pageWidth = 535;
    const headerY = 30;
    const logoBuffer = await loadImageBuffer(company?.logoUrl || undefined);

    doc.fillColor("#000");
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, pageX, headerY, { fit: [48, 48] });
      } catch {
        doc.fontSize(9).font("Helvetica-Bold").text(companyName, pageX, headerY + 12, { width: 48, align: "center" });
      }
    } else {
      doc.fontSize(9).font("Helvetica-Bold").text(companyName, pageX, headerY + 12, { width: 48, align: "center" });
    }

    const companyX = pageX + 62;
    const rightX = pageX + pageWidth - 110;
    doc.fontSize(13).font("Helvetica-Bold").text(companyName, companyX, headerY + 2, { width: 300 });
    doc.fontSize(8).font("Helvetica");
    let infoY = doc.y + 1;
    for (const line of companyLines) {
      doc.text(line, companyX, infoY, { width: 330, lineGap: 1 });
      infoY = doc.y + 1;
    }

    doc.fontSize(7.5).font("Helvetica").text("Gerado em", rightX, headerY + 4, { width: 110, align: "right" });
    doc.fontSize(8).font("Helvetica-Bold").text(new Date().toLocaleDateString("pt-BR"), rightX, doc.y, { width: 110, align: "right" });

    doc.y = headerY + 62;
    doc.moveTo(pageX, doc.y).lineTo(pageX + pageWidth, doc.y).strokeColor("#d1d5db").lineWidth(1).stroke();
    doc.strokeColor("#000").lineWidth(1);
    doc.y += 12;

    doc.fontSize(15).font("Helvetica-Bold").fillColor("#000").text("RESUMO DO ORÇAMENTO", pageX, doc.y, { align: "center", width: pageWidth });
    doc.y += 20;

    const metaY = doc.y;
    doc.fontSize(8).font("Helvetica-Bold").text("CLIENTE", pageX, metaY);
    doc.fontSize(10).font("Helvetica-Bold").text(customerLabel, pageX, metaY + 12, { width: 290 });
    doc.fontSize(8).font("Helvetica").text("Orçamento gerado no PDV", rightX - 45, metaY + 2, { width: 155, align: "right" });
    doc.y = metaY + 34;

    for (const item of items) {
      if (doc.y > 725) doc.addPage();
      const rowY = doc.y;
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#000").text(item.name, pageX, rowY, { width: 340, height: 12, ellipsis: true });
      doc.fontSize(9).font("Helvetica-Bold").text(money(item.totalPrice), pageX + 365, rowY, { width: 170, align: "right" });
      doc.fontSize(8).font("Helvetica").text(`${item.quantity} x ${money(item.unitPrice)}`, pageX, rowY + 13, { width: 300 });
      doc.moveTo(pageX, rowY + 28).lineTo(pageX + pageWidth, rowY + 28).strokeColor("#e5e7eb").lineWidth(1).stroke();
      doc.strokeColor("#000");
      doc.y = rowY + 34;
    }

    doc.y += 8;
    if (doc.y > 670) doc.addPage();
    const labelX = pageX + 305;
    const valueX = pageX + 410;
    const valueWidth = 125;
    const summaryRows = [
      ["Subtotal", subtotal],
      ["Desconto", discountAmount],
      ["Frete", freight],
    ] as const;
    doc.fontSize(8.5).font("Helvetica").fillColor("#000");
    for (const [label, value] of summaryRows) {
      const rowY = doc.y;
      doc.font("Helvetica").text(label, labelX, rowY, { width: 100 });
      doc.font("Helvetica-Bold").text(money(value), valueX, rowY, { width: valueWidth, align: "right" });
      doc.y = rowY + 16;
    }
    doc.y += 6;
    const totalY = doc.y;
    doc.fontSize(13).font("Helvetica-Bold").text("Total", labelX, totalY, { width: 100 });
    doc.text(money(grandTotal), valueX, totalY, { width: valueWidth, align: "right" });
    doc.y = totalY + 22;

    doc.fontSize(7.5).font("Helvetica").fillColor("#444").text(
      "Orçamento sem valor fiscal. Valores sujeitos a confirmação no fechamento da venda.",
      pageX,
      doc.y + 26,
      { width: pageWidth, align: "center" },
    );
    doc.end();
  } catch (error: any) {
    console.error("Erro ao gerar orçamento em PDF:", error);
    res.status(500).json({ error: error.message || "Erro ao gerar PDF do orçamento." });
  }
});

router.get("/:id/receipt", requirePermission("receipt", "view"), async (req: AuthRequest, res) => {
  try {
     const data = await getReceiptData(req.params.id);
     res.json(data);
  } catch(error: any) {
     res.status(404).json({ error: "Erro ao carregar recibo", details: error.message });
  }
});

router.get("/:id/receipt/pdf", requirePermission("receipt", "download"), async (req: AuthRequest, res) => {
  try {
    const { format, action = 'download' } = req.query; // format: a4 or thermal, action: download or print
    const data = await getReceiptData(req.params.id);
    const { sale, items, customer, user, company, currencySettings } = data;
    const money = (value: unknown) => formatServerCurrency(value, currencySettings, currencySettings.mode === "DUAL" ? "\n" : " / ");

    const doc = new PDFDocument({
       margin: format === 'thermal' ? 10 : 30,
       size: format === 'thermal' ? [226.77, 800] : 'A4' // 80mm width ≈ 226.77 pt
    });
    
    // allow longer doc for thermal
    // PDFKit auto-adds pages if we don't set continuous, but thermal is usually one long strip or roll.
    // For simplicity, we just use arbitrary height and let it page if needed. Real thermal roll doesn't care about page breaks mostly.

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="recibo_${sale.series}-${sale.number}.pdf"`);
    doc.pipe(res);

    if (format === 'thermal') {
       const logoBuffer = await loadImageBuffer(company?.logoUrl || undefined);
       if (logoBuffer) {
           try {
               const startY = doc.y;
               doc.image(logoBuffer, (226.77 - 64) / 2, startY, { fit: [64, 58], align: 'center' });
               doc.y = startY + 66;
           } catch (e) {
               doc.fontSize(12).font("Helvetica-Bold").text(company?.tradeName || company?.companyName || "Sua loja", { align: "center" });
               doc.moveDown(0.5);
           }
       } else {
           doc.fontSize(12).font("Helvetica-Bold").text(company?.tradeName || company?.companyName || "Sua loja", { align: "center" });
           doc.moveDown(0.5);
       }
       doc.fontSize(8).font("Helvetica").text(`${getCompanyDocumentLabel(company)} | Tel: ${company?.phone || "N/D"}`, { align: "center" });
       doc.moveDown(1);
       
       doc.fontSize(10).font("Helvetica-Bold").text("RECIBO INTERNO", { align: "center" });
       doc.fontSize(8).font("Helvetica").text(`Venda: ${sale.series}-${String(sale.number).padStart(6,'0')}`, { align: "center" });
       doc.text(`Cliente: ${customer?.name || "Consumidor Final"}`, { align: "center" });
       doc.moveDown(1);
       
       doc.font("Helvetica-Bold").text("ITENS", { underline: true });
       doc.font("Helvetica");
       for (const it of items) {
          doc.text(`${String(it.quantity)}x ${it.product!.sku} - ${it.product!.name}`);
          const metaParts: string[] = [];
          if (it.serials && it.serials.length > 0) metaParts.push(`S/N: ${it.serials.join(", ")}`);
          if (it.lots && it.lots.length > 0) metaParts.push(`Lote: ${it.lots.map((lot: any) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")}`);
          if (metaParts.length) {
             doc.fontSize(7).text(metaParts.join(" | "));
             doc.fontSize(8);
          }
          doc.text(`${money(it.unitPrice)}\nTotal: ${money(it.totalPrice)}`, { align: "right" });
       }
       doc.moveDown(1);
       
       doc.font("Helvetica-Bold");
       if (Number(sale.discountAmount) > 0) doc.text(`Desc.: ${money(sale.discountAmount)}`, { align: "right" });
       doc.fontSize(10).text(`TOTAL: ${money(sale.totalAmount)}`, { align: "right" });
       
       doc.fontSize(8).font("Helvetica").moveDown(2);
       doc.text("Documento interno. Não tem valor fiscal.", { align: "center" });
       
    } else {
       await generateA4Doc(doc, data);
    }

    doc.end();

    await db.insert(printLogs).values({
       saleId: sale.id,
       format: format === 'thermal' ? 'THERMAL' : 'A4',
       printedBy: req.user!.userId,
       notes: action === 'print' ? 'PRINT_REQUEST' : 'PDF_DOWNLOAD'
    });

  } catch(error: any) {
     res.status(500).json({ error: "Erro ao gerar PDF do recibo", details: error.message });
  }
});

router.post("/:id/receipt/email", requirePermission("receipt", "email"), async (req: AuthRequest, res) => {
  try {
     const { email } = req.body;
     if (!email) throw new Error("E-mail não informado.");
     
     const saleData = await getReceiptData(req.params.id);
     const sale = saleData.sale;
     const storeName = saleData.company?.tradeName || saleData.company?.companyName || "Sua loja";
     
     const es = await db.select().from(emailSettings).limit(1);
     if (!es.length) throw new Error("Configure o SMTP em Configurações > E-mail da empresa antes de enviar recibos.");
     const conf = es[0];

     const transporter = nodemailer.createTransport({
       host: conf.host,
       port: conf.port,
       secure: conf.port === 465,
       auth: { user: conf.user, pass: conf.password },
       tls: conf.useTls ? { rejectUnauthorized: false } : undefined
     });

     // Generate PDF memory buffer to attach
     const doc = new PDFDocument({ margin: 30, size: 'A4' });
     const buffers: any[] = [];
     doc.on('data', buffers.push.bind(buffers));
     
     await generateA4Doc(doc, saleData);
     
     doc.end();

     const pdfData = await new Promise((resolve) => {
        doc.on('end', () => {
           resolve(Buffer.concat(buffers));
        });
     });

     const filename = `recibo_${sale.series}-${sale.number}.pdf`;
     
     try {
       await transporter.sendMail({
          from: `"${conf.fromName}" <${conf.fromEmail}>`,
          to: email,
          subject: `Recibo ${storeName} - Venda ${sale.series}-${String(sale.number).padStart(6,'0')}`,
          text: `Olá,\n\nSegue em anexo o recibo da venda ${sale.series}-${String(sale.number).padStart(6,'0')}.\n\nObrigado por comprar conosco!\n\n${storeName}`,
          attachments: [
            {
               filename,
               content: pdfData as Buffer
            }
          ]
       });
       
       await db.insert(emailLogs).values({
          saleId: sale.id,
          recipientEmail: email,
          subject: `Recibo ${storeName} - Venda ${sale.series}-${String(sale.number).padStart(6,'0')}`,
          status: 'SENT',
          sentBy: req.user!.userId
       });
       
       res.json({ success: true });
     } catch (mailError: any) {
        await db.insert(emailLogs).values({
          saleId: sale.id,
          recipientEmail: email,
          subject: `Recibo ${storeName} - Venda ${sale.series}-${String(sale.number).padStart(6,'0')}`,
          status: 'FAILED',
          errorMessage: mailError.message,
          sentBy: req.user!.userId
       });
       throw mailError;
     }

  } catch(error: any) {
     res.status(500).json({ error: "Erro ao enviar e-mail", details: error.message });
  }
});

export default router;
