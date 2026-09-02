import { Router } from "express";
import { db } from "../db";
import { suppliers, purchaseOrders, supplierInvoiceFiles } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, ilike, or, and, isNull, sql, desc } from "drizzle-orm";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });
const SUPPLIER_INVOICE_MAX_BYTES = 10 * 1024 * 1024;
const SUPPLIER_INVOICE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

function toSafeDate(value: any) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveUploadPath(filePath: string) {
  return path.join(process.cwd(), filePath.replace(/^\//, ""));
}

router.get("/", requirePermission("supplier", "view"), async (req: AuthRequest, res) => {
  try {
     const { search, includeInactive } = req.query;
     const page = Math.max(parseInt(req.query.page as string) || 1, 1);
     const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
     const offset = (page - 1) * limit;
     let conditions = includeInactive === 'true' ? [isNull(suppliers.deletedAt)] : [eq(suppliers.isActive, true), isNull(suppliers.deletedAt)];

     let whereClause = and(...conditions);

     if (search) {
       const q = `%${search}%`;
       whereClause = and(
          ...conditions,
          or(
            ilike(suppliers.name, q),
            ilike(suppliers.document, q)
          )
       );
     }

     const [list, countResult] = await Promise.all([
       db.select()
         .from(suppliers)
         .where(whereClause)
         .orderBy(suppliers.name)
         .limit(limit)
         .offset(offset),
       db.select({ count: sql<number>`count(*)` })
         .from(suppliers)
         .where(whereClause),
     ]);

     res.json({
       data: list,
       total: Number(countResult[0]?.count || 0),
       page,
       limit
     });
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao buscar fornecedores", details: e.message });
  }
});

router.post("/", requirePermission("supplier", "create"), async (req: AuthRequest, res) => {
  try {
     const data = req.body;
     const [created] = await db.insert(suppliers).values({
        name: data.name?.toUpperCase(),
        document: data.document?.toUpperCase(),
        phone: data.phone,
        email: data.email?.toLowerCase(),
        address: data.address?.toUpperCase(),
        city: data.city?.toUpperCase(),
        country: data.country?.toUpperCase(),
        observations: data.observations?.toUpperCase(),
        isActive: data.isActive !== undefined ? data.isActive : true
     }).returning();
     res.status(201).json(created);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao criar fornecedor", details: e.message });
  }
});


router.get("/:id/invoices", requirePermission("supplier", "view"), async (req: AuthRequest, res) => {
  try {
     const supplierId = req.params.id;
     const list = await db.select()
       .from(supplierInvoiceFiles)
       .where(eq(supplierInvoiceFiles.supplierId, supplierId))
       .orderBy(desc(supplierInvoiceFiles.createdAt));

     res.json({ data: list, total: list.length });
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao buscar notas do fornecedor", details: e.message });
  }
});

router.post("/:id/invoices", requirePermission("supplier", "edit"), upload.single("file"), async (req: AuthRequest, res) => {
  try {
     const supplierId = req.params.id;
     const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
     if (!supplier) return res.status(404).json({ error: "Fornecedor não encontrado" });
     if (!req.file) return res.status(400).json({ error: "Selecione uma foto/PDF da nota." });
     if (!SUPPLIER_INVOICE_MIME_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Formato inválido. Use JPG, PNG, WEBP ou PDF." });
     }
     if (req.file.size > SUPPLIER_INVOICE_MAX_BYTES) {
        return res.status(400).json({ error: "Arquivo maior que 10 MB." });
     }

     const id = uuidv4();
     const persistentFilePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

     const [created] = await db.insert(supplierInvoiceFiles).values({
        id,
        supplierId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: persistentFilePath,
        invoiceNumber: req.body.invoiceNumber ? String(req.body.invoiceNumber).toUpperCase() : null,
        invoiceDate: toSafeDate(req.body.invoiceDate),
        observations: req.body.observations ? String(req.body.observations).toUpperCase() : null,
        source: "MANUAL",
        createdBy: req.user?.userId || null,
     }).returning();

     res.status(201).json(created);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao anexar nota ao fornecedor", details: e.message });
  }
});

router.put("/:id/invoices/:invoiceId", requirePermission("supplier", "edit"), async (req: AuthRequest, res) => {
  try {
     const supplierId = req.params.id;
     const invoiceId = req.params.invoiceId;
     const [updated] = await db.update(supplierInvoiceFiles).set({
        invoiceNumber: req.body.invoiceNumber ? String(req.body.invoiceNumber).toUpperCase() : null,
        invoiceDate: toSafeDate(req.body.invoiceDate),
        observations: req.body.observations ? String(req.body.observations).toUpperCase() : null,
        updatedAt: new Date(),
     }).where(and(eq(supplierInvoiceFiles.id, invoiceId), eq(supplierInvoiceFiles.supplierId, supplierId))).returning();

     if (!updated) return res.status(404).json({ error: "Nota não encontrada" });
     res.json(updated);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao atualizar nota", details: e.message });
  }
});

router.delete("/:id/invoices/:invoiceId", requirePermission("supplier", "edit"), async (req: AuthRequest, res) => {
  try {
     const supplierId = req.params.id;
     const invoiceId = req.params.invoiceId;
     const [invoice] = await db.select().from(supplierInvoiceFiles)
       .where(and(eq(supplierInvoiceFiles.id, invoiceId), eq(supplierInvoiceFiles.supplierId, supplierId))).limit(1);
     if (!invoice) return res.status(404).json({ error: "Nota não encontrada" });

     await db.delete(supplierInvoiceFiles).where(eq(supplierInvoiceFiles.id, invoiceId));
     if (invoice.source !== "OCR" && invoice.filePath && String(invoice.filePath).startsWith("/uploads/")) {
        const localPath = resolveUploadPath(invoice.filePath);
        if (fs.existsSync(localPath)) {
          try { await fs.promises.unlink(localPath); } catch {}
        }
     }
     res.json({ success: true });
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao excluir nota", details: e.message });
  }
});

router.put("/:id", requirePermission("supplier", "edit"), async (req: AuthRequest, res) => {
  try {
     const data = req.body;
     const [updated] = await db.update(suppliers).set({
        name: data.name?.toUpperCase(),
        document: data.document?.toUpperCase(),
        phone: data.phone,
        email: data.email?.toLowerCase(),
        address: data.address?.toUpperCase(),
        city: data.city?.toUpperCase(),
        country: data.country?.toUpperCase(),
        observations: data.observations?.toUpperCase(),
        isActive: data.isActive,
        updatedAt: new Date()
     }).where(eq(suppliers.id, req.params.id)).returning();
     if (!updated) return res.status(404).json({ error: "Não encontrado" });
     res.json(updated);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao atualizar fornecedor", details: e.message });
  }
});

router.patch("/:id/archive", requirePermission("supplier", "archive"), async (req: AuthRequest, res) => {
  try {
     const [updated] = await db.update(suppliers).set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
     }).where(eq(suppliers.id, req.params.id)).returning();
     if (!updated) return res.status(404).json({ error: "Não encontrado" });
     res.json(updated);
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao arquivar fornecedor", details: e.message });
  }
});

router.delete("/:id/hard-delete", requirePermission("supplier", "delete"), async (req: AuthRequest, res) => {
  try {
     const id = req.params.id;
     
     // Check if supplier has any history
     const history = await db.select().from(purchaseOrders).where(eq(purchaseOrders.supplierId, id)).limit(1);
     if (history.length > 0) {
        return res.status(400).json({ error: "Fornecedor possui compras. Arquive em vez de excluir." });
     }
     
     await db.delete(suppliers).where(eq(suppliers.id, id));
     res.json({ success: true });
  } catch(e: any) {
     res.status(500).json({ error: "Erro ao excluir fornecedor", details: e.message });
  }
});

export default router;
