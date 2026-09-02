import { Router } from "express";
import { db } from "../db";
import { purchaseOrders, purchaseOrderItems, purchaseOrderSerials, products, stockBalances, stockMovements, productSerials, auditLogs, suppliers, purchaseOcrJobs, supplierInvoiceFiles } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, ilike, or, and, isNull, desc } from "drizzle-orm";
import multer from "multer";
import { processInvoiceOcr } from "./ocrService";
import { addLotStock } from "./lots";
import { createPayableForPurchase } from "./payables";
import { resolveRates } from "./fx";
import { isValidCurrency } from "../lib/currency";
import { addCostLayer } from "./costLayers";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() }); // for spreadsheets
import xlsx from "xlsx";
import Papa from "papaparse";

// Import Spreadsheet
router.post("/import/spreadsheet", requirePermission("purchase", "import"), upload.single("file"), async (req: AuthRequest, res) => {
  try {
     if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
     
     const ext = req.file.originalname.split(".").pop()?.toLowerCase();
     let rawData: any[] = [];
     
     if (ext === "csv") {
         const csv = req.file.buffer.toString("utf-8");
         const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
         rawData = parsed.data as any[];
     } else if (ext === "xlsx") {
         const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
         const sheetName = workbook.SheetNames[0];
         rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
     } else {
         return res.status(400).json({ error: "Formato de arquivo inválido. Apenas .csv e .xlsx são suportados" });
     }
     
     // basic mapping
     const mapped = rawData.map(r => {
        const row: any = {};
        for(let key in r) {
           row[key.toUpperCase()] = r[key];
        }
        return {
           sku: row.SKU || "",
           upc: row.UPC || "",
           productName: row.PRODUTO || "",
           brand: row.MARCA || "",
           model: row.MODELO || "",
           group: row.GRUPO || "",
           subgroup: row.SUBGRUPO || "",
           shelf: row.PRATELEIRA || "",
           quantity: Number(row.QUANTIDADE) || 0,
           costPrice: Number(row.CUSTO) || 0,
           salePriceA: Number(row.PRECO_A) || 0,
           salePriceB: Number(row.PRECO_B) || 0,
           hasSerialNumber: String(row.CONTROLA_SN).toUpperCase() === "SIM" || String(row.CONTROLA_SN).toUpperCase() === "TRUE" || String(row.CONTROLA_SN) === "1",
           serials: row.SERIAIS ? String(row.SERIAIS).split(",").map(s => s.trim()) : []
        };
     });

     res.json({ data: mapped });
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao ler planilha", details: e.message });
  }
});

// OCR Import Route
router.post("/ocr", requirePermission("purchase", "ocr"), upload.single("file"), async (req: AuthRequest, res) => {
  const jobId = uuidv4();
  
  try {
     if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
     }
     
     const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
     if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Formato de arquivo inválido. Formatos suportados: JPG, JPEG, PNG, WEBP, PDF." });
     }
     
     // Vercel Functions aceitam no maximo 4,5 MB por request; usamos 4 MB para
     // rejeitar de forma previsivel antes do proxy da plataforma.
     const maxBytes = 4 * 1024 * 1024;
     if (req.file.size > maxBytes) {
        return res.status(400).json({ error: "O tamanho do arquivo excede o limite de 4 MB." });
     }

     // Persistencia serverless: o arquivo fica no Postgres em data URL, nao em disco efemero.
     // Leitura/limpeza abaixo continua aceitando caminhos /uploads/ de instalacoes antigas.
     const persistentFilePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

     // Create pending ocr job
     await db.insert(purchaseOcrJobs).values({
        id: jobId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: persistentFilePath,
        status: "PROCESSING",
        createdBy: req.user?.userId || null,
     });
     
     const lang = (req.body.language || "pt") as string;
     
     // Run OCR (Ollama para imagens; fallback legado apenas para PDF)
     const ocrResult = await processInvoiceOcr(req.file.buffer, req.file.mimetype, lang);
     
     // Update job as completed
     await db.update(purchaseOcrJobs).set({
        status: "COMPLETED",
        rawText: ocrResult.rawText || "",
        parsedJson: JSON.stringify(ocrResult),
        completedAt: new Date(),
     }).where(eq(purchaseOcrJobs.id, jobId));
     
     res.json({
        jobId,
        ...ocrResult
     });
     
  } catch (err: any) {
     console.error("OCR Route error:", err);
     
     // If a job was created, mark it as failed
     try {
        const [jobExists] = await db.select().from(purchaseOcrJobs).where(eq(purchaseOcrJobs.id, jobId)).limit(1);
        if (jobExists) {
           await db.update(purchaseOcrJobs).set({
              status: "FAILED",
              errorMessage: err.message || "Erro desconhecido durante o processamento OCR.",
              completedAt: new Date(),
           }).where(eq(purchaseOcrJobs.id, jobId));
        } else {
           // insert as failed job directly
           await db.insert(purchaseOcrJobs).values({
              id: jobId,
              fileName: req.file ? req.file.originalname : "unknown",
              fileType: req.file ? req.file.mimetype : "unknown",
              fileSize: req.file ? req.file.size : 0,
              status: "FAILED",
              errorMessage: err.message || "Erro durante o upload/processamento.",
              createdBy: req.user?.userId || null,
              completedAt: new Date(),
           });
        }
     } catch (dbErr) {
        console.error("Failed to update failing job in DB", dbErr);
     }
     
     res.status(500).json({ error: err.message || "Falha ao processar o arquivo via OCR." });
  }
});

// GET OCR jobs history route
router.get("/ocr/jobs", requirePermission("purchase", "view"), async (req: AuthRequest, res) => {
  try {
     const list = await db.select({
         id: purchaseOcrJobs.id,
         fileName: purchaseOcrJobs.fileName,
         fileType: purchaseOcrJobs.fileType,
         fileSize: purchaseOcrJobs.fileSize,
         filePath: purchaseOcrJobs.filePath,
         status: purchaseOcrJobs.status,
         rawText: purchaseOcrJobs.rawText,
         errorMessage: purchaseOcrJobs.errorMessage,
         createdAt: purchaseOcrJobs.createdAt,
         completedAt: purchaseOcrJobs.completedAt,
         purchaseId: purchaseOrders.id,
         purchaseStatus: purchaseOrders.status,
     })
     .from(purchaseOcrJobs)
     .leftJoin(purchaseOrders, eq(purchaseOcrJobs.id, purchaseOrders.ocrJobId))
     .orderBy(desc(purchaseOcrJobs.createdAt));

     res.json({ data: list });
  } catch (err: any) {
     res.status(500).json({ error: "Erro ao buscar histórico de OCR", details: err.message });
  }
});

// GET OCR job details
router.get("/ocr/jobs/:id", requirePermission("purchase", "view"), async (req: AuthRequest, res) => {
  try {
     const list = await db.select({
         id: purchaseOcrJobs.id,
         fileName: purchaseOcrJobs.fileName,
         fileType: purchaseOcrJobs.fileType,
         fileSize: purchaseOcrJobs.fileSize,
         filePath: purchaseOcrJobs.filePath,
         status: purchaseOcrJobs.status,
         rawText: purchaseOcrJobs.rawText,
         parsedJson: purchaseOcrJobs.parsedJson,
         errorMessage: purchaseOcrJobs.errorMessage,
         createdAt: purchaseOcrJobs.createdAt,
         completedAt: purchaseOcrJobs.completedAt,
         purchaseId: purchaseOrders.id,
         purchaseStatus: purchaseOrders.status,
     })
     .from(purchaseOcrJobs)
     .leftJoin(purchaseOrders, eq(purchaseOcrJobs.id, purchaseOrders.ocrJobId))
     .where(eq(purchaseOcrJobs.id, req.params.id))
     .limit(1);

     if (!list.length) {
        return res.status(404).json({ error: "Trabalho OCR não encontrado" });
     }
     const job = list[0];
     
     let parsed = null;
     if (job.parsedJson) {
        try {
           parsed = JSON.parse(job.parsedJson);
        } catch (e) {
           console.error("Failed to parse OCR parsed_json", e);
        }
     }

     res.json({
        id: job.id,
        fileName: job.fileName,
        fileType: job.fileType,
        fileSize: job.fileSize,
        filePath: job.filePath,
        status: job.status,
        rawText: job.rawText,
        parsedJson: parsed,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        purchaseId: job.purchaseId,
        purchaseStatus: job.purchaseStatus
     });
  } catch (err: any) {
     res.status(500).json({ error: "Erro ao carregar detalhes do trabalho OCR", details: err.message });
  }
});

// DELETE OCR job history record and file
router.delete("/ocr/jobs/:id", requirePermission("purchase", "ocr"), async (req: AuthRequest, res) => {
  try {
     const jobId = req.params.id;
     const [job] = await db.select().from(purchaseOcrJobs).where(eq(purchaseOcrJobs.id, jobId)).limit(1);
     if (!job) {
        return res.status(404).json({ error: "Trabalho OCR não encontrado" });
     }

     // Compatibilidade com OCRs antigos salvos no filesystem. Novos arquivos ficam no Postgres.
     if (job.filePath && String(job.filePath).startsWith("/uploads/")) {
        const localPath = path.join(process.cwd(), String(job.filePath).replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
           try {
              fs.unlinkSync(localPath);
           } catch (e: any) {
              console.error(`Failed to delete physical file: ${localPath}`, e);
           }
        }
     }

     // Delete database record
     await db.delete(purchaseOcrJobs).where(eq(purchaseOcrJobs.id, jobId));

     res.json({ success: true, message: "Histórico OCR excluído com sucesso." });
  } catch (err: any) {
     res.status(500).json({ error: "Erro ao excluir histórico de OCR", details: err.message });
  }
});


async function attachOcrInvoiceToSupplier(tx: any, data: any, purchaseOrderId: string, userId?: string) {
    if (!data?.supplierId || !data?.ocrJobId) return;

    const [job] = await tx.select().from(purchaseOcrJobs).where(eq(purchaseOcrJobs.id, data.ocrJobId)).limit(1);
    if (!job || !job.filePath) return;

    const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
    const [existing] = await tx.select().from(supplierInvoiceFiles).where(eq(supplierInvoiceFiles.ocrJobId, data.ocrJobId)).limit(1);

    let persistentFilePath = job.filePath;
    // Migra transparentemente anexos OCR legados do filesystem para o formato persistente em DB.
    if (String(job.filePath).startsWith("/uploads/")) {
      try {
          const localPath = path.join(process.cwd(), String(job.filePath).replace(/^\//, ""));
          if (fs.existsSync(localPath) && job.fileType) {
              const fileBuffer = await fs.promises.readFile(localPath);
              persistentFilePath = `data:${job.fileType};base64,${fileBuffer.toString("base64")}`;
          }
      } catch {}
    }

    const values = {
        supplierId: data.supplierId,
        purchaseOrderId,
        ocrJobId: data.ocrJobId,
        fileName: job.fileName || `OCR ${data.ocrJobId}`,
        fileType: job.fileType || null,
        fileSize: job.fileSize || null,
        filePath: persistentFilePath,
        invoiceNumber: data.invoiceNumber ? String(data.invoiceNumber).toUpperCase() : null,
        invoiceDate: invoiceDate && !Number.isNaN(invoiceDate.getTime()) ? invoiceDate : null,
        observations: data.notes ? String(data.notes).toUpperCase() : "SALVA AUTOMATICAMENTE VIA OCR",
        source: "OCR",
        createdBy: userId || null,
        updatedAt: new Date(),
    };

    if (existing) {
        await tx.update(supplierInvoiceFiles).set(values).where(eq(supplierInvoiceFiles.id, existing.id));
        return;
    }

    await tx.insert(supplierInvoiceFiles).values(values);
}

// Approve helper
async function approvePurchaseOrder(tx: any, orderId: string, userId?: string) {
    // Get Order
    const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, orderId)).limit(1);
    if (!order) throw new Error("Compra não encontrada");
    if (order.status !== "DRAFT") throw new Error("Apenas compras em rascunho podem ser aprovadas");

    // Get Items
    const items = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, order.id));

    const duplicateErrors: Record<string, string> = {};

    // ---- Multimoeda: câmbio da compra congelado na aprovação + rateio do frete ----
    // Custo real em BRL = (custo unitário na moeda + frete rateado por unidade) × câmbio da data.
    const orderCurrency = String(order.currency || "BRL");
    let fxToBrl = Number(order.fxRateToBrl) || 0;
    if (!(fxToBrl > 0)) {
      if (orderCurrency === "BRL") fxToBrl = 1;
      else {
        const rates = await resolveRates();
        fxToBrl = orderCurrency === "USD" ? (rates.USDBRL?.rate || 0)
          : orderCurrency === "PYG" ? (rates.BRLPYG?.rate ? 1 / rates.BRLPYG.rate : 0)
          : orderCurrency === "USDT" ? (rates.USDTBRL?.rate || 0) : 0;
        if (!(fxToBrl > 0)) throw new Error(`Sem câmbio ${orderCurrency}→BRL. Informe o câmbio na compra ou em Financeiro > Câmbio de hoje.`);
      }
      // Congela o câmbio usado na ordem (auditável; não muda se a cotação mudar depois).
      await tx.update(purchaseOrders).set({ fxRateToBrl: fxToBrl.toFixed(6) }).where(eq(purchaseOrders.id, order.id));
    }
    const totalUnits = items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    const freightPerUnit = totalUnits > 0 ? Number(order.freightAmount || 0) / totalUnits : 0;
    const landedUnitBrl = (costInOrderCurrency: any) =>
      Math.round(((Number(costInOrderCurrency) || 0) + freightPerUnit) * fxToBrl * 10000) / 10000;

    for (const [idx, item] of items.entries()) {
        if (item.quantity <= 0) {
            duplicateErrors[`items.${idx}.quantity`] = "Quantidade deve ser maior que zero.";
        }
        if (Number(item.costPrice) < 0) {
            duplicateErrors[`items.${idx}.costPrice`] = "Custo não pode ser negativo.";
        }

        let activeProductId = item.productId;
        
        let pA = Number(item.salePriceA);
        let pB = item.salePriceB && Number(item.salePriceB) > 0 ? Number(item.salePriceB) : pA;
        let pC = pA;

        // Create product if new
        if (!activeProductId) {
            if (!item.sku || !item.productName) throw new Error(`[{Item ID: ${item.id}}] Campos obrigatórios faltando para o novo produto (Nome ou SKU).`);
            if (!item.groupId || !item.shelfId) throw new Error(`[{Item ID: ${item.id}}] Produto novo precisa de grupo e prateleira.`);
            if (pA <= 0) duplicateErrors[`items.${idx}.salePriceA`] = "Preço A deve ser maior que zero para novo produto.";
            
            // Verifique duplicação
            const [existing] = await tx.select().from(products).where(
                or(
                   eq(products.sku, item.sku.toUpperCase()), 
                   item.upc ? eq(products.upc, item.upc.toUpperCase()) : undefined
                )
            ).limit(1);

            if (existing) {
                if (existing.sku === item.sku.toUpperCase()) duplicateErrors[`items.${idx}.sku`] = `SKU '${item.sku}' já cadastrado no sistema.`;
                if (item.upc && existing.upc === item.upc?.toUpperCase()) duplicateErrors[`items.${idx}.upc`] = `UPC '${item.upc}' já cadastrado.`;
            } else {
                const [insertedProduct] = await tx.insert(products).values({
                    sku: item.sku.toUpperCase(),
                    upc: item.upc?.toUpperCase(),
                    name: item.productName.toUpperCase(),
                    // Custo do produto é SEMPRE em BRL: (custo na moeda + frete rateado) × câmbio da data.
                    costPrice: landedUnitBrl(item.costPrice).toFixed(4),
                    salePriceA: pA.toString(),
                    salePriceB: pB.toString(),
                    groupId: item.groupId,
                    subgroupId: item.subgroupId || null,
                    shelfId: item.shelfId,
                    hasSerialNumber: item.hasSerialNumber,
                    unitMeasure: "UN"
                }).returning();
                activeProductId = insertedProduct.id;

                await tx.update(purchaseOrderItems)
                .set({ productId: activeProductId, status: "MAPPED" })
                .where(eq(purchaseOrderItems.id, item.id));
            }
        } else {
            // Existing product updates
            const [existingProd] = await tx.select().from(products).where(eq(products.id, activeProductId)).limit(1);
            if (existingProd) {
                // If it requires serials, check if it's matching
                if (existingProd.hasSerialNumber && !item.hasSerialNumber) {
                    duplicateErrors[`items.${idx}.serials`] = `Atenção: Este produto controla S/N. Forneça os seriais.`;
                }

                const updates: any = {};
                let hasUpdates = false;
                
                const oldValues: any = {};
                const newValues: any = {};

                if (item.updateCost) {
                    // Custo do produto é SEMPRE em BRL: (custo na moeda + frete rateado) × câmbio da data.
                    const costBrl = landedUnitBrl(item.costPrice).toFixed(4);
                    updates.costPrice = costBrl;
                    oldValues.costPrice = existingProd.costPrice;
                    newValues.costPrice = costBrl;
                    hasUpdates = true;
                }
                if (item.updatePriceA) {
                    updates.salePriceA = pA.toString();
                    oldValues.salePriceA = existingProd.salePriceA;
                    newValues.salePriceA = pA.toString();
                    hasUpdates = true;
                }
                if (item.updatePriceB && Number(item.salePriceB) > 0) {
                    updates.salePriceB = item.salePriceB;
                    oldValues.salePriceB = existingProd.salePriceB;
                    newValues.salePriceB = item.salePriceB;
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    updates.updatedAt = new Date();
                    await tx.update(products).set(updates).where(eq(products.id, activeProductId));
                    if (userId) {
                        await tx.insert(auditLogs).values({
                            userId: userId,
                            action: "UPDATE_PRODUCT_FROM_PURCHASE",
                            tableName: "products",
                            recordId: activeProductId,
                            oldValues: JSON.stringify(oldValues),
                            newValues: JSON.stringify(newValues)
                        });
                    }
                }
            }
        }

        // Handle Serials
        const requireSerial = activeProductId ? (await tx.select().from(products).where(eq(products.id, activeProductId)).limit(1))[0]?.hasSerialNumber : item.hasSerialNumber;

        if (requireSerial) {
            const serials = await tx.select().from(purchaseOrderSerials).where(eq(purchaseOrderSerials.purchaseOrderItemId, item.id));
            if (serials.length !== item.quantity) {
                duplicateErrors[`items.${idx}.serials`] = `Produto requer ${item.quantity} seriais, possui apenas ${serials.length}.`;
            }
            
            const duplicatesFound = [];
            for (const sn of serials) {
                // Check serial globally for this product
                if (!activeProductId) continue; // skip if activeProduct creation failed
                const [existingSn] = await tx.select().from(productSerials)
                   .where(and(eq(productSerials.productId, activeProductId), eq(productSerials.serialNumber, sn.serialNumber.toUpperCase()))).limit(1);
                
                if (existingSn) {
                   duplicatesFound.push(sn.serialNumber);
                } else {
                   await tx.insert(productSerials).values({
                       productId: activeProductId,
                       serialNumber: sn.serialNumber.toUpperCase(),
                       status: "AVAILABLE"
                   });
                   await tx.update(purchaseOrderSerials).set({ status: "IMPORTED", productId: activeProductId }).where(eq(purchaseOrderSerials.id, sn.id));
                }
            }
            if (duplicatesFound.length > 0) {
               duplicateErrors[`items.${idx}.serials`] = `Seriais já existentes: ${duplicatesFound.join(", ")}`;
            }
        }

        // Update Stock (skip if duplicate error exists)
        if (Object.keys(duplicateErrors).length === 0 && activeProductId) {
            let [sb] = await tx.select().from(stockBalances).where(eq(stockBalances.productId, activeProductId)).limit(1);
            let beforePhys = 0; let beforeRes = 0;
            if (!sb) {
                const [newSb] = await tx.insert(stockBalances).values({
                    productId: activeProductId,
                    physicalStock: item.quantity,
                    reservedStock: 0
                }).returning();
                sb = newSb;
            } else {
                beforePhys = sb.physicalStock; beforeRes = sb.reservedStock;
                [sb] = await tx.update(stockBalances).set({
                    physicalStock: sb.physicalStock + item.quantity,
                    updatedAt: new Date()
                }).where(eq(stockBalances.productId, activeProductId)).returning();
            }

            // Stock movement log
            if (userId) {
                await tx.insert(stockMovements).values({
                    productId: activeProductId,
                    movementType: "PURCHASE",
                    quantity: item.quantity,
                    referenceId: order.id,
                    beforePhysical: beforePhys,
                    afterPhysical: sb.physicalStock,
                    beforeReserved: beforeRes,
                    afterReserved: sb.reservedStock,
                    notes: `Entrada via compra ${order.invoiceNumber || order.id}`,
                    userId: userId
                });
            }

            // Entrada por lote com validade (rastreabilidade de medicamento).
            if (item.lotNumber && String(item.lotNumber).trim()) {
                await addLotStock(tx, activeProductId, String(item.lotNumber), item.quantity, item.expiryDate ? new Date(item.expiryDate) : null);
            }

            // CMP: cada entrada vira camada de custo em BRL (congelada na data da compra).
            await addCostLayer(tx, {
                productId: activeProductId,
                qty: item.quantity,
                unitCostBrl: landedUnitBrl(item.costPrice),
                purchaseOrderId: order.id,
                sourceCurrency: orderCurrency,
                fxRate: fxToBrl,
                note: `Compra ${order.invoiceNumber || order.id.slice(0, 8)}`,
            });
        }
    }

    if (Object.keys(duplicateErrors).length > 0) {
       throw { name: "ValidationError", message: "Dados inválidos.", fields: duplicateErrors };
    }

    // Update order status
    const [updated] = await tx.update(purchaseOrders).set({
        status: "APPROVED",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date()
    }).where(eq(purchaseOrders.id, order.id)).returning();

    // Gera título em Contas a Pagar (idempotente por compra) — SEMPRE em BRL, convertido
    // pelo câmbio congelado da compra (itens + frete). A moeda original fica registrada na nota.
    const itemsTotalNative = items.reduce((s: number, i: any) => s + (Number(i.costPrice) || 0) * (Number(i.quantity) || 0), 0);
    const payableTotalBrl = Math.round((itemsTotalNative + Number(order.freightAmount || 0)) * fxToBrl * 100) / 100;
    await createPayableForPurchase(tx, {
      ...updated,
      totalAmount: payableTotalBrl,
      payableNotes: orderCurrency !== "BRL"
        ? `Compra em ${orderCurrency}: ${itemsTotalNative.toFixed(2)} + frete ${Number(order.freightAmount || 0).toFixed(2)} · câmbio ${fxToBrl.toFixed(4)} = R$ ${payableTotalBrl.toFixed(2)}`
        : null,
    } as any, userId);

    // Audit
    if (userId) {
        await tx.insert(auditLogs).values({
            userId: userId,
            action: "APPROVE_PURCHASE",
            tableName: "purchase_orders",
            recordId: order.id,
            newValues: JSON.stringify({ status: "APPROVED" })
        });
    }

    return updated;
}

router.post("/import/confirm", requirePermission("purchase", "import"), async (req: AuthRequest, res) => {
  try {
     const data = req.body;
     // It acts basically the same as POST /api/purchases, but maybe it can be used specifically for the array of mapped items.
     // If the prompt says "cria a entrada/compra", let's reuse logic or just implement here.
     if (!data.supplierId) return res.status(400).json({ error: "Fornecedor é obrigatório." });
     if (!data.items || !data.items.length) return res.status(400).json({ error: "Pelo menos 1 item é obrigatório." });

     const newOrder = await db.transaction(async (tx) => {
         const [order] = await tx.insert(purchaseOrders).values({
            supplierId: data.supplierId,
            invoiceNumber: data.invoiceNumber || null,
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
            paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
            currency: isValidCurrency(data.currency) ? data.currency : "USD",
            fxRateToBrl: Number(data.fxRateToBrl) > 0 ? Number(data.fxRateToBrl).toFixed(6) : null,
            freightAmount: (Number(data.freightAmount) > 0 ? Number(data.freightAmount) : 0).toFixed(2),
            notes: data.notes || null,
            status: "DRAFT",
            createdBy: req.user?.userId,
            totalAmount: data.items.reduce((acc: number, cur: any) => acc + (Number(cur.quantity) * Number(cur.costPrice)), 0).toString(),
            ocrJobId: data.ocrJobId || null
         }).returning();

         for (const item of data.items) {
             const [pi] = await tx.insert(purchaseOrderItems).values({
                 purchaseOrderId: order.id,
                 productId: item.productId || null,
                 sku: item.sku?.toUpperCase() || null,
                 upc: item.upc?.toUpperCase() || null,
                 productName: item.productName?.toUpperCase() || null,
                 quantity: Number(item.quantity),
                 lotNumber: item.lotNumber ? String(item.lotNumber).toUpperCase().trim() : null,
                 expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                 costPrice: item.costPrice?.toString() || "0",
                 salePriceA: item.salePriceA?.toString() || "0",
                 salePriceB: item.salePriceB?.toString() || "0",
                 shelfId: item.shelfId || null,
                 groupId: item.groupId || null,
                 subgroupId: item.subgroupId || null,
                 hasSerialNumber: item.hasSerialNumber || false,
                 updateCost: item.updateCost ?? true,
                 updatePriceA: item.updatePriceA ?? true,
                 updatePriceB: item.updatePriceB ?? false,
                 status: item.productId ? "MAPPED" : "NEW_PRODUCT"
             }).returning();

             if (item.hasSerialNumber && item.serials && item.serials.length > 0) {
                 for (const sn of item.serials) {
                     await tx.insert(purchaseOrderSerials).values({
                         purchaseOrderItemId: pi.id,
                         productId: item.productId || null,
                         serialNumber: sn.toUpperCase(),
                         status: "PENDING"
                     });
                 }
             }
         }
         await attachOcrInvoiceToSupplier(tx, data, order.id, req.user?.userId);
         return order;
     });
     
     let returnedOrder = newOrder;
     // if the user requested auto-approve
     if (data.autoApprove) {
        try {
           await db.transaction(async (tx) => {
              returnedOrder = await approvePurchaseOrder(tx, newOrder.id, req.user?.userId);
           });
        } catch (e: any) {
           if (e.name === "ValidationError") {
              return res.status(400).json({ error: e.message, fields: e.fields });
           }
           throw e;
        }
     }

     res.status(201).json(returnedOrder);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao confirmar importação", details: e.message });
  }
});

// Get purchase list
router.get("/", requirePermission("purchase", "view"), async (req: AuthRequest, res) => {
  try {
     const list = await db.select({
         id: purchaseOrders.id,
         invoiceNumber: purchaseOrders.invoiceNumber,
         invoiceDate: purchaseOrders.invoiceDate,
         currency: purchaseOrders.currency,
         totalAmount: purchaseOrders.totalAmount,
         status: purchaseOrders.status,
         createdAt: purchaseOrders.createdAt,
         supplier: {
            name: suppliers.name
         }
     })
     .from(purchaseOrders)
     .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
     .orderBy(desc(purchaseOrders.createdAt));

     res.json({
         data: list,
         total: list.length,
         page: 1,
         limit: 50
     });
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao buscar compras", details: e.message });
  }
});

// Get single purchase
router.get("/:id", requirePermission("purchase", "view"), async (req: AuthRequest, res) => {
  try {
     const pData = await db.select().from(purchaseOrders).leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(eq(purchaseOrders.id, req.params.id)).limit(1);
     if (!pData.length) return res.status(404).json({ error: "Não encontrado" });
     
     const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, req.params.id));
     const serials = await db.select().from(purchaseOrderSerials)
          .innerJoin(purchaseOrderItems, eq(purchaseOrderSerials.purchaseOrderItemId, purchaseOrderItems.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, req.params.id));

     res.json({
         purchase: pData[0].purchase_orders,
         supplier: pData[0].suppliers,
         items: items.map(i => ({
             ...i,
             serials: serials.filter(s => s.purchase_order_serials.purchaseOrderItemId === i.id).map(s => s.purchase_order_serials)
         }))
     });
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao buscar compra", details: e.message });
  }
});

// Create purchase draft
router.post("/", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
  try {
     const data = req.body;
     const fields: any = {};
     if (!data.supplierId) fields["supplierId"] = "Fornecedor é obrigatório.";
     if (!data.items || !data.items.length) fields["items"] = "Pelo menos 1 item é obrigatório.";
     
     if (data.items && data.items.length > 0) {
         data.items.forEach((item: any, idx: number) => {
             if (!item.productId) {
                 if (!item.sku) fields[`items.${idx}.sku`] = "SKU é obrigatório para produto novo.";
                 if (!item.productName) fields[`items.${idx}.productName`] = "Nome é obrigatório para produto novo.";
                 if (!item.groupId) fields[`items.${idx}.groupId`] = "Grupo é obrigatório para produto novo.";
                 if (!item.shelfId) fields[`items.${idx}.shelfId`] = "Prateleira é obrigatória para produto novo.";
             }
         });
     }

     if (Object.keys(fields).length > 0) {
         return res.status(400).json({ error: "Dados inválidos.", fields });
     }

     const newOrder = await db.transaction(async (tx) => {
         const [order] = await tx.insert(purchaseOrders).values({
            supplierId: data.supplierId,
            invoiceNumber: data.invoiceNumber || null,
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
            paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
            currency: isValidCurrency(data.currency) ? data.currency : "USD",
            fxRateToBrl: Number(data.fxRateToBrl) > 0 ? Number(data.fxRateToBrl).toFixed(6) : null,
            freightAmount: (Number(data.freightAmount) > 0 ? Number(data.freightAmount) : 0).toFixed(2),
            notes: data.notes || null,
            status: "DRAFT",
            createdBy: req.user?.userId,
            totalAmount: data.items.reduce((acc: number, cur: any) => acc + (Number(cur.quantity) * Number(cur.costPrice)), 0).toString(),
            ocrJobId: data.ocrJobId || null
         }).returning();

         for (const item of data.items) {
             const [pi] = await tx.insert(purchaseOrderItems).values({
                 purchaseOrderId: order.id,
                 productId: item.productId || null,
                 sku: item.sku?.toUpperCase() || null,
                 upc: item.upc?.toUpperCase() || null,
                 productName: item.productName?.toUpperCase() || null,
                 quantity: Number(item.quantity),
                 lotNumber: item.lotNumber ? String(item.lotNumber).toUpperCase().trim() : null,
                 expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                 costPrice: item.costPrice?.toString() || "0",
                 salePriceA: item.salePriceA?.toString() || "0",
                 salePriceB: item.salePriceB?.toString() || "0",
                 shelfId: item.shelfId || null,
                 groupId: item.groupId || null,
                 subgroupId: item.subgroupId || null,
                 hasSerialNumber: item.hasSerialNumber || false,
                 updateCost: item.updateCost ?? true,
                 updatePriceA: item.updatePriceA ?? true,
                 updatePriceB: item.updatePriceB ?? false,
                 status: item.productId ? "MAPPED" : "NEW_PRODUCT"
             }).returning();

             if (item.hasSerialNumber && item.serials && item.serials.length > 0) {
                 for (const sn of item.serials) {
                     await tx.insert(purchaseOrderSerials).values({
                         purchaseOrderItemId: pi.id,
                         productId: item.productId || null,
                         serialNumber: sn.toUpperCase(),
                         status: "PENDING"
                     });
                 }
             }
         }
         await attachOcrInvoiceToSupplier(tx, data, order.id, req.user?.userId);
         return order;
     });

     res.status(201).json(newOrder);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao criar compra", details: e.message });
  }
});

// Approve purchase
router.post("/:id/approve", requirePermission("purchase", "approve"), async (req: AuthRequest, res) => {
  try {
     const orderId = req.params.id;
     
     const result = await db.transaction(async (tx) => {
         return await approvePurchaseOrder(tx, orderId, req.user?.userId);
     });

     res.json(result);
  } catch(e: any) {
     if (e.name === "ValidationError") {
        return res.status(400).json({ error: e.message, fields: e.fields });
     }
     res.status(500).json({ error: "Erro ao aprovar compra", details: e.message });
  }
});

// Edit purchase draft
router.put("/:id", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
  try {
     const orderId = req.params.id;
     const data = req.body;
     
     const fields: any = {};
     if (!data.supplierId) fields["supplierId"] = "Fornecedor é obrigatório.";
     if (!data.items || !data.items.length) fields["items"] = "Pelo menos 1 item é obrigatório.";

     if (Object.keys(fields).length > 0) {
         return res.status(400).json({ error: "Dados inválidos.", fields });
     }

     const updated = await db.transaction(async (tx) => {
         const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, orderId)).limit(1);
         if (!order) throw new Error("Compra não encontrada.");
         if (order.status !== "DRAFT") throw new Error("Somente rascunhos podem ser editados.");

         // Update order
         const [updatedOrder] = await tx.update(purchaseOrders).set({
            supplierId: data.supplierId,
            invoiceNumber: data.invoiceNumber || null,
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
            paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
            currency: isValidCurrency(data.currency) ? data.currency : "USD",
            fxRateToBrl: Number(data.fxRateToBrl) > 0 ? Number(data.fxRateToBrl).toFixed(6) : null,
            freightAmount: (Number(data.freightAmount) > 0 ? Number(data.freightAmount) : 0).toFixed(2),
            notes: data.notes || null,
            totalAmount: data.items.reduce((acc: number, cur: any) => acc + (Number(cur.quantity) * Number(cur.costPrice)), 0).toString(),
            updatedAt: new Date()
         }).where(eq(purchaseOrders.id, orderId)).returning();

         // Delete existing item associations
         const existingItems = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, orderId));
         for (const it of existingItems) {
            await tx.delete(purchaseOrderSerials).where(eq(purchaseOrderSerials.purchaseOrderItemId, it.id));
         }
         await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, orderId));

         // Insert new items
         for (const item of data.items) {
             const [pi] = await tx.insert(purchaseOrderItems).values({
                 purchaseOrderId: orderId,
                 productId: item.productId || null,
                 sku: item.sku?.toUpperCase() || null,
                 upc: item.upc?.toUpperCase() || null,
                 productName: item.productName?.toUpperCase() || null,
                 quantity: Number(item.quantity),
                 lotNumber: item.lotNumber ? String(item.lotNumber).toUpperCase().trim() : null,
                 expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                 costPrice: item.costPrice?.toString() || "0",
                 salePriceA: item.salePriceA?.toString() || "0",
                 salePriceB: item.salePriceB?.toString() || "0",
                 shelfId: item.shelfId || null,
                 groupId: item.groupId || null,
                 subgroupId: item.subgroupId || null,
                 hasSerialNumber: item.hasSerialNumber || false,
                 updateCost: item.updateCost ?? true,
                 updatePriceA: item.updatePriceA ?? true,
                 updatePriceB: item.updatePriceB ?? false,
                 status: item.productId ? "MAPPED" : "NEW_PRODUCT"
             }).returning();

             if (item.hasSerialNumber && item.serials && item.serials.length > 0) {
                 for (const sn of item.serials) {
                     await tx.insert(purchaseOrderSerials).values({
                         purchaseOrderItemId: pi.id,
                         productId: item.productId || null,
                         serialNumber: sn.toUpperCase(),
                         status: "PENDING"
                     });
                 }
             }
         }
         await attachOcrInvoiceToSupplier(tx, data, orderId, req.user?.userId);
         return updatedOrder;
     });

     res.json(updated);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao atualizar compra", details: e.message });
  }
});

// Cancel purchase
router.post("/:id/cancel", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
   try {
      const orderId = req.params.id;
      
      const canceled = await db.transaction(async (tx) => {
         const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, orderId)).limit(1);
         if (!order) throw new Error("Compra não encontrada.");
         if (order.status !== "DRAFT") throw new Error("Apenas rascunhos podem ser cancelados diretamente.");

         const [updated] = await tx.update(purchaseOrders).set({
            status: "CANCELED",
            updatedAt: new Date()
         }).where(eq(purchaseOrders.id, orderId)).returning();

         return updated;
      });

      res.json(canceled);
   } catch(e: any) {
       res.status(500).json({ error: "Erro ao cancelar compra", details: e.message });
   }
});

export default router;
