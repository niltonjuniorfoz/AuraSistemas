import { Router } from "express";
import { db } from "../db";
import { products, productSerials } from "../db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(requireAuth);

router.get("/:productId", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
     const { productId } = req.params;
     const list = await db.select().from(productSerials).where(eq(productSerials.productId, productId)).orderBy(desc(productSerials.createdAt));
     res.json(list);
  } catch(e: any) {
     res.status(500).json({ error: e.message });
  }
});

router.post("/:productId", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
     const { productId } = req.params;
     const serialNumber = String(req.body?.serialNumber || "").trim().toUpperCase();
     if (!serialNumber) return res.status(400).json({ error: "Número de série é obrigatório." });
     
     const pr = await db.select().from(products).where(eq(products.id, productId)).limit(1);
     if(pr.length === 0 || !pr[0].hasSerialNumber) return res.status(400).json({ error: "Este produto não usa controle de número de série." });
     
     const ex = await db.select().from(productSerials).where(and(eq(productSerials.productId, productId), eq(productSerials.serialNumber, serialNumber))).limit(1);
     if(ex.length > 0) return res.status(400).json({ error: "Serial number already registered for this product." });
     
     const id = uuidv4();
     await db.insert(productSerials).values({ id, productId, serialNumber, status: "AVAILABLE" });
     res.json({ id });
  } catch(e: any) {
     res.status(500).json({ error: e.message });
  }
});

router.post("/:productId/bulk", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
     const { productId } = req.params;
     const { serialNumbers } = req.body; // array
     
     const pr = await db.select().from(products).where(eq(products.id, productId)).limit(1);
     if(pr.length === 0 || !pr[0].hasSerialNumber) return res.status(400).json({ error: "Este produto não usa controle de número de série." });
     if(!Array.isArray(serialNumbers) || serialNumbers.length === 0) return res.status(400).json({ error: "Lista vazia." });
     
     const normalized = serialNumbers.map((s: unknown) => String(s || "").trim().toUpperCase()).filter(Boolean);
     if (normalized.length !== serialNumbers.length) return res.status(400).json({ error: "A lista contém número de série vazio." });
     const unique = [...new Set(normalized)];
     if (unique.length !== normalized.length) return res.status(400).json({ error: "Números de série duplicados na lista." });

     const existing = await db.select({ serialNumber: productSerials.serialNumber })
       .from(productSerials)
       .where(and(eq(productSerials.productId, productId), inArray(productSerials.serialNumber, unique)));
     if (existing.length > 0) return res.status(409).json({ error: "Um ou mais números de série já constam neste produto." });

     let inserted = 0;
     for (const sn of unique) {
       await db.insert(productSerials).values({ id: uuidv4(), productId, serialNumber: sn, status: "AVAILABLE" });
       inserted++;
     }
     
     res.json({ success: true, inserted });
  } catch(e: any) {
     res.status(500).json({ error: e.message });
  }
});

// Marca em qual canal essa unidade específica está: null (normal),
// 'OFERTA' ou 'OUTLET'. É o "clico qual eu quero" da Oferta/Outlet por
// produto com número de série.
router.patch("/:productId/:serialId", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const { channel } = req.body || {};
    if (channel !== null && channel !== "OFERTA" && channel !== "OUTLET") {
      return res.status(400).json({ error: "Canal inválido (use null, OFERTA ou OUTLET)." });
    }
    await db.update(productSerials).set({ channel, updatedAt: new Date() })
      .where(and(eq(productSerials.productId, req.params.productId), eq(productSerials.id, req.params.serialId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:productId/:serialId", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
     const { productId, serialId } = req.params;
     const ex = await db.select().from(productSerials).where(and(eq(productSerials.productId, productId), eq(productSerials.id, serialId))).limit(1);
     if (ex.length === 0) return res.status(404).json({ error: "S/N não encontrado." });
     
     if (ex[0].status !== "AVAILABLE") {
        return res.status(400).json({ error: "Apenas S/N disponíveis podem ser removidos direto do estoque." });
     }
     
     await db.delete(productSerials).where(eq(productSerials.id, serialId));
     res.json({ success: true });
  } catch(e: any) {
     res.status(500).json({ error: e.message });
  }
});

export { router as serialsRouter };
