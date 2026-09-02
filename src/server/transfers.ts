import { Router } from "express";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { db } from "../db";
import {
  products,
  stockTransferItems,
  stockTransfers,
} from "../db/schema";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });
const TRANSFER_INVOICE_MAX_BYTES = 4 * 1024 * 1024;
const TRANSFER_INVOICE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanText(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function transferCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${date}-${suffix}`;
}

async function loadItems(transferIds: string[]) {
  if (!transferIds.length) return [];
  const rows = await db.select({
    id: stockTransferItems.id,
    transferId: stockTransferItems.transferId,
    productId: stockTransferItems.productId,
    savedProductName: stockTransferItems.productName,
    registeredProductName: products.name,
    sku: products.sku,
    requiresLot: products.requiresLot,
    lotSent: stockTransferItems.lotSent,
    lotReceived: stockTransferItems.lotReceived,
    quantitySent: stockTransferItems.quantitySent,
    quantityReceived: stockTransferItems.quantityReceived,
    quantityDamaged: stockTransferItems.quantityDamaged,
    notes: stockTransferItems.notes,
    createdAt: stockTransferItems.createdAt,
  })
    .from(stockTransferItems)
    .leftJoin(products, eq(stockTransferItems.productId, products.id))
    .where(inArray(stockTransferItems.transferId, transferIds))
    .orderBy(stockTransferItems.createdAt);

  return rows.map((row) => ({
    ...row,
    productName: row.savedProductName || row.registeredProductName || "Produto sem nome",
    sku: row.sku || "",
    requiresLot: !!row.requiresLot,
  }));
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const status = String(req.query.status || "IN_TRANSIT").toUpperCase();
    const q = String(req.query.q || "").trim();
    const conditions: any[] = [];

    if (status === "RECEIVED") {
      conditions.push(inArray(stockTransfers.status, ["RECEIVED", "PARTIAL", "DIVERGENT"]));
    } else if (status && status !== "ALL") {
      conditions.push(eq(stockTransfers.status, status));
    }

    if (q) {
      conditions.push(or(
        ilike(stockTransfers.code, `%${q}%`),
        ilike(stockTransfers.title, `%${q}%`),
        ilike(stockTransfers.origin, `%${q}%`),
        ilike(stockTransfers.destination, `%${q}%`),
        ilike(stockTransfers.carrier, `%${q}%`),
      ));
    }

    const [rows, summaryRows] = await Promise.all([
      db.select({
        id: stockTransfers.id,
        code: stockTransfers.code,
        title: stockTransfers.title,
        origin: stockTransfers.origin,
        destination: stockTransfers.destination,
        carrier: stockTransfers.carrier,
        status: stockTransfers.status,
        departureAt: stockTransfers.departureAt,
        expectedAt: stockTransfers.expectedAt,
        receivedAt: stockTransfers.receivedAt,
        notes: stockTransfers.notes,
        receiptNotes: stockTransfers.receiptNotes,
        invoiceFileName: stockTransfers.invoiceFileName,
        invoiceFileType: stockTransfers.invoiceFileType,
        invoiceFileSize: stockTransfers.invoiceFileSize,
        createdBy: stockTransfers.createdBy,
        receivedBy: stockTransfers.receivedBy,
        createdAt: stockTransfers.createdAt,
        updatedAt: stockTransfers.updatedAt,
      }).from(stockTransfers)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(stockTransfers.createdAt))
        .limit(300),
      db.select({ status: stockTransfers.status, expectedAt: stockTransfers.expectedAt }).from(stockTransfers),
    ]);

    const items = await loadItems(rows.map((row) => row.id));
    const data = rows.map((row) => {
      const transferItems = items.filter((item) => item.transferId === row.id);
      return {
        ...row,
        items: transferItems,
        totalProducts: transferItems.length,
        totalUnits: transferItems.reduce((sum, item) => sum + Number(item.quantitySent || 0), 0),
        totalReceived: transferItems.reduce((sum, item) => sum + Number(item.quantityReceived || 0), 0),
        hasInvoiceFile: !!row.invoiceFileName,
      };
    });

    const today = new Date().toISOString().slice(0, 10);
    const summary = {
      transit: summaryRows.filter((row) => row.status === "IN_TRANSIT").length,
      late: summaryRows.filter((row) => row.status === "IN_TRANSIT" && row.expectedAt && new Date(row.expectedAt).toISOString().slice(0, 10) < today).length,
      divergent: summaryRows.filter((row) => ["PARTIAL", "DIVERGENT"].includes(row.status)).length,
    };

    res.json({ data, summary });
  } catch (error: any) {
    console.error("Transfer list error:", error);
    res.status(500).json({ error: "Não foi possível carregar as transferências." });
  }
});

router.post("/:id/invoice", requirePermission("purchase", "create"), upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const [transfer] = await db.select({ id: stockTransfers.id }).from(stockTransfers).where(eq(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transferência não encontrada." });
    if (!req.file) return res.status(400).json({ error: "Selecione uma foto ou PDF da nota." });
    if (!TRANSFER_INVOICE_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato inválido. Use JPG, PNG, WEBP ou PDF." });
    }
    if (req.file.size > TRANSFER_INVOICE_MAX_BYTES) {
      return res.status(400).json({ error: "Arquivo maior que 4 MB." });
    }

    const [updated] = await db.update(stockTransfers).set({
      invoiceFileName: req.file.originalname,
      invoiceFileType: req.file.mimetype,
      invoiceFileSize: req.file.size,
      invoiceFilePath: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      updatedAt: new Date(),
    }).where(eq(stockTransfers.id, transfer.id)).returning({
      id: stockTransfers.id,
      invoiceFileName: stockTransfers.invoiceFileName,
      invoiceFileType: stockTransfers.invoiceFileType,
      invoiceFileSize: stockTransfers.invoiceFileSize,
      invoiceFilePath: stockTransfers.invoiceFilePath,
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Transfer invoice upload error:", error);
    res.status(500).json({ error: "Não foi possível salvar a nota da transferência." });
  }
});

router.delete("/:id/invoice", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
  try {
    const [updated] = await db.update(stockTransfers).set({
      invoiceFileName: null,
      invoiceFileType: null,
      invoiceFileSize: null,
      invoiceFilePath: null,
      updatedAt: new Date(),
    }).where(eq(stockTransfers.id, req.params.id)).returning({ id: stockTransfers.id });
    if (!updated) return res.status(404).json({ error: "Transferência não encontrada." });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: "Não foi possível remover a nota da transferência." });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transferência não encontrada." });
    const items = await loadItems([transfer.id]);
    res.json({ ...transfer, items });
  } catch (error: any) {
    res.status(500).json({ error: "Não foi possível carregar a transferência." });
  }
});

router.post("/", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
  try {
    const title = cleanText(req.body.title);
    const origin = cleanText(req.body.origin) || "Paraguai";
    const destination = cleanText(req.body.destination);
    const carrier = cleanText(req.body.carrier);
    const notes = cleanText(req.body.notes);
    const expectedAt = asDate(req.body.expectedAt);
    const departureAt = asDate(req.body.departureAt) || new Date();
    const inputItems = Array.isArray(req.body.items) ? req.body.items : [];

    if (!destination) return res.status(400).json({ error: "Informe o destino da mercadoria." });
    if (!inputItems.length) return res.status(400).json({ error: "Adicione pelo menos um produto." });

    const normalizedItems = inputItems.map((item: any) => ({
      productId: cleanText(item.productId),
      productName: cleanText(item.productName),
      quantitySent: Math.floor(Number(item.quantitySent || 0)),
      lotSent: cleanText(item.lotSent),
      notes: cleanText(item.notes),
    }));

    if (normalizedItems.some((item: any) => !item.productName || item.quantitySent <= 0)) {
      return res.status(400).json({ error: "Confira os nomes dos produtos e as quantidades da transferência." });
    }

    const result = await db.transaction(async (tx) => {
      const productIds = [...new Set(normalizedItems.map((item: any) => item.productId).filter(Boolean))] as string[];
      if (productIds.length) {
        const productRows = await tx.select({ id: products.id }).from(products).where(inArray(products.id, productIds));
        const existingProductIds = new Set(productRows.map((product) => product.id));
        const missingProduct = productIds.find((productId) => !existingProductIds.has(productId));
        if (missingProduct) throw new Error("Um dos produtos cadastrados não foi encontrado.");
      }

      const transferId = uuidv4();
      const code = transferCode();
      await tx.insert(stockTransfers).values({
        id: transferId,
        code,
        title,
        origin,
        destination,
        carrier,
        status: "IN_TRANSIT",
        departureAt,
        expectedAt,
        notes,
        createdBy: req.user!.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const item of normalizedItems) {
        await tx.insert(stockTransferItems).values({
          id: uuidv4(),
          transferId,
          productId: item.productId,
          productName: item.productName!,
          lotSent: item.lotSent,
          quantitySent: item.quantitySent,
          notes: item.notes,
        });
      }

      return { id: transferId, code, title };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Create transfer error:", error);

    const knownMessages = [
      "Um dos produtos cadastrados não foi encontrado.",
      "Informe o destino da mercadoria.",
      "Adicione pelo menos um produto.",
      "Confira os nomes dos produtos e as quantidades da transferência.",
    ];
    const rawMessage = String(error?.message || "");
    const knownMessage = knownMessages.find((message) => rawMessage.includes(message));

    res.status(knownMessage ? 400 : 500).json({
      error: knownMessage || "Não foi possível salvar a transferência. Atualize a página e tente novamente.",
    });
  }
});

router.post("/:id/dispatch", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
  try {
    const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transferência não encontrada." });
    if (transfer.status !== "DRAFT") return res.status(400).json({ error: "Essa transferência não está aguardando saída." });

    await db.update(stockTransfers).set({
      status: "IN_TRANSIT",
      departureAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(stockTransfers.id, transfer.id));

    res.json({ ok: true });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Não foi possível confirmar a saída." });
  }
});

router.post("/:id/receive", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
  try {
    const receiptRows = Array.isArray(req.body.items) ? req.body.items : [];
    const receiptNotes = cleanText(req.body.receiptNotes);

    const result = await db.transaction(async (tx) => {
      const [transfer] = await tx.select().from(stockTransfers).where(eq(stockTransfers.id, req.params.id)).limit(1);
      if (!transfer) throw new Error("Transferência não encontrada.");
      if (transfer.status !== "IN_TRANSIT") throw new Error("Essa transferência não está em trânsito.");
      const items = await tx.select().from(stockTransferItems).where(eq(stockTransferItems.transferId, transfer.id));
      if (!items.length) throw new Error("A transferência não possui produtos.");

      const receivedMap = new Map(receiptRows.map((row: any) => [String(row.id || ""), row]));
      let hasMissing = false;
      let hasDivergence = false;

      for (const item of items) {
        const input: any = receivedMap.get(item.id) || {};
        const quantityReceived = Math.max(0, Math.floor(Number(input.quantityReceived ?? item.quantitySent)));
        const quantityDamaged = Math.max(0, Math.floor(Number(input.quantityDamaged || 0)));
        const lotReceived = cleanText(input.lotReceived) || item.lotSent;
        const itemNotes = cleanText(input.notes);
        const sent = Number(item.quantitySent || 0);

        if (quantityReceived + quantityDamaged > sent) {
          throw new Error("A quantidade recebida/avariada não pode ultrapassar a quantidade enviada.");
        }

        if (quantityReceived + quantityDamaged < sent) hasMissing = true;
        if (quantityDamaged > 0 || (item.lotSent && String(lotReceived || "") !== String(item.lotSent))) hasDivergence = true;

        await tx.update(stockTransferItems).set({
          lotReceived,
          quantityReceived,
          quantityDamaged,
          notes: itemNotes || item.notes,
          updatedAt: new Date(),
        }).where(eq(stockTransferItems.id, item.id));

      }

      const status = hasDivergence ? "DIVERGENT" : hasMissing ? "PARTIAL" : "RECEIVED";
      await tx.update(stockTransfers).set({
        status,
        receivedAt: new Date(),
        receivedBy: req.user!.userId,
        receiptNotes,
        updatedAt: new Date(),
      }).where(eq(stockTransfers.id, transfer.id));

      return { ok: true, status };
    });

    res.json(result);
  } catch (error: any) {
    console.error("Receive transfer error:", error);
    res.status(400).json({ error: error?.message || "Não foi possível confirmar a chegada." });
  }
});

router.delete("/:id", requirePermission("purchase", "create"), async (req: AuthRequest, res) => {
  try {
    const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transferência não encontrada." });
    if (transfer.status !== "DRAFT") return res.status(400).json({ error: "Somente rascunhos podem ser excluídos." });
    await db.transaction(async (tx) => {
      await tx.delete(stockTransferItems).where(eq(stockTransferItems.transferId, transfer.id));
      await tx.delete(stockTransfers).where(eq(stockTransfers.id, transfer.id));
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: "Não foi possível excluir o rascunho." });
  }
});

export default router;
