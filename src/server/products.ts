import { Router } from "express";
import { db } from "../db";
import { products, productGroups, productSubgroups, shelves, stockBalances, stockMovements, saleItems, stockReservations, productSerials, rolePermissions, permissions, costLayers, purchaseOrders, purchaseOrderItems, suppliers } from "../db/schema";
import { eq, ilike, or, sql, and, isNull, desc, inArray } from "drizzle-orm";
import { requireAuth, requirePermission, AuthRequest } from "./authMiddleware";
import { logAction } from "./audit";
import { addLotStock, asExpiryDate, consumeLotsFEFO } from "./lots";
import { addCostLayer, consumeFifo } from "./costLayers";
import { v4 as uuidv4 } from "uuid";
import { toUpperText, handleDbError } from "./utils";
import { isValidCurrency } from "../lib/currency";

const router = Router();
router.use(requireAuth);

const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getAiErrorInfo(error: any) {
  const rawMessage = String(error?.message || error || "");
  const rawStatus = Number(error?.status || error?.code || 0);
  const isRateLimit = rawStatus === 429 || /RESOURCE_EXHAUSTED|quota exceeded|rate.?limit|too many requests/i.test(rawMessage);
  const isUnavailable = rawStatus === 503 || /UNAVAILABLE|temporarily unavailable|service unavailable/i.test(rawMessage);
  const retryMatch = rawMessage.match(/retry(?:\s+in|Delay[^0-9]*)\s*([0-9]+(?:\.[0-9]+)?)s/i);
  const retryAfterSeconds = retryMatch ? Math.max(1, Math.ceil(Number(retryMatch[1]))) : undefined;
  return { rawMessage, rawStatus, isRateLimit, isUnavailable, retryAfterSeconds };
}

async function generateAiContent(ai: any, prompt: string) {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await ai.models.generateContent({ model: AI_MODEL, contents: prompt });
    } catch (error: any) {
      lastError = error;
      const info = getAiErrorInfo(error);
      const canRetryRateLimit = info.isRateLimit && (info.retryAfterSeconds || 0) <= 4;
      const canRetryTransient = info.isUnavailable || info.rawStatus >= 500;
      if (attempt === 0 && (canRetryRateLimit || canRetryTransient)) {
        await sleep(Math.min(4000, Math.max(900, (info.retryAfterSeconds || 1) * 1000)));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

function sendFriendlyAiError(res: any, error: any, operation: string) {
  const info = getAiErrorInfo(error);
  if (info.isRateLimit) {
    const waitText = info.retryAfterSeconds ? ` Aguarde cerca de ${info.retryAfterSeconds} segundos e tente novamente.` : " Aguarde um momento e tente novamente.";
    return res.status(429).json({
      code: "AI_RATE_LIMIT",
      error: `Limite temporário da IA atingido.${waitText}`,
      retryAfterSeconds: info.retryAfterSeconds || null,
    });
  }
  if (info.isUnavailable) {
    return res.status(503).json({
      code: "AI_UNAVAILABLE",
      error: "A IA está temporariamente indisponível. Tente novamente em alguns instantes.",
    });
  }
  console.error(`AI ${operation} error:`, info.rawMessage);
  return res.status(500).json({
    code: "AI_ERROR",
    error: `Não foi possível ${operation} com a IA agora. Tente novamente ou preencha o campo manualmente.`,
  });
}

// Fotos extras: máx 4, mesma regra de tamanho da principal (base64 comprimido no cliente).
function validateExtraImages(images: any): string | null {
  if (images == null) return null;
  if (!Array.isArray(images)) return "Formato das fotos extras inválido.";
  if (images.length > 4) return "Máximo de 4 fotos extras.";
  for (const img of images) {
    const url = String(img?.imageUrl || "");
    if (url.startsWith("data:") && !url.startsWith("data:image/")) return "Arquivo de foto extra inválido (só imagem).";
    if (url.startsWith("data:image/") && url.length > 200000) return "Foto extra muito grande. Limite ~150KB (o envio pela tela já comprime sozinho).";
  }
  return null;
}

router.get("/check-sku", async (req: AuthRequest, res) => {
  try {
    const sku = toUpperText(req.query.sku as string);
    const excludeId = req.query.excludeId as string;
    if (!sku) return res.json({ exists: false, archived: false });
    
    let conditions = [eq(products.sku, sku)];
    if (excludeId) {
       conditions.push(sql`id != ${excludeId}`);
    }
    
    const p = await db.select({ isActive: products.isActive }).from(products).where(and(...conditions)).limit(1);
    if (p.length > 0) {
      if (p[0].isActive) {
        return res.json({ exists: true, archived: false, message: "Já existe um produto cadastrado com este SKU." });
      } else {
        return res.json({ exists: true, archived: true, message: "Já existe um produto arquivado com este SKU. Vá em Configurações > Arquivados para restaurar ou excluir definitivamente antes de reutilizar." });
      }
    }
    res.json({ exists: false, archived: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/check-upc", async (req: AuthRequest, res) => {
  try {
    const upc = toUpperText(req.query.upc as string);
    const excludeId = req.query.excludeId as string;
    if (!upc) return res.json({ exists: false, archived: false });
    
    let conditions = [eq(products.upc, upc)];
    if (excludeId) {
       conditions.push(sql`id != ${excludeId}`);
    }
    
    const p = await db.select({ isActive: products.isActive }).from(products).where(and(...conditions)).limit(1);
    if (p.length > 0) {
      if (p[0].isActive) {
        return res.json({ exists: true, archived: false, message: "Já existe um produto cadastrado com este UPC." });
      } else {
        return res.json({ exists: true, archived: true, message: "Já existe um produto arquivado com este UPC. Vá em Configurações > Arquivados para restaurar ou excluir definitivamente antes de reutilizar." });
      }
    }
    res.json({ exists: false, archived: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/search", async (req: AuthRequest, res) => {
  try {
    const search = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    
    let baseWhere = and(eq(products.isActive, true), isNull(products.deletedAt));
    if (search) {
      const searchWhere = or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.upc, `%${search}%`),
        ilike(products.brand, `%${search}%`),
        ilike(products.model, `%${search}%`)
      );
      baseWhere = and(baseWhere, searchWhere);
    }
    
    const list = await db.select({
      id: products.id,
      sku: products.sku,
      upc: products.upc,
      name: products.name,
      brand: products.brand,
      model: products.model,
      hasSerialNumber: products.hasSerialNumber,
      requiresLot: products.requiresLot,
      salePriceA: products.salePriceA,
      salePriceB: products.salePriceB,
      ivaPercentage: products.ivaPercentage,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock,
      shelfCode: shelves.name
    }).from(products)
    .leftJoin(stockBalances, eq(products.id, stockBalances.productId))
    .leftJoin(shelves, eq(products.shelfId, shelves.id))
    .where(baseWhere)
    .orderBy(products.name, products.sku)
    .limit(limit);

    const serialControlledIds = list
      .filter((item) => item.hasSerialNumber)
      .map((item) => item.id);

    const serialSummaryRows = serialControlledIds.length > 0
      ? await db.select({
          productId: productSerials.productId,
          availableCount: sql<number>`count(*)`,
          firstSerial: sql<string | null>`min(${productSerials.serialNumber})`,
        })
        .from(productSerials)
        .where(and(
          inArray(productSerials.productId, serialControlledIds),
          eq(productSerials.status, "AVAILABLE"),
        ))
        .groupBy(productSerials.productId)
      : [];

    const serialSummaryByProduct = new Map(
      serialSummaryRows.map((row) => [row.productId, {
        availableCount: Number(row.availableCount || 0),
        firstSerial: row.firstSerial || null,
      }]),
    );

    const formattedData = list.map(item => {
       const phys = item.physicalStock || 0;
       const resStock = item.reservedStock || 0;
       const serialSummary = serialSummaryByProduct.get(item.id);
       return {
         id: item.id,
         sku: item.sku,
         upc: item.upc,
         name: item.name,
         brand: item.brand,
         model: item.model,
         salePriceA: Number(item.salePriceA || 0),
         salePriceB: Number(item.salePriceB || 0),
         freightAmount: Number(item.ivaPercentage || 0),
         ivaPercentage: Number(item.ivaPercentage || 0),
         hasSerialNumber: !!item.hasSerialNumber,
         requiresLot: !!item.requiresLot,
         serialSummary: item.hasSerialNumber ? {
           firstSerial: serialSummary?.firstSerial || null,
           availableCount: serialSummary?.availableCount || 0,
         } : null,
         stock: {
           physical: phys,
           reserved: resStock,
           available: phys - resStock
         },
         shelf: {
           code: item.shelfCode || ''
         }
       }
    });

    res.json({ data: formattedData, total: formattedData.length, page: 1, limit });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

router.get("/", async (req: AuthRequest, res) => {
  try {
    const search = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const groupId = req.query.groupId as string;
    const subgroupId = req.query.subgroupId as string;
    const shelfId = req.query.shelfId as string;
    const stockStatus = req.query.stockStatus as string;
    const hasImage = req.query.hasImage as string;
    const hasSerialNumber = req.query.hasSerialNumber as string;
    
    let baseWhere = and(eq(products.isActive, true), isNull(products.deletedAt));

    if (groupId) baseWhere = and(baseWhere, eq(products.groupId, groupId));
    if (subgroupId) baseWhere = and(baseWhere, eq(products.subgroupId, subgroupId));
    if (shelfId) baseWhere = and(baseWhere, eq(products.shelfId, shelfId));
    
    if (hasSerialNumber === 'true') baseWhere = and(baseWhere, eq(products.hasSerialNumber, true));
    else if (hasSerialNumber === 'false') baseWhere = and(baseWhere, eq(products.hasSerialNumber, false));

    // Apply stock filters at database level before pagination, so total/page results stay correct.
    if (stockStatus === 'in-stock') {
       baseWhere = and(baseWhere, sql`(COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) > 0`);
    } else if (stockStatus === 'out-of-stock') {
       baseWhere = and(baseWhere, sql`(COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) <= 0`);
    } else if (stockStatus === 'low-stock') {
       baseWhere = and(baseWhere, sql`(COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) > 0 AND (COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) <= COALESCE(${products.minStock}, 0)`);
    }

    // Notice we'll handle hasImage by checking length of imageUrl or not null
    if (hasImage === 'true') {
       baseWhere = and(baseWhere, sql`length(${products.imageUrl}) > 0`);
    } else if (hasImage === 'false') {
       baseWhere = and(baseWhere, or(isNull(products.imageUrl), eq(products.imageUrl, "")));
    }

    if (search) {
      const searchWhere = or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.upc, `%${search}%`),
        ilike(products.brand, `%${search}%`),
        ilike(products.model, `%${search}%`)
      );
      baseWhere = and(baseWhere, searchWhere);
    }


    let baseQuery = db.select({
      id: products.id,
      sku: products.sku,
      upc: products.upc,
      name: products.name,
      description: products.description,
      brand: products.brand,
      model: products.model,
      groupId: products.groupId,
      subgroupId: products.subgroupId,
      shelfId: products.shelfId,
      unitMeasure: products.unitMeasure,
      costPrice: products.costPrice,
      salePriceA: products.salePriceA,
      salePriceB: products.salePriceB,
      salePriceC: products.salePriceC,
      costCurrency: products.costCurrency,
      saleCurrency: products.saleCurrency,
      ivaPercentage: products.ivaPercentage,
      hasSerialNumber: products.hasSerialNumber,
      requiresLot: products.requiresLot,
      minStock: products.minStock,
      imageUrl: products.imageUrl,
      isActive: products.isActive,
      groupName: productGroups.name,
      subgroupName: productSubgroups.name,
      shelfName: shelves.name,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock
    })
    .from(products)
    .leftJoin(productGroups, eq(products.groupId, productGroups.id))
    .leftJoin(productSubgroups, eq(products.subgroupId, productSubgroups.id))
    .leftJoin(shelves, eq(products.shelfId, shelves.id))
    .leftJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(baseWhere);

    let countQuery = db.select({ count: sql<number>`count(*)` })
      .from(products)
      .leftJoin(stockBalances, eq(products.id, stockBalances.productId))
      .where(baseWhere);


    let [list, countResult] = await Promise.all([
      baseQuery.orderBy(products.name, products.sku).limit(limit).offset(offset),
      countQuery,
    ]);
    const total = Number(countResult[0].count);

    // Strip cost for non-privileged users
    let isPrivileged = (req.user?.roleName || '').toLowerCase().includes('admin');
    if (!isPrivileged && req.user) {
        const hasPerm = await db.select().from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
           .where(and(eq(rolePermissions.roleId, req.user.roleId), eq(permissions.module, 'reports'), eq(permissions.action, 'profit'))).limit(1);
        if (hasPerm.length > 0) isPrivileged = true;
    }
    
    if (!isPrivileged) {
       list = list.map(item => ({ ...item, costPrice: "0" }));
    }

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

// Produtos com estoque no nível mínimo ou abaixo (para alerta de reposição).
router.get("/low-stock", async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const rows = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      minStock: products.minStock,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock,
    })
    .from(products)
    .leftJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(and(
      eq(products.isActive, true),
      isNull(products.deletedAt),
      sql`${products.minStock} > 0`,
      sql`coalesce(${stockBalances.physicalStock}, 0) <= ${products.minStock}`,
    ))
    .orderBy(sql`coalesce(${stockBalances.physicalStock}, 0) - ${products.minStock} asc`)
    .limit(limit);

    const data = rows.map((r) => ({
      ...r,
      physicalStock: Number(r.physicalStock || 0),
      available: Number(r.physicalStock || 0) - Number(r.reservedStock || 0),
      out: Number(r.physicalStock || 0) <= 0,
    }));
    res.json({ data, count: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/next-sku", async (req: AuthRequest, res) => {
  try {
     const groupId = req.query.groupId as string;
     const subgroupId = req.query.subgroupId as string;
     let prefix = "ZW";

     let targetGroupOrSub = null;
     
     if (subgroupId) {
        const sub = await db.select({ name: productSubgroups.name }).from(productSubgroups).where(eq(productSubgroups.id, subgroupId)).limit(1);
        if (sub.length > 0) targetGroupOrSub = sub[0];
     }
     
     if (!targetGroupOrSub && groupId) {
        const group = await db.select({ name: productGroups.name }).from(productGroups).where(eq(productGroups.id, groupId)).limit(1);
        if (group.length > 0) targetGroupOrSub = group[0];
     }

     if (targetGroupOrSub) {
         const rawName = targetGroupOrSub.name || "";
         const lettersOnly = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
         if (lettersOnly.length >= 3) {
            prefix = lettersOnly.slice(0, 3);
         } else {
            prefix = lettersOnly.padEnd(3, "X");
         }
     }

     const p = await db.select({ sku: products.sku })
       .from(products)
       .where(ilike(products.sku, `${prefix}-%`))
       .orderBy(desc(products.sku))
       .limit(100);

     let nextNum = 1;
     const regex = new RegExp(`^${prefix}-(\\d+)$`);
     for (const prodItem of p) {
        const itemSku = prodItem.sku || "";
        const m = itemSku.match(regex);
        if (m) {
           const num = parseInt(m[1], 10);
           if (num >= nextNum) {
              nextNum = num + 1;
           }
        }
     }

     res.json({ sku: `${prefix}-${nextNum.toString().padStart(4, '0')}` });
  } catch(e: any) {
     res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const prod = await db.select({
      id: products.id,
      sku: products.sku,
      upc: products.upc,
      name: products.name,
      description: products.description,
      brand: products.brand,
      model: products.model,
      groupId: products.groupId,
      subgroupId: products.subgroupId,
      shelfId: products.shelfId,
      unitMeasure: products.unitMeasure,
      costPrice: products.costPrice,
      salePriceA: products.salePriceA,
      salePriceB: products.salePriceB,
      salePriceC: products.salePriceC,
      ivaPercentage: products.ivaPercentage,
      hasSerialNumber: products.hasSerialNumber,
      requiresLot: products.requiresLot,
      ofertaQty: products.ofertaQty,
      ofertaPrice: products.ofertaPrice,
      outletQty: products.outletQty,
      outletPrice: products.outletPrice,
      minStock: products.minStock,
      imageUrl: products.imageUrl,
      technicalSpecs: products.technicalSpecs,
      isActive: products.isActive,
      groupName: productGroups.name,
      shelfName: shelves.name,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock
    }).from(products)
    .leftJoin(productGroups, eq(products.groupId, productGroups.id))
    .leftJoin(shelves, eq(products.shelfId, shelves.id))
    .leftJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(eq(products.id, id))
    .limit(1);

    if (prod.length === 0) return res.status(404).json({ error: "Produto não encontrado" });
    
    // Strip cost for non-privileged users
    let isPrivileged = (req.user?.roleName || '').toLowerCase().includes('admin');
    if (!isPrivileged && req.user) {
        const hasPerm = await db.select().from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
           .where(and(eq(rolePermissions.roleId, req.user.roleId), eq(permissions.module, 'reports'), eq(permissions.action, 'profit'))).limit(1);
        if (hasPerm.length > 0) isPrivileged = true;
    }
    const productData = { ...prod[0] };
    if (!isPrivileged) {
       productData.costPrice = "0";
    }

    // Fetch images
    const { productImages } = await import("../db/schema");
    const images = await db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(productImages.sortOrder);

    res.json({ ...productData, images });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao carregar produto" });
  }
});

// Compartilhado entre POST / e PUT /:id — normalização e validação eram
// copiadas quase inteiras nos dois handlers (risco de divergir sem querer).
function normalizeProductInput(rawData: any, technicalSpecs: any) {
  return {
    ...rawData,
    name: toUpperText(rawData.name),
    sku: toUpperText(rawData.sku),
    upc: toUpperText(rawData.upc),
    brand: toUpperText(rawData.brand),
    model: toUpperText(rawData.model),
    description: toUpperText(rawData.description),
    unitMeasure: toUpperText(rawData.unitMeasure),
    imageUrl: rawData.imageUrl || "",
    technicalSpecs: technicalSpecs || [],
    hasSerialNumber: !!rawData.hasSerialNumber,
    requiresLot: !!rawData.requiresLot,
    ofertaQty: Math.max(0, parseInt(rawData.ofertaQty) || 0),
    ofertaPrice: rawData.ofertaPrice ? String(rawData.ofertaPrice) : null,
    outletQty: Math.max(0, parseInt(rawData.outletQty) || 0),
    outletPrice: rawData.outletPrice ? String(rawData.outletPrice) : null,
    // Campos opcionais de FK/uuid: "" (select sem seleção) quebra o insert/update
    // ("invalid input syntax for type uuid") — normaliza pra null.
    groupId: rawData.groupId || null,
    subgroupId: rawData.subgroupId || null,
    shelfId: rawData.shelfId || null,
    parentId: rawData.parentId || null,
  };
}

function validateProductRequiredFields(data: any) {
  const fields: Record<string, string> = {};
  if (!data.name) fields.name = "Nome do produto é obrigatório.";
  if (!data.sku) fields.sku = "SKU é obrigatório.";
  if (!data.groupId) fields.groupId = "Grupo é obrigatório.";
  if (!data.salePriceA || parseFloat(data.salePriceA) <= 0) fields.salePriceA = "Preço A precisa ser maior que zero.";
  return fields;
}

// ofertaQty + outletQty não pode passar do estoque físico do produto —
// são subconjuntos do MESMO estoque, não quantidade nova.
function validateOfertaOutletQty(data: any, physicalStock: number): Record<string, string> {
  const fields: Record<string, string> = {};
  const total = (data.ofertaQty || 0) + (data.outletQty || 0);
  if (total > physicalStock) {
    fields.ofertaQty = `Oferta + Outlet (${total}) não pode passar do estoque físico (${physicalStock}).`;
  }
  return fields;
}

// excludeId: no update, ignora o próprio produto sendo editado no choque de SKU/UPC.
async function findSkuUpcConflict(field: "sku" | "upc", value: string, excludeId?: string) {
  if (!value) return null;
  const col = field === "sku" ? products.sku : products.upc;
  const rows = await db.select({ id: products.id, isActive: products.isActive }).from(products).where(eq(col, value)).limit(1);
  if (rows.length === 0 || (excludeId && rows[0].id === excludeId)) return null;
  const label = field.toUpperCase();
  return rows[0].isActive
    ? { error: `Já existe um produto cadastrado com este ${label}.`, fields: { [field]: `${label} já está em uso.` } }
    : { error: `Já existe um produto arquivado com este ${label}. Restaure ou exclua definitivamente o produto antigo para reutilizar esse ${label}.`, fields: { [field]: `${label} em uso por produto arquivado.` } };
}

router.post("/", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = uuidv4();
    const { initialPhysicalStock, entryReason, serials, images, technicalSpecs, ...rawData } = req.body;
    const data: any = normalizeProductInput(rawData, technicalSpecs);

    const fields = validateProductRequiredFields(data);
    if (Object.keys(fields).length > 0) {
       return res.status(400).json({ error: "Dados inválidos.", fields });
    }

    // Defaults for prices B and C if empty
    if (!data.salePriceB || parseFloat(data.salePriceB) <= 0) data.salePriceB = data.salePriceA;
    if (!data.salePriceC || parseFloat(data.salePriceC) <= 0) data.salePriceC = data.salePriceA;

    // Check image size base64 limit
    if (data.imageUrl && data.imageUrl.startsWith("data:image/") && data.imageUrl.length > 200000) {
        return res.status(400).json({ error: "Imagem muito grande.", fields: { imageUrl: "Limite sugerido 150KB." } });
    }
    {
      const imgErr = validateExtraImages(images);
      if (imgErr) return res.status(400).json({ error: imgErr });
    }

    const skuConflict = await findSkuUpcConflict("sku", data.sku);
    if (skuConflict) return res.status(409).json(skuConflict);
    const upcConflict = await findSkuUpcConflict("upc", data.upc);
    if (upcConflict) return res.status(409).json(upcConflict);

    const initialStock = parseInt(initialPhysicalStock) || 0;
    if (initialStock < 0) {
        return res.status(400).json({ error: "Estoque inicial não pode ser negativo.", fields: { initialPhysicalStock: "Quantidade precisa ser maior ou igual a zero." } });
    }

    const ofertaOutletErr = validateOfertaOutletQty(data, initialStock);
    if (Object.keys(ofertaOutletErr).length > 0) {
      return res.status(400).json({ error: "Oferta/Outlet inválidos.", fields: ofertaOutletErr });
    }

    if (data.hasSerialNumber && initialStock > 0) {
       if (!Array.isArray(serials) || serials.length !== initialStock) {
          return res.status(400).json({ error: "Erro de números de série.", fields: { serials: `O produto exige controle de S/N. Forneça exatamente ${initialStock} números de série.` } });
       }
       const uniqueSerials = new Set(serials.map(s => toUpperText(s)));
       if (uniqueSerials.size !== serials.length) {
          return res.status(400).json({ error: "Números de série duplicados.", fields: { serials: "S/N não pode ser duplicado na listagem." } });
       }
    }
    
    await db.transaction(async (tx) => {
      // Create product
      await tx.insert(products).values({
        ...data,
        id,
        costPrice: data.costPrice || "0",
        costCurrency: isValidCurrency(data.costCurrency) ? data.costCurrency : "BRL",
        salePriceA: data.salePriceA || "0",
        salePriceB: data.salePriceB || "0",
        salePriceC: data.salePriceC || "0",
        ivaPercentage: data.ivaPercentage || "0",
      });
      
      const { productImages } = await import("../db/schema");
      if (images && Array.isArray(images) && images.length > 0) {
         for (let i = 0; i < images.length; i++) {
           await tx.insert(productImages).values({
             productId: id,
             imageUrl: images[i].imageUrl,
             isPrimary: !!images[i].isPrimary,
             sortOrder: i
           });
         }
      }

      // Initialize stock balance (always create balance even if 0)
      await tx.insert(stockBalances).values({
        productId: id,
        physicalStock: initialStock,
        reservedStock: 0
      });

      if (initialStock > 0) {
        await tx.insert(stockMovements).values({
           id: uuidv4(),
           productId: id,
           quantity: initialStock,
           userId: req.user!.userId,
           movementType: "INITIAL_ENTRY",
           beforePhysical: 0,
           afterPhysical: initialStock,
           beforeReserved: 0,
           afterReserved: 0,
           reason: entryReason || "Estoque inicial"
        });
        
        if (data.hasSerialNumber && serials && serials.length > 0) {
           for (const sn of serials) {
              await tx.insert(productSerials).values({
                 id: uuidv4(),
                 productId: id,
                 serialNumber: toUpperText(sn)!,
                 status: "AVAILABLE"
              });
           }
        }
      }
      
      await logAction(req.user!.userId, "CREATE", "products", id, null, data);
    });

    res.status(201).json({ id });
  } catch (error: any) {
    console.error(error);
    const dbErr = handleDbError(error);
    res.status(400).json(dbErr);
  }
});

router.put("/:id", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const { initialPhysicalStock, entryReason, serials, images, technicalSpecs, ...rawData } = req.body;
    const data: any = normalizeProductInput(rawData, technicalSpecs);

    const fields = validateProductRequiredFields(data);
    if (Object.keys(fields).length > 0) {
       return res.status(400).json({ error: "Dados inválidos.", fields });
    }

    if (!data.salePriceB || parseFloat(data.salePriceB) <= 0) data.salePriceB = data.salePriceA;
    if (!data.salePriceC || parseFloat(data.salePriceC) <= 0) data.salePriceC = data.salePriceA;

    // Check image size base64 limit
    if (data.imageUrl && data.imageUrl.startsWith("data:image/") && data.imageUrl.length > 200000) {
        return res.status(400).json({ error: "Imagem muito grande.", fields: { imageUrl: "Limite sugerido 150KB." } });
    }
    {
      const imgErr = validateExtraImages(images);
      if (imgErr) return res.status(400).json({ error: imgErr });
    }

    const oldProduct = await db.select().from(products).where(eq(products.id, id)).limit(1);

    const [balance] = await db.select({ physicalStock: stockBalances.physicalStock })
      .from(stockBalances).where(eq(stockBalances.productId, id)).limit(1);
    const ofertaOutletErr = validateOfertaOutletQty(data, Number(balance?.physicalStock) || 0);
    if (Object.keys(ofertaOutletErr).length > 0) {
      return res.status(400).json({ error: "Oferta/Outlet inválidos.", fields: ofertaOutletErr });
    }

    const skuConflict = await findSkuUpcConflict("sku", data.sku, id);
    if (skuConflict) return res.status(409).json(skuConflict);
    const upcConflict = await findSkuUpcConflict("upc", data.upc, id);
    if (upcConflict) return res.status(409).json(upcConflict);

    await db.transaction(async (tx) => {
      await tx.update(products).set({
        ...data,
        costCurrency: isValidCurrency(data.costCurrency) ? data.costCurrency : "BRL",
        updatedAt: new Date(),
      }).where(eq(products.id, id));
      
      const { productImages } = await import("../db/schema");
      await tx.delete(productImages).where(eq(productImages.productId, id));
      
      if (images && Array.isArray(images) && images.length > 0) {
         for (let i = 0; i < images.length; i++) {
           await tx.insert(productImages).values({
             productId: id,
             imageUrl: images[i].imageUrl,
             isPrimary: !!images[i].isPrimary,
             sortOrder: i
           });
         }
      }
    });

    await logAction(req.user!.userId, "UPDATE", "products", id, oldProduct[0], data);
    res.json({ success: true });
  } catch (error: any) {
    const dbErr = handleDbError(error);
    res.status(400).json(dbErr);
  }
});

router.delete("/:id", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(products).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(products.id, id));
    await logAction(req.user!.userId, "ARCHIVE", "products", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;

    // Check relationships
    const usedInSales = await db.select({ count: sql<number>`count(*)` }).from(saleItems).where(eq(saleItems.productId, id));
    if (Number(usedInSales[0].count) > 0) {
      return res.status(400).json({ error: "Este registro possui histórico de vendas e não pode ser excluído definitivamente. Use a opção Arquivar." });
    }

    const usedInReservations = await db.select({ count: sql<number>`count(*)` }).from(stockReservations).where(eq(stockReservations.productId, id));
    if (Number(usedInReservations[0].count) > 0) {
      return res.status(400).json({ error: "Este registro possui histórico de reservas de estoque e não pode ser excluído definitivamente. Use a opção Arquivar." });
    }

    // Check product serials
    const serialsList = await db.select().from(productSerials).where(eq(productSerials.productId, id));
    const hasUnavailability = serialsList.some(s => s.status !== 'AVAILABLE');
    if (hasUnavailability) {
      return res.status(400).json({ error: "Este produto possui números de série com histórico e não pode ser excluído definitivamente. Use Arquivar." });
    }

    const { productImages, costLayers, costConsumptions } = await import("../db/schema");

    await db.transaction(async (tx) => {
      // delete serials
      await tx.delete(productSerials).where(eq(productSerials.productId, id));
      // deleting movements and balances is safe if there are no sales
      await tx.delete(stockMovements).where(eq(stockMovements.productId, id));
      await tx.delete(stockBalances).where(eq(stockBalances.productId, id));
      await tx.delete(productImages).where(eq(productImages.productId, id));
      // productId é NOT NULL nas duas — sem apagar aqui, o delete de products estoura erro de FK
      // cru pro cliente em vez da mensagem amigável "Use Arquivar" (achado da auditoria de banco).
      await tx.delete(costConsumptions).where(eq(costConsumptions.productId, id));
      await tx.delete(costLayers).where(eq(costLayers.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    });

    await logAction(req.user!.userId, "HARD_DELETE_SUCCESS", "products", id);
    res.json({ success: true });
  } catch (error: any) {
    await logAction(req.user!.userId, "HARD_DELETE_BLOCKED", "products", req.params.id, null, { error: error.message });
    res.status(500).json({ error: error.message || "Erro interno ao excluir registro." });
  }
});

router.patch("/:id/restore", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    await db.update(products).set({ isActive: true, deletedAt: null, updatedAt: new Date() }).where(eq(products.id, id));
    await logAction(req.user!.userId, "RESTORE", "products", id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Stock endpoints
router.get("/:id/stock/balance", async (req: AuthRequest, res) => {
  try {
    const balance = await db.select().from(stockBalances).where(eq(stockBalances.productId, req.params.id)).limit(1);
    if (!balance.length) return res.status(404).json({ error: "Estoque não encontrado" });
    const b = balance[0];
    res.json({ physicalStock: b.physicalStock, reservedStock: b.reservedStock, availableStock: b.physicalStock - b.reservedStock });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar saldo de estoque." });
  }
});

router.post("/:id/stock/move", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const productId = req.params.id;
    const { quantity, reason, notes } = req.body;
    const qty = parseInt(quantity);
    if (!qty || isNaN(qty)) return res.status(400).json({ error: "Quantidade inválida." });

    await db.transaction(async (tx) => {
      const balanceRes = await tx.select().from(stockBalances).where(eq(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque não encontrado.");
      const bal = balanceRes[0];

      if (qty < 0 && (bal.physicalStock - Math.abs(qty)) < bal.reservedStock) {
        throw new Error("Não é possível remover. A quantidade ultrapassa o estoque reservado.");
      }

      await tx.update(stockBalances)
        .set({ physicalStock: bal.physicalStock + qty, updatedAt: new Date() })
        .where(eq(stockBalances.productId, productId));

      await tx.insert(stockMovements).values({
        id: uuidv4(),
        productId,
        quantity: Math.abs(qty),
        userId: req.user!.userId,
        movementType: qty > 0 ? "MANUAL_ENTRY" : "MANUAL_EXIT",
        beforePhysical: bal.physicalStock,
        afterPhysical: bal.physicalStock + qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || (qty > 0 ? "Entrada manual" : "Saída manual"),
        notes
      });
    });
    
    await logAction(req.user!.userId, "STOCK_MOVE", "products", productId, null, { quantity: qty });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/stock/add", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const productId = req.params.id;
    const { quantity, reason, notes, costPrice, serials, lotNumber, expiryDate } = req.body;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Quantidade inválida." });

    await db.transaction(async (tx) => {
      // First verify product existence
      const productObj = await tx.select({ hasSerialNumber: products.hasSerialNumber, requiresLot: products.requiresLot }).from(products).where(eq(products.id, productId)).limit(1);
      if (productObj.length === 0) throw new Error("Produto não encontrado.");

      if (productObj[0].hasSerialNumber) {
         if (!Array.isArray(serials) || serials.length !== qty) {
           throw new Error(`Para este produto, você deve fornecer exatamente ${qty} números de série.`);
         }
      }

      if (productObj[0].requiresLot && !String(lotNumber || "").trim()) {
         throw new Error("Este produto é controlado por lote. Informe o número do lote na entrada.");
      }

      const balanceRes = await tx.select().from(stockBalances).where(eq(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque não encontrado.");
      const bal = balanceRes[0];

      await tx.update(stockBalances)
        .set({ physicalStock: bal.physicalStock + qty, updatedAt: new Date() })
        .where(eq(stockBalances.productId, productId));

      await tx.insert(stockMovements).values({
        id: uuidv4(),
        productId,
        quantity: qty,
        userId: req.user!.userId,
        movementType: "MANUAL_ENTRY",
        beforePhysical: bal.physicalStock,
        afterPhysical: bal.physicalStock + qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || "Entrada de estoque",
        notes
      });
      
      if (productObj[0].hasSerialNumber && serials) {
         const normalizedSerials = serials.map((s: unknown) => toUpperText(String(s))).filter(Boolean) as string[];
         if (normalizedSerials.length !== serials.length) throw new Error("A lista contém número de série vazio ou inválido.");
         const uniqueSerials: string[] = [...new Set<string>(normalizedSerials)];
         if (uniqueSerials.length !== normalizedSerials.length) throw new Error("Números de série duplicados na lista informada.");
         
         const existing = await tx.select({ id: productSerials.id })
           .from(productSerials)
           .where(and(eq(productSerials.productId, productId), inArray(productSerials.serialNumber, uniqueSerials)));
         if (existing.length > 0) throw new Error("Um ou mais números de série já constam neste produto.");

         for (const sn of uniqueSerials) {
            await tx.insert(productSerials).values({
               id: uuidv4(),
               productId: productId,
               serialNumber: sn,
               status: "AVAILABLE"
            });
         }
      }

      if (String(lotNumber || "").trim()) {
        await addLotStock(tx, productId, String(lotNumber), qty, asExpiryDate(expiryDate));
      }

      if (costPrice) {
        await tx.update(products).set({ costPrice: String(costPrice) }).where(eq(products.id, productId));
      }

      // CMP: entrada manual vira camada de custo (custo informado ou o atual do produto, em R$).
      const [pNow] = await tx.select({ costPrice: products.costPrice }).from(products).where(eq(products.id, productId)).limit(1);
      await addCostLayer(tx, { productId, qty, unitCostBrl: Number(costPrice || pNow?.costPrice || 0), note: reason || "Entrada manual" });
    });

    await logAction(req.user!.userId, "STOCK_ADD", "products", productId, null, { quantity: qty });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/stock/remove", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const productId = req.params.id;
    const { quantity, reason, notes } = req.body;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Quantidade inválida." });

    await db.transaction(async (tx) => {
      const balanceRes = await tx.select().from(stockBalances).where(eq(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque não encontrado.");
      const bal = balanceRes[0];

      if ((bal.physicalStock - qty) < bal.reservedStock) throw new Error("Não é possível remover. A quantidade ultrapassa o estoque reservado.");

      await tx.update(stockBalances)
        .set({ physicalStock: bal.physicalStock - qty, updatedAt: new Date() })
        .where(eq(stockBalances.productId, productId));

      // Produto com lote obrigatório: baixa também dos lotes (FEFO) pra soma dos lotes bater com o físico.
      const prodRow = await tx.select({ requiresLot: products.requiresLot }).from(products).where(eq(products.id, productId)).limit(1);
      if (prodRow[0]?.requiresLot) await consumeLotsFEFO(tx, productId, qty);
      // CMP: saída manual consome camadas FIFO.
      await consumeFifo(tx, productId, qty, { reason: "MANUAL_EXIT" });

      await tx.insert(stockMovements).values({
        id: uuidv4(),
        productId,
        quantity: qty,
        userId: req.user!.userId,
        movementType: "MANUAL_EXIT",
        beforePhysical: bal.physicalStock,
        afterPhysical: bal.physicalStock - qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || "Saída manual",
        notes
      });
    });
    
    await logAction(req.user!.userId, "STOCK_REMOVE", "products", productId, null, { quantity: qty });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/stock/adjust", requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const productId = req.params.id;
    const { newQty, reason, notes } = req.body;
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) return res.status(400).json({ error: "Quantidade inválida." });

    await db.transaction(async (tx) => {
      const balanceRes = await tx.select().from(stockBalances).where(eq(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque não encontrado.");
      const bal = balanceRes[0];

      const diff = qty - bal.physicalStock;
      if (diff === 0) throw new Error("A quantidade informada é igual ao estoque atual.");

      if (qty < bal.reservedStock) throw new Error("Não é possível ajustar o estoque físico para abaixo do estoque reservado.");

      await tx.update(stockBalances)
        .set({ physicalStock: qty, updatedAt: new Date() })
        .where(eq(stockBalances.productId, productId));

      // Lote obrigatório: na baixa consome dos lotes (FEFO); aumentar exige entrada de lote (lote+validade).
      const adjProd = await tx.select({ requiresLot: products.requiresLot, costPrice: products.costPrice }).from(products).where(eq(products.id, productId)).limit(1);
      if (adjProd[0]?.requiresLot) {
        if (diff < 0) await consumeLotsFEFO(tx, productId, Math.abs(diff));
        else throw new Error("Produto com lote obrigatório: para AUMENTAR o estoque use a Entrada de lote (informando lote e validade), não o ajuste.");
      }
      // CMP: ajuste pra baixo consome camadas FIFO; pra cima vira camada nova ao custo atual.
      if (diff < 0) await consumeFifo(tx, productId, Math.abs(diff), { reason: "ADJUSTMENT" });
      else await addCostLayer(tx, { productId, qty: diff, unitCostBrl: Number(adjProd[0]?.costPrice || 0), note: reason || "Ajuste de estoque" });

      await tx.insert(stockMovements).values({
        id: uuidv4(),
        productId,
        quantity: Math.abs(diff),
        userId: req.user!.userId,
        movementType: "MANUAL_ADJUSTMENT",
        beforePhysical: bal.physicalStock,
        afterPhysical: qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || "Ajuste de estoque",
        notes
      });
    });
    
    await logAction(req.user!.userId, "STOCK_ADJUST", "products", productId, null, { newQty: qty });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/stock/history", async (req: AuthRequest, res) => {
  try {
     const history = await db.select()
       .from(stockMovements)
       .where(eq(stockMovements.productId, req.params.id))
       .orderBy(desc(stockMovements.createdAt));
     res.json(history);
  } catch (err: any) {
     res.status(500).json({ error: "Erro ao buscar histórico." });
  }
});

// Histórico de compras do produto (camadas de custo FIFO): quando comprou, de quem, em que
// moeda/câmbio, e o custo médio ponderado do que ainda está em estoque. Tudo já é gravado a
// cada compra aprovada (addCostLayer em purchases.ts) — aqui só expõe pra tela.
router.get("/:id/cost-history", async (req: AuthRequest, res) => {
  try {
    const productId = req.params.id;

    // Cálculo do médio ponderado direto das camadas, sem join — join com
    // purchaseOrderItems abaixo é só pra exibição e pode, em tese, duplicar
    // linha se a mesma compra tiver mais de um lançamento do mesmo produto.
    const rawLayers = await db.select({
      qtyRemaining: costLayers.qtyRemaining,
      unitCostBrl: costLayers.unitCostBrl,
    }).from(costLayers).where(eq(costLayers.productId, productId));
    const totalQtyRemaining = rawLayers.reduce((a, r) => a + r.qtyRemaining, 0);
    const avgCostBrl = totalQtyRemaining > 0
      ? rawLayers.reduce((a, r) => a + r.qtyRemaining * Number(r.unitCostBrl), 0) / totalQtyRemaining
      : null;

    const layers = await db.select({
      id: costLayers.id,
      createdAt: costLayers.createdAt,
      qtyOriginal: costLayers.qtyOriginal,
      qtyRemaining: costLayers.qtyRemaining,
      unitCostBrl: costLayers.unitCostBrl,
      sourceCurrency: costLayers.sourceCurrency,
      fxRate: costLayers.fxRate,
      note: costLayers.note,
      invoiceNumber: purchaseOrders.invoiceNumber,
      invoiceDate: purchaseOrders.invoiceDate,
      supplierName: suppliers.name,
      originalUnitCost: purchaseOrderItems.costPrice,
    })
      .from(costLayers)
      .leftJoin(purchaseOrders, eq(purchaseOrders.id, costLayers.purchaseOrderId))
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(purchaseOrderItems, and(
        eq(purchaseOrderItems.purchaseOrderId, costLayers.purchaseOrderId),
        eq(purchaseOrderItems.productId, costLayers.productId),
      ))
      .where(eq(costLayers.productId, productId))
      .orderBy(desc(costLayers.createdAt));

    res.json({ layers, avgCostBrl, totalQtyRemaining });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar histórico de custo." });
  }
});

router.post("/ai/description", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const { name, brand, model, group, subgroup, upc } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Recurso de IA não configurado. Solicite a configuração ao administrador do sistema." });
    }
    
    // dynamically import SDK so if not updated it won't crash
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Escreva uma descrição curta, clara e objetiva para o seguinte produto. No máximo 3 a 5 linhas. Não escreva um texto longo de propaganda ou marketing, seja direto, útil para cadastro interno e ficha técnica.
    Nome: ${name || ""}
    Marca: ${brand || ""}
    Modelo: ${model || ""}
    Grupo: ${group || ""}
    Subgrupo: ${subgroup || ""}
    UPC: ${upc || ""}`;

    const response = await generateAiContent(ai, prompt);

    res.json({ description: response.text });
  } catch (error: any) {
    return sendFriendlyAiError(res, error, "gerar a descrição");
  }
});

router.post("/ai/specs", requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const { name, brand, model, group, subgroup, upc } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Recurso de IA não configurado. Solicite a configuração ao administrador do sistema." });
    }
    
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Gere uma descrição curta (sem propaganda, objetiva, 3-5 linhas) e uma lista de especificações técnicas para o produto abaixo.
    Retorne APENAS um JSON válido. Não adicione nenhum markdown (\`\`\`json) na resposta, apenas o texto bruto do JSON.
    Se o produto parecer um medicamento, não invente dosagens específicas e inclua "Apresentação", "Finalidade geral", "Observações" e "Aviso: Informações para cadastro interno. Consulte bula/fornecedor." nas especificações. Se não tiver certeza de um detalhe, use termos genéricos como "Não informado" ou "A confirmar".

    Formato JSON esperado:
    {
      "description": "descrição curta do produto...",
      "specs": [
        {"label": "Processador", "value": "Intel Core i5"},
        {"label": "Memória RAM", "value": "8GB"}
      ]
    }

    Produto:
    Nome: ${name || ""}
    Marca: ${brand || ""}
    Modelo: ${model || ""}
    Grupo: ${group || ""}
    Subgrupo: ${subgroup || ""}`;

    const response = await generateAiContent(ai, prompt);

    let text = response.text || "[]";
    // clean markdown if any
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed = { description: "", specs: [] };
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      console.log("Failed to parse AI response:", text);
      return res.status(502).json({ code: "AI_INVALID_RESPONSE", error: "A IA respondeu em um formato inesperado. Tente novamente." });
    }

    let warning = "";
    if (name?.toLowerCase().match(/comprimido|xarope|mg|gotas|pomada|gel|medicamento/)) {
      warning = "Cuidado com informações médicas geradas.";
    }

    res.json({ description: parsed.description, specs: parsed.specs, warning });
  } catch (error: any) {
    return sendFriendlyAiError(res, error, "gerar as especificações");
  }
});

export default router;
