import { Router } from "express";
import { db } from "../db";
import { customers, sales } from "../db/schema";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { eq, ilike, or, sql, and, isNull } from "drizzle-orm";
import { logAction } from "./audit";
import { createNotification } from "./notifications";
import { v4 as uuidv4 } from "uuid";
import { toUpperText, toLowerText, handleDbError } from "./utils";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const search = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    let baseWhere = and(eq(customers.isActive, true), isNull(customers.deletedAt));

    let baseQuery = db.select().from(customers).where(baseWhere);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers).where(baseWhere);

    if (search) {
      const searchWhere = or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.document, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
        ilike(customers.email, `%${search}%`)
      );
      baseQuery = db.select().from(customers).where(and(baseWhere, searchWhere)) as any;
      countQuery = db.select({ count: sql<number>`count(*)` }).from(customers).where(and(baseWhere, searchWhere)) as any;
    }
    const [list, countResult] = await Promise.all([
      baseQuery.orderBy(customers.name).limit(limit).offset(offset),
      countQuery,
    ]);
    const total = Number(countResult[0].count);

    res.json({
      data: list,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});


router.post("/quick-pos", requirePermission("sales", "create"), async (req: AuthRequest, res) => {
  try {
    const id = uuidv4();
    const rawData = req.body || {};
    const nationality = rawData.nationality === "PY" ? "PY" : "FOREIGN";
    const data = {
      name: toUpperText(rawData.name),
      type: rawData.type === "COMPANY" ? "COMPANY" : "PERSON",
      nationality,
      documentType: rawData.documentType || (nationality === "PY" ? "CI" : "PASSPORT"),
      document: toUpperText(rawData.document),
      phone: rawData.phone || null,
      email: toLowerText(rawData.email),
      address: "",
      city: "",
      country: nationality === "PY" ? "PARAGUAY" : toUpperText(rawData.country),
      observations: "CRIADO PELO PDV",
      priceTable: rawData.priceTable === "B" ? "B" : "A",
    };

    const fields: Record<string, string> = {};
    if (!data.name) fields.name = "Nome é obrigatório.";
    if (!data.nationality) fields.nationality = "Tipo do cliente é obrigatório.";
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) fields.email = "Formato de e-mail inválido.";
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inválidos.", fields });
    }

    if (data.document) {
      const existingDoc = await db
        .select({ id: customers.id, isActive: customers.isActive })
        .from(customers)
        .where(eq(customers.document, data.document))
        .limit(1);
      if (existingDoc.length > 0) {
        return res.status(409).json({
          error: existingDoc[0].isActive
            ? "Já existe um cliente cadastrado com este documento."
            : "Já existe um cliente arquivado com este documento.",
          fields: { document: "Documento já está em uso." },
        });
      }
    }

    const inserted = await db.insert(customers).values({ ...data, id }).returning();
    await logAction(req.user!.userId, "CREATE_POS_QUICK", "customers", id, null, data);
    res.status(201).json({ id, customer: inserted[0] });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { document: "Já existe cliente com este documento." }));
  }
});

router.post("/", requirePermission("customer", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = uuidv4();
    const rawData = req.body;
    
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      document: toUpperText(rawData.document),
      address: toUpperText(rawData.address),
      city: toUpperText(rawData.city),
      country: toUpperText(rawData.country),
      notes: toUpperText(rawData.notes),
      email: toLowerText(rawData.email)
    };
    
    const fields: Record<string, string> = {};
    if (!data.name) fields.name = "Nome é obrigatório.";
    if (!data.type) fields.type = "Tipo é obrigatório.";
    if (!data.nationality) fields.nationality = "Nacionalidade é obrigatória.";
    if (!data.documentType) fields.documentType = "Tipo de documento é obrigatório.";
    if (!data.document) fields.document = "Número do documento é obrigatório.";
    if (!data.priceTable) fields.priceTable = "Tabela de preço padrão é obrigatória.";
    
    if (data.email) {
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(data.email)) {
          fields.email = "Formato de e-mail inválido.";
       }
    }
    
    if (Object.keys(fields).length > 0) {
       return res.status(400).json({ error: "Dados inválidos.", fields });
    }
    
    // Check document duplication uniquely? Requirements say "mantém documento reservado".
    if (data.document) {
       const existingDoc = await db.select({ isActive: customers.isActive }).from(customers).where(eq(customers.document, data.document)).limit(1);
       if (existingDoc.length > 0) {
          if (existingDoc[0].isActive) {
             return res.status(409).json({ error: "Já existe um cliente cadastrado com este documento.", fields: { document: "Documento já está em uso." } });
          } else {
             return res.status(409).json({ error: "Já existe um cliente arquivado com este documento. Restaure ou exclua definitivamente o cliente antigo para reutilizar esse documento.", fields: { document: "Documento em uso por cliente arquivado." } });
          }
       }
    }

    await db.insert(customers).values({ ...data, id });
    await logAction(req.user!.userId, "CREATE", "customers", id, null, data);
    await createNotification(db, {
      type: "CUSTOMER_NEW", title: "Novo cliente cadastrado",
      message: `${data.name} foi cadastrado(a) como cliente.`,
      link: "/customers",
    });
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { document: "Já existe cliente com este documento." }));
  }
});

router.put("/:id", requirePermission("customer", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const rawData = req.body;
    
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      document: toUpperText(rawData.document),
      address: toUpperText(rawData.address),
      city: toUpperText(rawData.city),
      country: toUpperText(rawData.country),
      notes: toUpperText(rawData.notes),
      email: toLowerText(rawData.email)
    };
    
    const fields: Record<string, string> = {};
    if (!data.name) fields.name = "Nome é obrigatório.";
    if (!data.type) fields.type = "Tipo é obrigatório.";
    if (!data.nationality) fields.nationality = "Nacionalidade é obrigatória.";
    if (!data.documentType) fields.documentType = "Tipo de documento é obrigatório.";
    if (!data.document) fields.document = "Número do documento é obrigatório.";
    if (!data.priceTable) fields.priceTable = "Tabela de preço padrão é obrigatória.";
    
    if (data.email) {
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(data.email)) {
          fields.email = "Formato de e-mail inválido.";
       }
    }
    
    if (Object.keys(fields).length > 0) {
       return res.status(400).json({ error: "Dados inválidos.", fields });
    }
    
    const oldRec = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    
    if (data.document && data.document !== oldRec[0].document) {
       const existingDoc = await db.select({ isActive: customers.isActive }).from(customers).where(eq(customers.document, data.document)).limit(1);
       if (existingDoc.length > 0) {
          if (existingDoc[0].isActive) {
             return res.status(409).json({ error: "Já existe um cliente cadastrado com este documento.", fields: { document: "Documento já está em uso." } });
          } else {
             return res.status(409).json({ error: "Já existe um cliente arquivado com este documento. Restaure ou exclua definitivamente o cliente antigo para reutilizar esse documento.", fields: { document: "Documento em uso por cliente arquivado." } });
          }
       }
    }

    await db.update(customers).set({ ...data, updatedAt: new Date() }).where(eq(customers.id, id));
    await logAction(req.user!.userId, "UPDATE", "customers", id, oldRec[0], data);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json(handleDbError(error, { document: "Já existe cliente com este documento." }));
  }
});

router.delete("/:id", requirePermission("customer", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(customers).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(customers.id, id));
    await logAction(req.user!.userId, "ARCHIVE", "customers", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;

    const usedInSales = await db.select({ count: sql<number>`count(*)` }).from(sales).where(eq(sales.customerId, id));
    if (Number(usedInSales[0].count) > 0) {
      return res.status(400).json({ error: "Este cliente possui histórico de vendas e não pode ser excluído definitivamente. Use a opção Arquivar." });
    }

    await db.delete(customers).where(eq(customers.id, id));
    await logAction(req.user!.userId, "HARD_DELETE_SUCCESS", "customers", id);
    res.json({ success: true });
  } catch (error: any) {
    await logAction(req.user!.userId, "HARD_DELETE_BLOCKED", "customers", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});

router.patch("/:id/restore", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(customers).set({ isActive: true, deletedAt: null, updatedAt: new Date() }).where(eq(customers.id, id));
    await logAction(req.user!.userId, "RESTORE", "customers", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
