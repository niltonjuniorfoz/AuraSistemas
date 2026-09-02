import { Router } from "express";
import { db } from "../db";
import {
  products, stockBalances, stockReservations, stockMovements, sales, saleItems, customers,
  storeOrders, companySettings, systemSettings, users, roles, auditLogs,
  productGroups, productGroupsDraft, productSubgroups, productImages, accountMovements, storePageviews,
  storeNewsletterSubscribers,
  brandLogos,
} from "../db/schema";
import { and, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { v4 as uuidv4 } from "uuid";
import { logAction } from "./audit";
import { isValidCpf, isFullName, onlyDigits } from "../lib/cpf";
import { round2, calcOrderTotal, formatBrl, MONEY_EPSILON } from "../lib/money";
import { dayEndUtc } from "../lib/dateRange";
import { cancelSaleTx } from "./storeOrderSync";
import { routePayment, reverseSaleMovements } from "./finance";
import { deleteDeadSaleRecords } from "./maintenance";
import { findMasterByPassword } from "./authMiddleware";
import { requireCustomerAuth, CustomerAuthRequest } from "./customerAuth";
import { createNotification } from "./notifications";
import geoip from "geoip-lite";

const router = Router();

// Mesma expressão SQL de "estoque disponível" usada em toda consulta pública
// (produto/variantes/relacionados) — função em vez de constante pra gerar um
// fragmento novo por consulta, sem reaproveitar objeto entre queries.
const availableStockExpr = () => sql<number>`greatest(${stockBalances.physicalStock} - ${stockBalances.reservedStock}, 0)`;
const PIX_SETTINGS_KEY = "company_pix";
const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FONT_URL_CHARS = 400000; // ~400KB base64 data URL — generous para um arquivo de fonte woff2
const MAX_ITEMS = 40;
const MAX_QTY_PER_ITEM = 99;

// Código curto e legível para o cliente acompanhar o pedido (sem caracteres ambíguos).
function makeOrderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `LJ-${s}`;
}

// Rate limit simples em memória por IP (a loja é pública: evita flood de pedidos).
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.resetAt) { hits.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}
const clientIp = (req: any) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();

async function getStoreConfig() {
  // Câmbio da loja pública vem do mesmo câmbio já mantido em Financeiro > Câmbio
  // (fx_rates: API AwesomeAPI + override manual) — a tabela "currencies" antiga
  // tinha painel próprio em Configurações > Moedas, mas os campos ficam
  // desabilitados sempre que o sistema opera em Real (systemCurrency=BRL),
  // que é o caso desta loja, então nunca dava pra preencher por ali.
  // resolveRates só lê o cache do banco - quem busca cotação nova na API é a
  // rota admin de Financeiro > Câmbio (/api/fx/today). Se ninguém nunca abriu
  // aquela tela (loja recém-criada, por exemplo), a loja pública nunca tinha
  // cotação de PYG salva e caía pro fallback rateToUsd=1 - preço em Guarani
  // aparecia igual ao valor em dólar (bug real reportado pelo usuário).
  // Agora a loja se garante sozinha: busca na API se o par não existir ainda.
  const { resolveRates, fetchApiRates } = await import("./fx");
  let fx = await resolveRates().catch(() => ({} as Record<string, { rate: number; source: string; day: string }>));
  if (!fx.USDBRL || !fx.USDPYG) {
    await fetchApiRates().catch((e) => console.error("[store] fetchApiRates falhou:", e.message));
    fx = await resolveRates().catch(() => fx);
  }
  const currencies = [
    { code: "USD", rateToUsd: 1 },
    ...(fx.USDBRL ? [{ code: "BRL", rateToUsd: fx.USDBRL.rate }] : []),
    ...(fx.USDPYG ? [{ code: "PYG", rateToUsd: fx.USDPYG.rate }] : []),
  ];
  const [cs] = await db.select().from(companySettings).limit(1);
  const pixRows = await db.select().from(systemSettings).where(eq(systemSettings.key, PIX_SETTINGS_KEY)).limit(1);
  const pix = (pixRows[0]?.value as any) || {};
  return {
    storeName: cs?.tradeName || cs?.companyName || "Sua loja",
    logoUrl: cs?.logoUrl || "",
    city: cs?.city || "",
    whatsapp: cs?.whatsappGateway || "",
    instagramUrl: cs?.instagramUrl || "",
    email: cs?.email || "",
    pixKey: pix.pixKey || "",
    currencies,
  };
}

/* ==================== PÚBLICO (sem login) ==================== */

// Dados básicos da loja (nome, contato). Nunca expõe chave PIX aqui.
router.get("/info", async (_req, res) => {
  try {
    const c = await getStoreConfig();
    // appVersion: a loja aberta há dias no navegador compara com a sua e avisa
    // pra recarregar — senão o formulário velho bate num servidor novo.
    const { APP_VERSION } = await import("../lib/version");
    res.json({ storeName: c.storeName, logoUrl: c.logoUrl, city: c.city, whatsapp: c.whatsapp, instagramUrl: c.instagramUrl, email: c.email, pixEnabled: !!c.pixKey, appVersion: APP_VERSION, currencies: c.currencies });
  } catch (err: any) { res.status(500).json({ error: "Loja indisponível." }); }
});

// PWA da vitrine: diferente do manifest do ERP, este pertence à loja da
// cliente. Nome, ícone e tela inicial acompanham Configurações > Empresa.
router.get("/manifest.webmanifest", async (_req, res) => {
  try {
    const c = await getStoreConfig();
    const name = String(c.storeName || "Sua loja").trim().slice(0, 80) || "Sua loja";
    res.type("application/manifest+json").set("Cache-Control", "no-store").json({
      name,
      short_name: name.slice(0, 24),
      description: `${name} — loja online`,
      start_url: "/loja/",
      scope: "/loja/",
      display: "standalone",
      orientation: "portrait",
      theme_color: "#d46a86",
      background_color: "#fff5f7",
      icons: [
        { src: "/api/store/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/store/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    });
  } catch {
    res.status(503).json({ error: "Manifesto da loja indisponível." });
  }
});

router.get("/icon/:size", async (req, res) => {
  try {
    const size = req.params.size === "512" ? "512" : "192";
    const c = await getStoreConfig();
    const logo = String(c.logoUrl || "");
    const data = logo.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (data) {
      res.type(data[1]).set("Cache-Control", "no-store").send(Buffer.from(data[2], "base64"));
      return;
    }
    if (/^https?:\/\//i.test(logo)) {
      res.redirect(302, logo);
      return;
    }
    if (/^\/branding\/[a-z0-9/_-]+\.png$/i.test(logo)) {
      res.redirect(302, logo);
      return;
    }
    // Sem logo cadastrada, a vitrine usa uma marca neutra. A identidade Aura
    // pertence ao sistema administrativo e não deve aparecer como logo do cliente.
    res.redirect(302, `/branding/store-placeholder-${size}.png?v=1`);
  } catch {
    const size = req.params.size === "512" ? "512" : "192";
    res.redirect(302, `/branding/store-placeholder-${size}.png?v=1`);
  }
});

// Condição base do catálogo: ativo, visível na loja e com estoque livre.
const catalogWhere = () => and(
  eq(products.isActive, true),
  eq(products.storeVisible, true),
  isNull(products.parentId)
);

// Faixa de disponibilidade em vez do número exato (não entrega inteligência de estoque).
// stockLabel fica só em PT-BR pro assistente de IA (nunca vai pra tela do
// cliente) - o front traduz sozinho a partir de stockStatus/stockQty,
// senão o texto ficava travado em português pra loja inteira (bug real
// reportado: "Disponível" aparecia igual em ES/EN).
const publicStock = (available: number) => ({
  stockLabel: available > 10 ? "Disponível" : available > 0 ? `Últimas ${available} un` : "Esgotado",
  stockStatus: available > 10 ? "available" : available > 0 ? "low" : "out",
  stockQty: available > 0 ? available : undefined,
  maxQty: Math.min(available, MAX_QTY_PER_ITEM),
});

// Catálogo com busca, filtro por categoria e ordenação.
router.get("/products", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const group = String(req.query.group || "").trim();
    const subgroup = String(req.query.subgroup || "").trim();
    const sort = String(req.query.sort || "name");
    const brand = String(req.query.brand || "").trim();
    const model = String(req.query.model || "").trim();
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    const canal = String(req.query.canal || "").trim(); // '' | 'oferta' | 'outlet'
    // ids=a,b,c: busca direta (destaques do admin, e a home busca os produtos
    // de TODAS as vitrines manuais numa chamada só — até 20 vitrines x 12
    // produtos, então o teto aqui precisa acompanhar, senão vitrine some
    // silenciosamente quando a soma passar de 12).
    const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 240);
    // limit=N: respeita o que o front pede (ex.: vitrines da home pedem 8);
    // sem o parâmetro, mantém o teto de sempre pro catálogo completo.
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 120) : 120;
    // Preço pra ordenar é o mesmo preço exibido no card: pra produto com
    // variação isso é o menor preço entre elas, não o preço do produto-pai.
    const effectivePrice = sql`coalesce((select min(v.sale_price_a) from products v where v.parent_id = ${products.id} and v.is_active = true and v.store_visible = true), ${products.salePriceA})`;
    const orderBy =
      sort === "price_asc" ? sql`${effectivePrice} asc` :
      sort === "price_desc" ? sql`${effectivePrice} desc` :
      sort === "newest" ? desc(products.createdAt) :
      sql`${products.name} asc`;

    // Fora do canal Oferta/Outlet, preço exibido é o normal. Dentro de um
    // canal, é o preço promocional daquele canal (com fallback pro normal
    // se o cadastro tiver quantidade mas esqueceu de por preço).
    const priceExpr = canal === "oferta" ? sql`coalesce(${products.ofertaPrice}, ${products.salePriceA})`
      : canal === "outlet" ? sql`coalesce(${products.outletPrice}, ${products.salePriceA})`
      : products.salePriceA;

    const rows = await db.select({
      id: products.id, name: products.name, sku: products.sku, imageUrl: products.imageUrl,
      price: priceExpr, description: products.storeDescription,
      brand: products.brand, model: products.model, groupId: products.groupId, groupName: productGroups.name,
      available: availableStockExpr(),
    })
      .from(products)
      .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
      .leftJoin(productGroups, eq(products.groupId, productGroups.id))
      .where(and(
        catalogWhere(),
        ids.length > 0 ? inArray(products.id, ids) : undefined,
        group ? eq(products.groupId, group) : undefined,
        subgroup ? eq(products.subgroupId, subgroup) : undefined,
        canal === "oferta" ? sql`${products.ofertaQty} > 0` : undefined,
        canal === "outlet" ? sql`${products.outletQty} > 0` : undefined,
        search ? or(sql`${products.name} ILIKE ${"%" + search + "%"}`, sql`${products.sku} ILIKE ${"%" + search + "%"}`) : undefined,
        brand ? eq(products.brand, brand) : undefined,
        model ? sql`${products.model} ILIKE ${"%" + model + "%"}` : undefined,
        Number.isFinite(minPrice) ? sql`${effectivePrice} >= ${minPrice}` : undefined,
        Number.isFinite(maxPrice) ? sql`${effectivePrice} <= ${maxPrice}` : undefined,
      ))
      .orderBy(orderBy)
      .limit(limit);
    const parentIds = rows.map((r) => r.id);
    const variantsMap: Record<string, any[]> = {};
    if (parentIds.length > 0) {
      const vRows = await db.select({
        id: products.id, parentId: products.parentId, variantName: products.variantName, price: products.salePriceA,
        available: availableStockExpr(),
      })
      .from(products)
      .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
      .where(and(eq(products.isActive, true), eq(products.storeVisible, true), inArray(products.parentId, parentIds)));
      
      for (const v of vRows) {
        if (!variantsMap[v.parentId!]) variantsMap[v.parentId!] = [];
        variantsMap[v.parentId!].push({
          id: v.id, variantName: v.variantName, price: Number(v.price), available: Number(v.available)
        });
      }
    }

    // Galeria pro efeito de troca de foto no hover do card (home/catálogo) —
    // uma query só pra todos os produtos da página, não uma por card.
    const galleryMap: Record<string, string[]> = {};
    if (parentIds.length > 0) {
      const galleryRows = await db.select({ productId: productImages.productId, imageUrl: productImages.imageUrl })
        .from(productImages)
        .where(inArray(productImages.productId, parentIds))
        .orderBy(productImages.sortOrder);
      for (const g of galleryRows) {
        (galleryMap[g.productId] ||= []).push(g.imageUrl);
      }
    }

    res.json({
      data: rows.map((p) => {
        const variants = variantsMap[p.id] || [];
        const hasVariants = variants.length > 0;
        const totalAvailable = hasVariants ? variants.reduce((acc, v) => acc + v.available, 0) : Number(p.available);
        const displayPrice = hasVariants ? Math.min(...variants.map(v => v.price)) : Number(p.price);
        const images = [...(p.imageUrl ? [p.imageUrl] : []), ...(galleryMap[p.id] || [])].filter(Boolean).slice(0, 4);

        return {
          id: p.id, name: p.name, sku: p.sku, imageUrl: p.imageUrl, images,
          price: displayPrice, description: p.description,
          brand: p.brand, model: p.model, groupId: p.groupId, groupName: p.groupName,
          hasVariants,
          variants: variants.map(v => ({ ...v, ...publicStock(v.available) })),
          ...publicStock(totalAvailable),
        };
      }),
    });
  } catch (err: any) { res.status(500).json({ error: "Erro ao carregar catálogo." }); }
});

// Metadados pro painel de filtros do catálogo: marcas disponíveis (só as que
// têm produto visível de verdade, não a lista inteira já cadastrada) e o
// intervalo de preço real da loja — usado como limites do slider.
router.get("/filters", async (_req, res) => {
  try {
    const effectivePrice = sql`coalesce((select min(v.sale_price_a) from products v where v.parent_id = ${products.id} and v.is_active = true and v.store_visible = true), ${products.salePriceA})`;
    const [brandRows, priceRow, ofertaCount, outletCount] = await Promise.all([
      db.selectDistinct({ brand: products.brand }).from(products)
        .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
        .where(and(catalogWhere(), sql`${products.brand} is not null and ${products.brand} <> ''`))
        .orderBy(products.brand),
      db.select({ min: sql<number>`min(${effectivePrice})`, max: sql<number>`max(${effectivePrice})` })
        .from(products)
        .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
        .where(catalogWhere()),
      db.select({ n: sql<number>`count(*)` }).from(products)
        .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
        .where(and(catalogWhere(), sql`${products.ofertaQty} > 0`)),
      db.select({ n: sql<number>`count(*)` }).from(products)
        .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
        .where(and(catalogWhere(), sql`${products.outletQty} > 0`)),
    ]);
    res.json({
      brands: brandRows.map((r) => r.brand).filter(Boolean),
      priceMin: Math.floor(Number(priceRow[0]?.min) || 0),
      priceMax: Math.ceil(Number(priceRow[0]?.max) || 0),
      hasOferta: Number(ofertaCount[0]?.n) > 0,
      hasOutlet: Number(outletCount[0]?.n) > 0,
    });
  } catch (err: any) { res.status(500).json({ error: "Erro ao carregar filtros." }); }
});

// Marcas visíveis com logo cadastrado, na ordem definida pelo admin — é só
// isso que a home da loja consome (nenhum filtro de estoque: marca some da
// loja só se o admin ocultar ou apagar o logo, não por falta de estoque).
router.get("/brands", async (_req, res) => {
  try {
    const rows = await db.select().from(brandLogos)
      .where(and(eq(brandLogos.visible, true), isNotNull(brandLogos.logoUrl)))
      .orderBy(brandLogos.sortOrder);
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: "Erro ao carregar marcas." }); }
});

// Categorias com contagem de produtos disponíveis (pra navegação da vitrine).
router.get("/categories", async (_req, res) => {
  try {
    const [rows, countRows, subgroupRows] = await Promise.all([
      db.select({
        id: productGroups.id,
        name: productGroups.name,
        icon: productGroups.icon,
        sortOrder: productGroups.sortOrder,
      })
        .from(productGroups)
        .where(and(eq(productGroups.storeVisible, true), eq(productGroups.isActive, true), isNull(productGroups.deletedAt)))
        .orderBy(productGroups.sortOrder, productGroups.name),
      db.select({ groupId: products.groupId, count: sql<number>`count(*)` })
        .from(products)
        .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
        .where(catalogWhere())
        .groupBy(products.groupId),
      // Subgrupos só entram na navegação se tiverem produto visível de
      // verdade — subgrupo vazio não aparece como botão no catálogo.
      db.select({
        id: productSubgroups.id, groupId: productSubgroups.groupId, name: productSubgroups.name,
      })
        .from(products)
        .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
        .innerJoin(productSubgroups, eq(products.subgroupId, productSubgroups.id))
        .where(and(catalogWhere(), eq(productSubgroups.isActive, true)))
        .groupBy(productSubgroups.id, productSubgroups.groupId, productSubgroups.name)
        .orderBy(productSubgroups.name),
    ]);
    const countByGroup = new Map(countRows.map((row) => [row.groupId, Number(row.count)]));
    const subgroupsByGroup: Record<string, { id: string; name: string }[]> = {};
    for (const sg of subgroupRows) {
      (subgroupsByGroup[sg.groupId] ||= []).push({ id: sg.id, name: sg.name });
    }
    res.json({
      data: rows.map((r) => ({ ...r, count: countByGroup.get(r.id) || 0, subgroups: subgroupsByGroup[r.id] || [] })),
    });
  } catch (err: any) { res.status(500).json({ error: "Erro ao carregar categorias." }); }
});

// Function que a IA do assistente chama (via tool-calling do Gemini) pra
// saber preço/disponibilidade real de um produto — nunca inventa, sempre
// bate no banco. Reaproveita a MESMA query ILIKE do catálogo (catalogWhere,
// linha ~95) e a MESMA faixa de disponibilidade que a loja já mostra pro
// humano (publicStock, linha ~102) — nunca inventa um número que a loja
// não mostraria de qualquer forma pro público, mas pode citar a mesma
// contagem baixa que o site já exibe ("Últimas N un").
// Produto com variantes (tamanho/cor): a linha "pai" (parentId nulo) que
// catalogWhere() casa nunca tem preço/estoque próprio confiável — o preço
// exibido na loja é o menor preço entre as variantes, e o estoque é a soma
// delas (mesma agregação de /products e /product/:id, store.ts:168-216).
async function buscarProdutoImpl(nomeBuscado: string) {
  const termo = String(nomeBuscado || "").trim().slice(0, 100);
  if (!termo) return { encontrados: [] };
  const rows = await db.select({
    id: products.id,
    name: products.name,
    price: products.salePriceA,
    available: availableStockExpr(),
  })
    .from(products)
    .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(and(catalogWhere(), or(
      sql`${products.name} ILIKE ${"%" + termo + "%"}`,
      sql`${products.sku} ILIKE ${"%" + termo + "%"}`,
    )))
    .limit(5);
  if (rows.length === 0) return { encontrados: [] };

  const parentIds = rows.map((r) => r.id);
  const variantRows = await db.select({
    parentId: products.parentId,
    price: products.salePriceA,
    available: availableStockExpr(),
  })
    .from(products)
    .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(and(eq(products.isActive, true), eq(products.storeVisible, true), inArray(products.parentId, parentIds)));
  const variantsByParent: Record<string, { price: number; available: number }[]> = {};
  for (const v of variantRows) {
    if (!v.parentId) continue;
    (variantsByParent[v.parentId] ||= []).push({ price: Number(v.price), available: Number(v.available) });
  }

  return {
    encontrados: rows.map((r) => {
      const variants = variantsByParent[r.id] || [];
      const hasVariants = variants.length > 0;
      const available = hasVariants ? variants.reduce((acc, v) => acc + v.available, 0) : Number(r.available);
      const price = hasVariants ? Math.min(...variants.map((v) => v.price)) : Number(r.price);
      return {
        nome: r.name,
        preco: formatBrl(price),
        disponibilidade: publicStock(available).stockLabel,
      };
    }),
  };
}

// Assistente de IA da loja: perguntas gerais (categorias, como funciona
// pagamento/pedido) e também preço/disponibilidade de produto específico —
// nesse caso a IA chama a function buscarProduto, que bate no banco de
// verdade, nunca inventa. Contexto é montado aqui no servidor a cada
// mensagem (nunca no cliente) pra ninguém manipular o system prompt.
router.post("/assistant/chat", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`assistant:${ip}`, 200, 10 * 60 * 1000)) {
      // Log pra descobrir a causa real se voltar a travar rápido mesmo com o
      // limite alto: várias pessoas atrás do mesmo IP (wifi único da loja),
      // um bot/scraper batendo no endpoint, ou o resolvedor de IP (clientIp)
      // devolvendo o mesmo valor pra visitantes diferentes.
      console.warn(`[assistant] rate limit atingido — ip=${ip || "(vazio)"}`);
      return res.status(429).json({ code: "AI_RATE_LIMIT", error: "Muitas mensagens. Aguarde alguns minutos e tente de novo." });
    }

    const message = String(req.body?.message || "").trim().slice(0, 500);
    if (!message) return res.status(400).json({ error: "Mensagem vazia." });
    const lang = ["es", "pt", "en"].includes(req.body?.lang) ? req.body.lang : "es";
    const historyRaw = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = historyRaw
      .filter((h: any) => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
      .slice(-10)
      .map((h: any) => ({ role: h.role, text: String(h.text).slice(0, 500) }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ code: "AI_UNAVAILABLE", error: "Assistente não configurado." });

    const [company] = await db.select({ tradeName: companySettings.tradeName, companyName: companySettings.companyName }).from(companySettings).limit(1);
    const categoryRows = await db.select({ name: productGroups.name })
      .from(products)
      .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
      .innerJoin(productGroups, eq(products.groupId, productGroups.id))
      .where(and(catalogWhere(), eq(productGroups.storeVisible, true)))
      .groupBy(productGroups.id, productGroups.name);
    const categoryNames = [...new Set(categoryRows.map((r) => r.name))];

    const langName = { es: "español", pt: "português", en: "English" }[lang as "es" | "pt" | "en"];
    const storeName = company?.tradeName || company?.companyName || "a loja";
    const systemPrompt = `Você é a assistente de vendas da loja online "${storeName}".
Responda SEMPRE em ${langName}, em no máximo 3 frases, com tom simpático de atendente.
Categorias de produto que a loja vende hoje: ${categoryNames.length > 0 ? categoryNames.join(", ") : "(nenhuma cadastrada ainda)"}.
Como funciona a compra: o cliente escolhe o produto na vitrine, adiciona ao carrinho, paga via PIX (QR Code gerado na hora), envia o comprovante pelo WhatsApp, e combina retirada ou entrega.
Você TEM uma function "buscarProduto" pra consultar preço e disponibilidade real de um produto específico — use ela sempre que o cliente perguntar sobre um produto por nome. Nunca invente preço ou disponibilidade sem chamar a function.
Se o cliente perguntar algo sem relação com a loja (política, concorrentes, assuntos pessoais, etc.), recuse educadamente e sugira uma das perguntas rápidas ou o catálogo do site — não tente responder o assunto fora do escopo.
Só sugira falar no WhatsApp com um atendente humano quando você genuinamente não souber responder (ex.: reclamação, negociação, pedido já feito, pergunta fora do que você tem acesso) — não repita essa sugestão em toda resposta.`;

    const { GoogleGenAI, Type, createUserContent, createPartFromFunctionResponse } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const buscarProdutoTool = {
      name: "buscarProduto",
      description: "Busca produtos da loja pelo nome ou parte do nome. Devolve até 5 produtos com preço e disponibilidade (faixa, não quantidade exata).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING, description: "Nome ou parte do nome do produto buscado pelo cliente" },
        },
        required: ["nome"],
      },
    };
    const genConfig = { systemInstruction: systemPrompt, tools: [{ functionDeclarations: [buscarProdutoTool] }] };
    let contents: any[] = [
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: "user", parts: [{ text: message }] },
    ];

    // Retry único em erro transitório (rate-limit/5xx do próprio Gemini) —
    // mesmo espírito do generateAiContent() já usado em products.ts, sem
    // repassar pro cliente um erro que uma segunda tentativa resolveria.
    // Extraído em função porque agora pode rodar até 2 vezes na mesma
    // requisição (chamada inicial + chamada final depois da function).
    const callGemini = async (): Promise<{ result?: any; err?: any }> => {
      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const result = await ai.models.generateContent({ model, contents, config: genConfig });
          return { result };
        } catch (err: any) {
          lastErr = err;
          const status = err?.status || err?.rawStatus || 0;
          const isTransient = status === 429 || status >= 500 || status === 503;
          if (attempt === 0 && isTransient) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          break;
        }
      }
      return { err: lastErr };
    };

    const respondWithError = (err: any) => {
      const status = err?.status || err?.rawStatus || 0;
      if (status === 429) return res.status(429).json({ code: "AI_RATE_LIMIT", error: "Assistente ocupado agora. Tente de novo em instantes." });
      if (status >= 500 || status === 503) return res.status(503).json({ code: "AI_UNAVAILABLE", error: "Assistente temporariamente indisponível." });
      console.error("assistant chat error:", err?.message || err);
      return res.status(500).json({ code: "AI_ERROR", error: "Não consegui responder agora." });
    };

    let { result, err } = await callGemini();
    if (err) return respondWithError(err);

    const calls = result.functionCalls;
    if (calls && calls.length > 0 && calls[0].name === "buscarProduto") {
      const call = calls[0];
      const funcResult = await buscarProdutoImpl(String(call.args?.nome || ""));
      // Turno do modelo (com a functionCall) + turno com o resultado da
      // function — precisa ser Content[] explícito (role "model"/"user"),
      // o SDK não monta isso sozinho pra Parts de function (README do
      // @google/genai, seção Function Calling: "This doesn't apply to
      // FunctionCall and FunctionResponse parts... you need to explicitly
      // provide the full Content[] structure").
      const modelTurn = result.candidates?.[0]?.content ?? { role: "model", parts: [{ functionCall: call }] };
      contents = [
        ...contents,
        modelTurn,
        createUserContent(createPartFromFunctionResponse(call.id ?? call.name ?? "buscarProduto", call.name, funcResult)),
      ];
      ({ result, err } = await callGemini());
      if (err) return respondWithError(err);
      // Não deixa a IA encadear uma segunda function-call na mesma
      // mensagem — se pedir de novo, trata como erro em vez de looping.
      if (result.functionCalls && result.functionCalls.length > 0) {
        console.error("assistant chat error: segunda function-call encadeada, abortando");
        return res.status(500).json({ code: "AI_ERROR", error: "Não consegui responder agora." });
      }
    }

    const reply = String(result?.text || "").trim();
    if (!reply) return res.status(500).json({ code: "AI_ERROR", error: "Não consegui responder agora." });
    res.json({ reply });
  } catch (err: any) { res.status(500).json({ error: "Erro no assistente." }); }
});

// Página de produto: detalhe + galeria + relacionados do mesmo grupo.
router.get("/product/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const [p] = await db.select({
      id: products.id, name: products.name, sku: products.sku, imageUrl: products.imageUrl,
      price: products.salePriceA, storeDescription: products.storeDescription,
      description: products.description, brand: products.brand, model: products.model,
      groupId: products.groupId, groupName: productGroups.name,
      available: availableStockExpr(),
    })
      .from(products)
      .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
      .leftJoin(productGroups, eq(products.groupId, productGroups.id))
      .where(and(catalogWhere(), eq(products.id, id)))
      .limit(1);
    if (!p) return res.status(404).json({ error: "Produto não disponível." });

    const gallery = await db.select({ imageUrl: productImages.imageUrl })
      .from(productImages).where(eq(productImages.productId, id)).orderBy(productImages.sortOrder);

    const related = p.groupId ? await db.select({
      id: products.id, name: products.name, imageUrl: products.imageUrl,
      price: products.salePriceA,
      available: availableStockExpr(),
    })
      .from(products)
      .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
      .where(and(catalogWhere(), eq(products.groupId, p.groupId), sql`${products.id} <> ${id}`))
      .orderBy(desc(products.createdAt))
      .limit(4) : [];

    const variantsRows = await db.select({
      id: products.id, variantName: products.variantName, price: products.salePriceA,
      available: availableStockExpr()
    })
    .from(products)
    .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(and(eq(products.isActive, true), eq(products.storeVisible, true), eq(products.parentId, id)));

    const variants = variantsRows.map(v => ({
      id: v.id, variantName: v.variantName, price: Number(v.price), ...publicStock(Number(v.available))
    }));
    const totalAvailable = variants.length > 0 ? variantsRows.reduce((sum, v) => sum + Number(v.available), 0) : Number(p.available);
    const displayPrice = variants.length > 0 ? Math.min(...variants.map(v => v.price)) : Number(p.price);

    res.json({
      id: p.id, name: p.name, sku: p.sku,
      price: displayPrice,
      description: p.storeDescription || p.description || "",
      brand: p.brand, model: p.model, groupId: p.groupId, groupName: p.groupName,
      images: [...(p.imageUrl ? [p.imageUrl] : []), ...gallery.map((g) => g.imageUrl)].filter(Boolean),
      variants,
      hasVariants: variants.length > 0,
      ...publicStock(totalAvailable),
      related: related.map((r) => ({ id: r.id, name: r.name, imageUrl: r.imageUrl, price: Number(r.price), ...publicStock(Number(r.available)) })),
    });
  } catch (err: any) { res.status(500).json({ error: "Erro ao carregar produto." }); }
});

  // Contagem de visualização de página pública — só alimenta o card "Visualizações de
  // página" do Painel. Sem sessão/PII, um jeito simples de saber se a loja está sendo vista.
  router.post("/pageview", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!rateLimit(`pageview:${ip}`, 60, 60 * 1000)) return res.status(429).json({ error: "Rate limit exceeded" });
      const path = String(req.body?.path || "/loja").slice(0, 200);
      // visitorId é um UUID gerado no navegador (localStorage) — só serve pra agrupar
      // "mesmo aparelho", nunca é ligado a nome/CPF/telefone do cliente.
      const visitorId = req.body?.visitorId ? String(req.body.visitorId).slice(0, 64) : null;
      // Geolocalização por IP (estimativa, offline, sem mandar o IP pra nenhum serviço externo) —
      // só grava o resultado (país/estado/cidade), nunca o IP em si.
      let country: string | null = null, region: string | null = null, city: string | null = null;
      try {
        const geo = geoip.lookup(ip);
        if (geo) {
          country = geo.country || null;
          region = geo.region || null;
          city = geo.city || null;
        }
      } catch { /* geolocalização é bônus — nunca derruba o registro da visualização */ }
      await db.insert(storePageviews).values({ path, visitorId, country, region, city });
      res.status(201).json({ success: true });
    } catch { res.status(200).json({ success: false }); } // nunca deixa isso quebrar a navegação do cliente
  });

  // Cadastro simples de ofertas da home. Repetir o mesmo e-mail apenas
  // reativa a inscrição, sem duplicar contato e sem criar cliente incompleto.
  router.post("/newsletter", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!rateLimit(`newsletter:${ip}`, 8, 10 * 60 * 1000)) {
        return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      }
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ error: "Informe um e-mail válido." });
      }
      await db.insert(storeNewsletterSubscribers)
        .values({ email, source: "HOME_FIRST_ORDER" })
        .onConflictDoUpdate({
          target: storeNewsletterSubscribers.email,
          set: { isActive: true, source: "HOME_FIRST_ORDER", updatedAt: new Date() },
        });
      return res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("Erro ao cadastrar newsletter:", err);
      return res.status(500).json({ error: "Não foi possível cadastrar agora." });
    }
  });

  // Criação silenciosa do lead (Carrinho Abandonado)
  router.post("/cart/abandoned", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!rateLimit(`cart_abandoned:${ip}`, 10, 5 * 60 * 1000)) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }

      const { customerPhone, customerName, items } = req.body;
      if (!customerPhone || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const phoneClean = customerPhone.replace(/\D/g, '');
      if (phoneClean.length < 10) return res.status(400).json({ error: "Invalid phone" });

      const { abandonedCarts } = await import("../db/schema");

      // Upsert atômico (em vez de SELECT + UPDATE/INSERT separados): dois cliques rápidos do
      // mesmo cliente não corriam risco de duplicar (customer_phone já é UNIQUE no banco), mas
      // caíam no 500 genérico por violar a constraint em vez de simplesmente atualizar o carrinho.
      // Status sempre vira PENDING aqui — tanto "só atualiza os itens" (já estava PENDING) quanto
      // "ressuscita" (estava IGNORED/RECOVERED) chegavam nesse mesmo resultado antes.
      const updateSet: any = { cartData: items, status: "PENDING", updatedAt: new Date() };
      if (customerName) updateSet.customerName = customerName;

      await db.insert(abandonedCarts)
        .values({ customerPhone, customerName: customerName || null, cartData: items, status: "PENDING" })
        .onConflictDoUpdate({ target: abandonedCarts.customerPhone, set: updateSet });

      return res.json({ ok: true });
    } catch (err: any) { 
      console.error("Erro no carrinho abandonado:", err);
      res.status(500).json({ error: "Internal error" }); 
    }
  });

  // Admin list abandoned carts
  router.get("/admin/abandoned-carts", requireAuth, requirePermission("sales", "view"), async (req: AuthRequest, res) => {
    try {
      const { abandonedCarts } = await import("../db/schema");
      const list = await db.select().from(abandonedCarts)
        .where(eq(abandonedCarts.status, "PENDING"))
        .orderBy(desc(abandonedCarts.updatedAt));
      return res.json(list);
    } catch (err: any) { 
      res.status(500).json({ error: "Internal error" }); 
    }
  });

// Simulação de cálculo de frete (Correios/Melhor Envio Mock)
router.post("/shipping/calculate", async (req, res) => {
  try {
    const { cep, items } = req.body;
    if (!cep || !items || !items.length) {
      return res.status(400).json({ success: false, error: "CEP e itens são obrigatórios." });
    }

    // Em uma integração real, aqui faríamos um map nos items para pegar o peso
    // do banco de dados, calcular a cubagem e chamar a API do Melhor Envio ou Correios.
    // Para esta Fase 4, retornaremos um Mock:
    
    // Simular latência de rede
    await new Promise((r) => setTimeout(r, 800));

    // Lógica boba apenas para exibir preços diferentes baseados no estado (se conseguíssemos saber pelo CEP)
    // Vamos usar números mágicos pelo cep para variar o valor:
    const baseVal = parseInt(cep.replace(/\\D/g, "").substring(0,2)) || 10;
    
    res.json({
      success: true,
      data: [
        { id: "pac", name: "PAC", feeBrl: (15 + (baseVal * 0.5)).toFixed(2), days: 7 },
        { id: "sedex", name: "SEDEX", feeBrl: (30 + baseVal).toFixed(2), days: 3 },
      ]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cria o pedido: valida preço/estoque no servidor, gera a venda no ERP (PENDING),
// reserva o estoque e devolve o código + payload PIX.
router.post("/orders", requireCustomerAuth, async (req: CustomerAuthRequest, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`order:${ip}`, 5, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Muitos pedidos deste dispositivo. Tente novamente em alguns minutos." });
    }

    const { deliveryType, address, cep, street, number, neighborhood, city, state, shippingMethod, shippingFeeBrl, notes, items, couponCode, shippingZoneId, acceptedTerms } = req.body || {};
    if (!acceptedTerms) return res.status(400).json({ error: "É preciso aceitar os termos do pedido para continuar." });

    // Identidade vem da conta logada (Minha Conta), não mais de campos digitados no formulário —
    // ninguém mais consegue "emprestar" o CPF de outra pessoa pra fechar um pedido.
    const [buyer] = await db.select().from(customers).where(eq(customers.id, req.customer!.customerId)).limit(1);
    if (!buyer) return res.status(401).json({ error: "Conta não encontrada. Faça login novamente." });
    const name = buyer.name;
    const phone = onlyDigits(buyer.phone || "");
    const cpf = onlyDigits(buyer.document || "");
    if (!isValidCpf(cpf)) return res.status(400).json({ error: "O CPF da sua conta está inválido — atualize em Meus dados antes de comprar." });

    // Quem paga o PIX. Se for outra pessoa, o comprador declara nome e CPF dela
    // — é isso que sustenta o pagamento de terceiro numa contestação.
    const payerIsBuyer = req.body?.payerIsBuyer !== false;
    let payerName2: string | null = null;
    let payerCpf: string | null = null;
    if (!payerIsBuyer) {
      payerName2 = String(req.body?.payerDeclaredName || "").trim().replace(/\s+/g, " ");
      payerCpf = onlyDigits(req.body?.payerDeclaredCpf);
      if (!isFullName(payerName2)) return res.status(400).json({ error: "Informe o nome completo de quem vai pagar." });
      if (!isValidCpf(payerCpf)) return res.status(400).json({ error: "CPF de quem vai pagar é inválido." });
      if (payerCpf === cpf) return res.status(400).json({ error: "O CPF do pagador é o mesmo seu — escolha \"eu mesmo\" acima." });
    }
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Carrinho vazio." });
    if (items.length > MAX_ITEMS) return res.status(400).json({ error: "Pedido muito grande. Fale conosco pelo WhatsApp." });
    const delivery = deliveryType === "DELIVERY" ? "DELIVERY" : "PICKUP";
    if (delivery === "DELIVERY" && String(address || "").trim().length < 8) {
      return res.status(400).json({ error: "Informe o endereço de entrega." });
    }

    // Texto vigente dos termos — vai gravado no pedido como prova do que foi aceito.
    const terms = await getStoreVitrineConfig();

    const result = await db.transaction(async (tx) => {
      // Usuário "dono" do sistema recebe a venda (sales.user_id é obrigatório).
      const [owner] = await tx.select({ id: users.id }).from(users).leftJoin(roles, eq(users.roleId, roles.id))
        .where(and(eq(users.isActive, true), sql`lower(coalesce(${roles.name}, '')) in ('master','admin','administrador','administrator')`))
        .limit(1);
      if (!owner) throw new Error("Loja sem operador configurado.");

      // Cliente já existe e está autenticado (Minha Conta) — só completa endereço/telefone se
      // estava faltando, nunca sobrescreve dado já cadastrado.
      const customerId = buyer.id;
      const patch: any = {};
      if (!buyer.phone && phone) patch.phone = phone;
      if (!buyer.address && delivery === "DELIVERY" && address) patch.address = String(address).trim();
      if (Object.keys(patch).length > 0) {
        await tx.update(customers).set({ ...patch, updatedAt: new Date() }).where(eq(customers.id, customerId));
      }

      const ids = [...new Set(items.map((i: any) => String(i.productId)))];
      const prods = await tx.select({
        id: products.id, name: products.name, price: products.salePriceA, isActive: products.isActive,
        storeVisible: products.storeVisible, requiresLot: products.requiresLot,
        physical: stockBalances.physicalStock, reserved: stockBalances.reservedStock,
      }).from(products).innerJoin(stockBalances, eq(products.id, stockBalances.productId))
        .where(inArray(products.id, ids as string[]))
        .for("update"); // trava o estoque enquanto valida

      const map = new Map(prods.map((p) => [p.id, p]));
      let subtotal = 0;
      const toInsert: any[] = [];
      const saleId = uuidv4();

      for (const raw of items) {
        const p = map.get(String(raw.productId));
        const qty = Math.floor(Number(raw.quantity) || 0);
        if (!p || !p.isActive || !p.storeVisible) throw new Error("Um dos produtos não está mais disponível.");
        if (qty <= 0 || qty > MAX_QTY_PER_ITEM) throw new Error("Quantidade inválida no pedido.");
        const free = Number(p.physical) - Number(p.reserved);
        if (qty > free) throw new Error(`Estoque insuficiente de "${p.name}". Disponível: ${Math.max(0, free)}.`);

        // PREÇO SEMPRE DO BANCO — nunca o que veio do navegador.
        const unit = Number(p.price);
        const total = round2(unit * qty);
        subtotal = round2(subtotal + total);
        toInsert.push({
          id: uuidv4(), saleId, productId: p.id, quantity: qty,
          unitPrice: unit.toFixed(2), totalPrice: total.toFixed(2),
          discountAmount: "0", ivaAmount: "0",
        });
      }

      // FASE E4 — frete por região ou método direto
      let shippingFee = 0;
      let zoneName: string | null = null;
      if (delivery === "DELIVERY") {
        // Frete SEMPRE resolvido pelo servidor a partir da zona cadastrada — nunca aceitar um
        // valor de frete vindo do cliente (POST direto conseguiria zerar o total do pedido).
        if (!shippingZoneId) throw new Error("Opção de frete inválida.");
        const { storeShippingZones } = await import("../db/schema");
        const [zone] = await tx.select().from(storeShippingZones)
          .where(and(eq(storeShippingZones.id, String(shippingZoneId)), eq(storeShippingZones.isActive, true))).limit(1);
        if (!zone) throw new Error("Região de entrega inválida. Escolha de novo.");
        shippingFee = round2(Number(zone.feeBrl));
        zoneName = zone.name;
      }

      // FASE E4 — cupom revalidado DENTRO da transação com lock (uso concorrente não fura maxUses).
      let discount = 0;
      let appliedCoupon: string | null = null;
      if (couponCode && String(couponCode).trim()) {
        const { storeCoupons } = await import("../db/schema");
        const codeUp = String(couponCode).trim().toUpperCase();
        const [c] = await tx.select().from(storeCoupons).where(eq(storeCoupons.code, codeUp)).for("update").limit(1);
        if (!c || !c.isActive) throw new Error("Cupom não encontrado ou inativo.");
        const nowD = new Date();
        if (c.validFrom && nowD < new Date(c.validFrom)) throw new Error("Cupom ainda não está valendo.");
        if (c.validUntil && nowD > new Date(c.validUntil)) throw new Error("Cupom expirado.");
        if (c.maxUses != null && Number(c.usedCount) >= Number(c.maxUses)) throw new Error("Cupom esgotado.");
        const min = c.minOrderBrl != null ? Number(c.minOrderBrl) : 0;
        if (subtotal < min) throw new Error(`Pedido mínimo de R$ ${min.toFixed(2).replace(".", ",")} pra usar esse cupom.`);
        // Desconto incide sobre os PRODUTOS (frete não entra).
        discount = c.type === "FIXED" ? Math.min(round2(Number(c.value)), subtotal) : round2(subtotal * Number(c.value) / 100);
        appliedCoupon = codeUp;
        await tx.update(storeCoupons).set({ usedCount: Number(c.usedCount) + 1, updatedAt: new Date() }).where(eq(storeCoupons.id, c.id));
      }

      const grandTotal = calcOrderTotal(subtotal, discount, shippingFee);

      // Venda no ERP: confirmada, aguardando pagamento, aguardando entrega.
      // totalAmount inclui o frete; o desconto do cupom entra em discountAmount.
      await tx.insert(sales).values({
        id: saleId, series: "LOJ", userId: owner.id, customerId,
        priceTable: "A", subtotalAmount: round2(subtotal + shippingFee).toFixed(2), discountAmount: discount.toFixed(2),
        ivaAmount: "0", totalAmount: grandTotal.toFixed(2), currency: "BRL",
        orderStatus: "CONFIRMED", paymentStatus: "PENDING", fulfillmentStatus: "PENDING",
        observations: `PEDIDO ONLINE - ${name} - ${phone}${delivery === "DELIVERY" ? ` - ENTREGA: ${String(address).trim()}` : " - RETIRADA"}${zoneName ? ` - REGIAO: ${zoneName} (FRETE R$ ${shippingFee.toFixed(2)})` : ""}${appliedCoupon ? ` - CUPOM: ${appliedCoupon} (-R$ ${discount.toFixed(2)})` : ""}${notes ? ` - OBS: ${String(notes).trim()}` : ""}`.toUpperCase(),
      });
      await tx.insert(saleItems).values(toInsert);

      // Reserva de estoque (mesmo fluxo do PDV).
      for (const it of toInsert) {
        const p = map.get(it.productId)!;
        const beforeRes = Number(p.reserved);
        const newRes = beforeRes + Number(it.quantity);
        await tx.update(stockBalances).set({ reservedStock: newRes, updatedAt: new Date() }).where(eq(stockBalances.productId, it.productId));
        await tx.insert(stockReservations).values({ id: uuidv4(), saleId, productId: it.productId, quantity: it.quantity, status: "ACTIVE" });
        await tx.insert(stockMovements).values({
          id: uuidv4(), productId: it.productId, movementType: "STORE_ORDER_RESERVE", quantity: it.quantity,
          userId: owner.id, referenceId: saleId,
          beforePhysical: Number(p.physical), afterPhysical: Number(p.physical),
          beforeReserved: beforeRes, afterReserved: newRes,
          notes: "Reserva de pedido da loja online",
        });
        p.reserved = newRes as any; // reflete para os próximos itens do mesmo produto
      }

      // Código único do pedido (tenta algumas vezes por segurança).
      let code = makeOrderCode();
      for (let i = 0; i < 5; i++) {
        const exists = await tx.select({ id: storeOrders.id }).from(storeOrders).where(eq(storeOrders.code, code)).limit(1);
        if (!exists.length) break;
        code = makeOrderCode();
      }

      const [order] = await tx.insert(storeOrders).values({
        code, saleId, customerName: name, customerPhone: phone,
        customerDocument: cpf,
        customerId,
        // Prova de aceite: texto exato, versão, quando, de onde e de qual aparelho.
        clientUserAgent: String(req.headers["user-agent"] || "").slice(0, 400),
        termsVersion: terms.termsVersion,
        termsAcceptedAt: new Date(),
        // Pagamento por terceiro entra no próprio texto aceito — a autorização
        // fica provada junto com o resto.
        termsSnapshot: payerIsBuyer
          ? terms.termsText
          : `${terms.termsText}\n\nDeclaração adicional: autorizo que o pagamento deste pedido seja feito por ${payerName2} (CPF ${payerCpf}), com o meu conhecimento e a meu pedido.`,
        payerIsBuyer,
        payerDeclaredName: payerName2,
        payerDeclaredCpf: payerCpf,
        deliveryType: delivery, 
        address: delivery === "DELIVERY" ? String(address).trim() : null,
        cep: delivery === "DELIVERY" && cep ? String(cep).trim() : null,
        street: delivery === "DELIVERY" && street ? String(street).trim() : null,
        number: delivery === "DELIVERY" && number ? String(number).trim() : null,
        neighborhood: delivery === "DELIVERY" && neighborhood ? String(neighborhood).trim() : null,
        city: delivery === "DELIVERY" && city ? String(city).trim() : null,
        state: delivery === "DELIVERY" && state ? String(state).trim() : null,
        shippingMethod: delivery === "DELIVERY" && shippingMethod ? String(shippingMethod).trim() : null,
        notes: notes ? String(notes).trim() : null,
        totalAmount: grandTotal.toFixed(2),
        subtotalBrl: subtotal.toFixed(2),
        couponCode: appliedCoupon,
        discountBrl: discount > 0 ? discount.toFixed(2) : null,
        shippingZone: zoneName,
        shippingFeeBrl: zoneName != null ? shippingFee.toFixed(2) : null,
        status: "AWAITING_PAYMENT", clientIp: ip,
      }).returning();

      // Se esse cliente tinha um carrinho abandonado pendente, marcamos como RECUPERADO
      const phoneClean = phone.replace(/\D/g, '');
      if (phoneClean.length >= 10) {
        const { abandonedCarts } = await import("../db/schema");
        await tx.update(abandonedCarts)
          .set({ status: "RECOVERED", updatedAt: new Date() })
          .where(eq(abandonedCarts.customerPhone, phone));
      }

      await tx.insert(auditLogs).values({
        id: uuidv4(), userId: owner.id, action: "STORE_ORDER_CREATED", tableName: "store_orders",
        recordId: order.id, newValues: JSON.stringify({ code, total: grandTotal, subtotal, discount, shippingFee, coupon: appliedCoupon, items: toInsert.length }),
      });

      return { code: order.code, total: grandTotal, customerName: order.customerName };
    });

    await createNotification(db, {
      type: "ORDER_NEW", title: "Novo pedido recebido",
      message: `${result.customerName} fez o pedido ${result.code} no valor de ${formatBrl(result.total)}.`,
      link: "/store-orders",
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: any) { res.status(400).json({ error: err.message || "Não foi possível criar o pedido." }); }
});

// Status do pedido + dados de pagamento (PIX copia-e-cola gerado no servidor).
router.get("/orders/:code", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`order_lookup:${ip}`, 30, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado." });

    const items = order.saleId
      ? await db.select({ name: products.name, quantity: saleItems.quantity, unitPrice: saleItems.unitPrice, totalPrice: saleItems.totalPrice })
          .from(saleItems).leftJoin(products, eq(saleItems.productId, products.id))
          .where(eq(saleItems.saleId, order.saleId))
      : [];

    const cfg = await getStoreConfig();
    // Gera o copia-e-cola PIX já COM o valor (campo 54 do payload) — o cliente
    // não digita nada no banco, só confirma.
    const makePix = async (amount: number, txid: string) => {
      if (!cfg.pixKey) return "";
      const { buildPixPayload } = await import("../lib/pix");
      try {
        return buildPixPayload({
          pixKey: cfg.pixKey, amount,
          merchantName: cfg.storeName, merchantCity: cfg.city || "CIDADE", txid,
        });
      } catch { return ""; }
    };
    const openForPayment = order.status === "AWAITING_PAYMENT" || order.status === "PROOF_SENT";
    const pixPayload = order.status === "AWAITING_PAYMENT" ? await makePix(Number(order.totalAmount), order.code.replace("-", "")) : "";

    // Pagamento dividido (2+ PIX): cada parcela tem o seu QR com o valor dela.
    const { storeOrderPayments } = await import("../db/schema");
    const parts = await db.select().from(storeOrderPayments)
      .where(eq(storeOrderPayments.orderId, order.id)).orderBy(storeOrderPayments.seq);
    const payments = [];
    for (const p of parts) {
      payments.push({
        id: p.id, seq: p.seq, amount: Number(p.amountBrl), status: p.status,
        hasProof: !!p.proofData,
        pixPayload: openForPayment && p.status !== "CONFIRMED" && !p.proofData
          ? await makePix(Number(p.amountBrl), `${order.code.replace("-", "")}${p.seq}`)
          : "",
      });
    }
    const paidSent = payments.filter((p) => p.hasProof).reduce((s, p) => s + p.amount, 0);

    res.json({
      pixConfigured: !!cfg.pixKey,
      payments,
      paidSent: round2(paidSent),
      remaining: round2(Math.max(0, Number(order.totalAmount) - paidSent)),
      code: order.code, status: order.status, total: Number(order.totalAmount),
      subtotal: order.subtotalBrl != null ? Number(order.subtotalBrl) : Number(order.totalAmount),
      couponCode: order.couponCode || null,
      discount: order.discountBrl != null ? Number(order.discountBrl) : 0,
      shippingZone: order.shippingZone || null,
      shippingFee: order.shippingFeeBrl != null ? Number(order.shippingFeeBrl) : 0,
      customerName: order.customerName, deliveryType: order.deliveryType, address: order.address,
      createdAt: order.createdAt, hasProof: !!order.proofData,
      deliveryConfirmedAt: order.deliveryConfirmedAt,
      items, pixPayload, pixKey: order.status === "AWAITING_PAYMENT" ? cfg.pixKey : "",
      storeName: cfg.storeName, whatsapp: cfg.whatsapp,
    });
  } catch (err: any) { res.status(500).json({ error: "Erro ao consultar pedido." }); }
});

// Cliente anexa o comprovante do PIX (imagem ou PDF em base64).
router.post("/orders/:code/proof", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`proof:${ip}`, 10, 10 * 60 * 1000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });

    const code = String(req.params.code || "").toUpperCase().trim();
    const { fileName, fileType, data } = req.body || {};
    if (!data || typeof data !== "string") return res.status(400).json({ error: "Envie o arquivo do comprovante." });
    const okType = /^(image\/(png|jpe?g|webp)|application\/pdf)$/i.test(String(fileType || ""));
    if (!okType) return res.status(400).json({ error: "Formato inválido. Envie imagem (JPG/PNG) ou PDF." });
    const approxBytes = Math.floor((data.length * 3) / 4);
    if (approxBytes > MAX_PROOF_BYTES) return res.status(400).json({ error: "Arquivo muito grande (máx. 5 MB)." });

    const [order] = await db.select().from(storeOrders).where(eq(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });

    await db.update(storeOrders).set({
      proofFileName: String(fileName || "comprovante").slice(0, 120),
      proofFileType: String(fileType), proofFileSize: approxBytes, proofData: data,
      proofSentAt: new Date(), status: order.status === "AWAITING_PAYMENT" ? "PROOF_SENT" : order.status,
      updatedAt: new Date(),
    }).where(eq(storeOrders.id, order.id));

    await createNotification(db, {
      type: "PAYMENT_PROOF", title: "Comprovante recebido",
      message: `${order.customerName} enviou o comprovante do pedido ${order.code} — confira e confirme.`,
      link: "/store-orders",
    });

    res.json({ success: true, status: "PROOF_SENT" });
  } catch (err: any) { res.status(400).json({ error: "Não foi possível enviar o comprovante." }); }
});

// Cliente confirma que recebeu/retirou o pedido — prova de entrega, com data,
// IP e aparelho. Só depois do pagamento confirmado, e só uma vez.
router.post("/orders/:code/received", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`received:${ip}`, 20, 10 * 60 * 1000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });

    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });
    if (order.status !== "CONFIRMED") return res.status(400).json({ error: "O pagamento ainda não foi confirmado pela loja." });
    if (order.deliveryConfirmedAt) return res.json({ success: true, alreadyConfirmed: true });

    await db.update(storeOrders).set({
      deliveryConfirmedAt: new Date(),
      deliveryConfirmedIp: ip,
      deliveryConfirmedUserAgent: String(req.headers["user-agent"] || "").slice(0, 400),
      updatedAt: new Date(),
    }).where(eq(storeOrders.id, order.id));

    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: "Não foi possível registrar o recebimento." }); }
});

/* ---- Pagamento em partes (o banco do cliente não deixa mandar tudo de uma vez) ---- */

const MAX_PARTS = 6;

// Divide o total em N partes iguais; a diferença de centavos vai na última.
function splitAmount(total: number, parts: number) {
  const base = Math.floor((total * 100) / parts) / 100;
  const values = Array.from({ length: parts }, () => base);
  values[parts - 1] = round2(total - base * (parts - 1));
  return values;
}

// Cliente escolhe em quantos PIX vai pagar (1 = volta pro pagamento único).
router.post("/orders/:code/split", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`split:${ip}`, 20, 10 * 60 * 1000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });

    const parts = Math.floor(Number(req.body?.parts) || 0);
    if (!(parts >= 1 && parts <= MAX_PARTS)) return res.status(400).json({ error: `Escolha de 1 a ${MAX_PARTS} pagamentos.` });

    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });
    if (order.status === "CONFIRMED") return res.status(400).json({ error: "Este pedido já está pago." });

    const { storeOrderPayments } = await import("../db/schema");
    const existing = await db.select().from(storeOrderPayments).where(eq(storeOrderPayments.orderId, order.id));
    // Já mandou comprovante de alguma parte: não deixa remontar a divisão.
    if (existing.some((p) => !!p.proofData)) {
      return res.status(400).json({ error: "Já existe comprovante enviado. Fale com a loja pelo WhatsApp para ajustar a divisão." });
    }

    await db.delete(storeOrderPayments).where(eq(storeOrderPayments.orderId, order.id));
    if (parts > 1) {
      const values = splitAmount(Number(order.totalAmount), parts);
      await db.insert(storeOrderPayments).values(values.map((amount, i) => ({
        orderId: order.id, seq: i + 1, amountBrl: amount.toFixed(2),
      })));
    }
    res.json({ success: true, parts });
  } catch (err: any) { res.status(400).json({ error: "Não foi possível dividir o pagamento." }); }
});

// Comprovante de UMA parte do pagamento.
router.post("/orders/:code/payments/:paymentId/proof", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`proof:${ip}`, 15, 10 * 60 * 1000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });

    const { fileName, fileType, data } = req.body || {};
    if (!data || typeof data !== "string") return res.status(400).json({ error: "Envie o arquivo do comprovante." });
    const okType = /^(image\/(png|jpe?g|webp)|application\/pdf)$/i.test(String(fileType || ""));
    if (!okType) return res.status(400).json({ error: "Formato inválido. Envie imagem (JPG/PNG) ou PDF." });
    const approxBytes = Math.floor((data.length * 3) / 4);
    if (approxBytes > MAX_PROOF_BYTES) return res.status(400).json({ error: "Arquivo muito grande (máx. 5 MB)." });

    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });

    const { storeOrderPayments } = await import("../db/schema");
    const [part] = await db.select().from(storeOrderPayments)
      .where(and(eq(storeOrderPayments.id, String(req.params.paymentId)), eq(storeOrderPayments.orderId, order.id))).limit(1);
    if (!part) return res.status(404).json({ error: "Pagamento não encontrado neste pedido." });

    await db.update(storeOrderPayments).set({
      proofFileName: String(fileName || "comprovante").slice(0, 120),
      proofFileType: String(fileType), proofFileSize: approxBytes, proofData: data,
      proofSentAt: new Date(), status: part.status === "CONFIRMED" ? "CONFIRMED" : "PROOF_SENT",
      updatedAt: new Date(),
    }).where(eq(storeOrderPayments.id, part.id));

    // Só marca o pedido como "comprovante enviado" quando TODAS as partes têm comprovante.
    const all = await db.select().from(storeOrderPayments).where(eq(storeOrderPayments.orderId, order.id));
    const allSent = all.every((p) => !!p.proofData);
    if (allSent && order.status === "AWAITING_PAYMENT") {
      await db.update(storeOrders).set({ status: "PROOF_SENT", proofSentAt: new Date(), updatedAt: new Date() }).where(eq(storeOrders.id, order.id));
    }
    res.json({ success: true, allSent });
  } catch (err: any) { res.status(400).json({ error: "Não foi possível enviar o comprovante." }); }
});

/* ==================== ADMIN (com login) ==================== */

router.get("/admin/orders", requireAuth, requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const rows = await db.select({
      id: storeOrders.id, code: storeOrders.code, saleId: storeOrders.saleId,
      customerName: storeOrders.customerName, customerPhone: storeOrders.customerPhone,
      customerDocument: storeOrders.customerDocument, customerId: storeOrders.customerId,
      clientIp: storeOrders.clientIp, clientUserAgent: storeOrders.clientUserAgent,
      termsVersion: storeOrders.termsVersion, termsAcceptedAt: storeOrders.termsAcceptedAt,
      receivedAmountBrl: storeOrders.receivedAmountBrl, payerName: storeOrders.payerName,
      payerIsBuyer: storeOrders.payerIsBuyer, payerDeclaredName: storeOrders.payerDeclaredName,
      payerDeclaredCpf: storeOrders.payerDeclaredCpf,
      deliveryConfirmedAt: storeOrders.deliveryConfirmedAt,
      deliveryType: storeOrders.deliveryType, address: storeOrders.address, notes: storeOrders.notes,
      totalAmount: storeOrders.totalAmount, status: storeOrders.status,
      proofFileName: storeOrders.proofFileName, proofSentAt: storeOrders.proofSentAt,
      createdAt: storeOrders.createdAt, confirmedAt: storeOrders.confirmedAt,
      saleNumber: sales.number, saleSeries: sales.series, salePaymentStatus: sales.paymentStatus,
      // Pedido pago em partes: quantas partes existem e quantas já têm comprovante.
      partsTotal: sql<number>`(select count(*) from store_order_payments p where p.order_id = ${storeOrders.id})`,
      partsWithProof: sql<number>`(select count(*) from store_order_payments p where p.order_id = ${storeOrders.id} and p.proof_data is not null)`,
    }).from(storeOrders).leftJoin(sales, eq(storeOrders.saleId, sales.id))
      .where(status ? eq(storeOrders.status, status) : undefined)
      .orderBy(desc(storeOrders.createdAt)).limit(200);

    const counts = await db.select({ status: storeOrders.status, n: sql<number>`count(*)` }).from(storeOrders).groupBy(storeOrders.status);
    res.json({
      data: rows.map((r) => ({ ...r, partsTotal: Number(r.partsTotal), partsWithProof: Number(r.partsWithProof) })),
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Comprovante em base64 (só para quem está logado).
router.get("/admin/orders/:id/proof", requireAuth, requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const [o] = await db.select({ data: storeOrders.proofData, type: storeOrders.proofFileType, name: storeOrders.proofFileName })
      .from(storeOrders).where(eq(storeOrders.id, req.params.id)).limit(1);
    if (!o?.data) return res.status(404).json({ error: "Sem comprovante." });
    res.json({ data: o.data, fileType: o.type, fileName: o.name });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Partes do pagamento (pedido pago em 2+ PIX) — metadados, sem o base64.
router.get("/admin/orders/:id/payments", requireAuth, requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const { storeOrderPayments } = await import("../db/schema");
    const rows = await db.select({
      id: storeOrderPayments.id, seq: storeOrderPayments.seq, amountBrl: storeOrderPayments.amountBrl,
      status: storeOrderPayments.status, fileName: storeOrderPayments.proofFileName,
      fileType: storeOrderPayments.proofFileType, sentAt: storeOrderPayments.proofSentAt,
      hasProof: sql<boolean>`${storeOrderPayments.proofData} is not null`,
    }).from(storeOrderPayments).where(eq(storeOrderPayments.orderId, req.params.id)).orderBy(storeOrderPayments.seq);
    res.json({ data: rows.map((r) => ({ ...r, amount: Number(r.amountBrl) })) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/admin/orders/:id/payments/:paymentId/proof", requireAuth, requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const { storeOrderPayments } = await import("../db/schema");
    const [p] = await db.select().from(storeOrderPayments)
      .where(and(eq(storeOrderPayments.id, req.params.paymentId), eq(storeOrderPayments.orderId, req.params.id))).limit(1);
    if (!p?.proofData) return res.status(404).json({ error: "Sem comprovante nesta parte." });
    res.json({ data: p.proofData, fileType: p.proofFileType, fileName: p.proofFileName, amount: Number(p.amountBrl), seq: p.seq });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Confirma o pedido (conferido o PIX). O recebimento em si é registrado no Caixa.
router.post("/admin/orders/:id/confirm", requireAuth, requirePermission("cash", "receive_payment"), async (req: AuthRequest, res) => {
  try {
    const [o] = await db.select().from(storeOrders).where(eq(storeOrders.id, req.params.id)).limit(1);
    if (!o) return res.status(404).json({ error: "Pedido não encontrado." });
    if (o.status === "CANCELED") return res.status(400).json({ error: "Pedido cancelado." });

    // A venda ligada pode ter sido cancelada/estornada pelo Caixa sem que esse
    // pedido tenha sido atualizado ainda (dado antigo, de antes da sincronização
    // existir) — sem essa checagem dava pra "confirmar" um pedido morto.
    if (o.saleId) {
      const [linkedSale] = await db.select().from(sales).where(eq(sales.id, o.saleId)).limit(1);
      if (linkedSale && (["CANCELED", "CANCELLED", "RETURNED"].includes(String(linkedSale.orderStatus)) || linkedSale.paymentStatus === "REFUNDED")) {
        return res.status(400).json({ error: "A venda deste pedido já foi cancelada/estornada no Caixa." });
      }
    }

    // Conferência do dinheiro: o valor que caiu na conta tem que bater com o pedido.
    // Se veio a menos, só confirma com aceite explícito (e a diferença fica registrada).
    const total = round2(Number(o.totalAmount));
    const informed = req.body?.receivedAmount;
    const received = informed == null || informed === "" ? total : round2(Number(informed));
    if (!(received >= 0)) return res.status(400).json({ error: "Valor recebido inválido." });
    const missing = round2(total - received);
    if (missing > MONEY_EPSILON && !req.body?.force) {
      return res.status(409).json({
        error: `Faltam R$ ${missing.toFixed(2).replace(".", ",")} — recebido R$ ${received.toFixed(2).replace(".", ",")} de R$ ${total.toFixed(2).replace(".", ",")}.`,
        code: "AMOUNT_MISMATCH", total, received, missing,
      });
    }
    if (missing > MONEY_EPSILON && req.body?.force) {
      await createNotification(db, {
        type: "PAYMENT_MISMATCH", title: "Pedido confirmado com falta",
        message: `Pedido ${o.code} (${o.customerName}) confirmado faltando ${formatBrl(missing)} de ${formatBrl(total)}.`,
        link: "/store-orders",
      });
    }

    // Até aqui isso só marcava o PEDIDO como confirmado — o dinheiro nunca era lançado em
    // financial_accounts nem sales.paymentStatus saía de PENDING (achado real: pedido "Confirmado"
    // pro cliente, mas ausente do Financeiro pra sempre). Confirmar aqui É o evento de recebimento
    // do PIX, então precisa passar pelo mesmo roteamento de dinheiro que o Caixa usa.
    await db.transaction(async (tx) => {
      const { storeOrderPayments } = await import("../db/schema");
      await tx.update(storeOrders).set({
        status: "CONFIRMED", confirmedBy: req.user!.userId, confirmedAt: new Date(),
        receivedAmountBrl: received.toFixed(2),
        payerName: req.body?.payerName ? String(req.body.payerName).trim().slice(0, 160) : null,
        receiptCheckedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(storeOrders.id, o.id));
      // Pedido pago em partes: confirmar o pedido dá baixa em todas elas.
      await tx.update(storeOrderPayments).set({ status: "CONFIRMED", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(storeOrderPayments.orderId, o.id));

      if (o.saleId) {
        await routePayment(tx, "PIX", received, {
          saleId: o.saleId, saleLabel: `Pedido ${o.code}`, userId: req.user!.userId, sourceCurrency: "BRL",
        });
        const [sale] = await tx.select().from(sales).where(eq(sales.id, o.saleId)).limit(1).for("update");
        if (sale) {
          const newStatus = received >= total - MONEY_EPSILON ? "PAID" : "PARTIAL";
          const orderStatusUpdate = newStatus === "PAID" && sale.fulfillmentStatus === "DELIVERED" ? { orderStatus: "COMPLETED" } : {};
          await tx.update(sales).set({ paymentStatus: newStatus, ...orderStatusUpdate }).where(eq(sales.id, o.saleId));
        }
      }

      await logAction(req.user!.userId, "STORE_ORDER_CONFIRM", "store_orders", o.id, null, {
        code: o.code, total, received, missing: missing > 0 ? missing : 0, payerName: req.body?.payerName || null,
      });
    });

    await createNotification(db, {
      type: "PAYMENT_CONFIRMED", title: "Pagamento confirmado",
      message: `Pagamento de ${formatBrl(received)} do pedido ${o.code} (${o.customerName}) confirmado.`,
      link: "/store-orders",
    });

    res.json({ success: true, received, missing: missing > 0 ? missing : 0 });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Cancela o pedido e libera o estoque reservado (cancela a venda junto).
router.post("/admin/orders/:id/cancel", requireAuth, requirePermission("sales", "cancel"), async (req: AuthRequest, res) => {
  try {
    const reason = String(req.body?.reason || "").trim() || "Cancelado pela loja";
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(storeOrders).where(eq(storeOrders.id, req.params.id)).limit(1);
      if (!o) throw new Error("Pedido não encontrado.");
      if (o.status === "CANCELED") throw new Error("Pedido já cancelado.");

      const [sale] = o.saleId ? await tx.select().from(sales).where(eq(sales.id, o.saleId)).limit(1) : [undefined as any];
      const saleAlreadyDead = sale && (["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus)) || sale.paymentStatus === "REFUNDED");

      if (sale && !saleAlreadyDead) {
        // cancelSaleTx cuida de tudo: recusa se a venda já estiver paga (tem que
        // ir por estorno, não dá pra só cancelar e perder o rastro do dinheiro),
        // reverte reserva OU estoque físico+custo se já tinha saído, e já
        // sincroniza o pedido (status + liberação de cupom) no final — mesma
        // lógica usada quando o cancelamento parte do Caixa, sem duplicar.
        await cancelSaleTx(tx, sale, reason, req.user!.userId);
        return;
      }

      // Sem venda ligada, ou venda já estava cancelada/estornada por outro
      // caminho (nada a reverter de novo) — só fecha o pedido da loja.
      if (o.couponCode) {
        const { storeCoupons } = await import("../db/schema");
        await tx.update(storeCoupons)
          .set({ usedCount: sql`greatest(${storeCoupons.usedCount} - 1, 0)`, updatedAt: new Date() })
          .where(eq(storeCoupons.code, o.couponCode));
      }
      await tx.update(storeOrders).set({ status: "CANCELED", canceledReason: reason, updatedAt: new Date() }).where(eq(storeOrders.id, o.id));
    });
    await logAction(req.user!.userId, "STORE_ORDER_CANCEL", "store_orders", req.params.id, null, { reason });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Apaga por completo um pedido cancelado (e a venda ligada) — ferramenta de correção pra casos
// travados que nenhum fluxo normal alcança mais (ex.: venda que ficou CANCELADA com dinheiro
// ainda preso numa conta, de antes da trava de concorrência do cancelSaleTx existir — nesse
// estado nem /cancel nem /return aceitam mexer nela de novo). Só Master, com senha — mais
// estrito que devolução normal (que aceita admin/administrador também), porque isto apaga o
// registro de vez em vez de só marcar como devolvido.
router.post("/admin/orders/:id/purge", requireAuth, requirePermission("admin", "manage"), async (req: AuthRequest, res) => {
  try {
    const { masterPassword } = req.body || {};
    if (!masterPassword) return res.status(400).json({ error: "Senha do Master é obrigatória." });
    const master = await findMasterByPassword(String(masterPassword));
    if (!master) return res.status(403).json({ error: "Senha inválida — só o perfil Master pode excluir um pedido." });

    const result = await db.transaction(async (tx) => {
      const [o] = await tx.select().from(storeOrders).where(eq(storeOrders.id, req.params.id)).limit(1).for("update");
      if (!o) throw new Error("Pedido não encontrado.");
      if (o.status !== "CANCELED") throw new Error("Só é possível excluir pedidos cancelados.");

      let reversedAmount = 0;
      if (o.saleId) {
        const [sale] = await tx.select().from(sales).where(eq(sales.id, o.saleId)).limit(1).for("update");
        if (sale) {
          if (!["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus))) {
            throw new Error("A venda ligada a este pedido não está cancelada — cancele ou devolva pelo Caixa antes de excluir.");
          }
          // Reversão de segurança: se sobrou algum lançamento sem estornar nesta venda (o caso
          // que motivou esta ferramenta), estorna agora, mantendo o rastro na conta financeira
          // mesmo depois do pedido/venda serem apagados. Se já estava tudo certo, não faz nada.
          const before = await tx.select({ amt: accountMovements.amountUsd }).from(accountMovements)
            .where(eq(accountMovements.referenceId, sale.id));
          reversedAmount = before.reduce((s, r) => s + Number(r.amt), 0);
          if (Math.abs(reversedAmount) > MONEY_EPSILON) {
            await reverseSaleMovements(tx, sale.id, req.user!.userId, `pedido da loja ${o.code} excluído por Master`);
          }
        }
        const { storeOrderPayments } = await import("../db/schema");
        await tx.delete(storeOrderPayments).where(eq(storeOrderPayments.orderId, o.id));
      }

      // Log ANTES de apagar (tableName "store_orders", não "sales" — deleteDeadSaleRecords só
      // limpa auditoria com tableName "sales", então este registro sobrevive à exclusão).
      await logAction(master.id, "MASTER_PURGE_STORE_ORDER", "store_orders", o.id, o, {
        code: o.code, reversedAmount, executedBy: req.user!.userId,
      });

      // store_orders.sale_id tem FK pra sales — precisa apagar o PEDIDO antes da VENDA, senão
      // "DELETE FROM sales" quebra por violação de chave estrangeira (bug real, achado testando).
      await tx.delete(storeOrders).where(eq(storeOrders.id, o.id));
      if (o.saleId) await deleteDeadSaleRecords(tx, o.saleId);

      return { code: o.code, reversedAmount };
    });

    await createNotification(db, {
      type: "MASTER_ACTION", title: "Pedido excluído pelo Master",
      message: `Pedido ${result.code} excluído por ${master.name}${result.reversedAmount > 0.01 ? ` (${formatBrl(result.reversedAmount)} estornado)` : ""}.`,
      link: "/store-orders",
    });

    res.json({ success: true, ...result });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Liga/desliga produto na vitrine.
router.put("/admin/products/:id/visibility", requireAuth, requirePermission("product", "manage"), async (req: AuthRequest, res) => {
  try {
    const { storeVisible, storeDescription } = req.body || {};
    const updates: any = { updatedAt: new Date() };
    if (storeVisible !== undefined) updates.storeVisible = !!storeVisible;
    if (storeDescription !== undefined) updates.storeDescription = String(storeDescription || "").slice(0, 400) || null;
    await db.update(products).set(updates).where(eq(products.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Dossiê do pedido em UMA folha: identificação, valor pago, termo aceito e o
// comprovante embutido. Sem lista de itens — o que importa numa contestação é
// quem comprou, quanto pagou, o que aceitou e a prova do pagamento.
router.get("/admin/orders/:id/dossier", requireAuth, requirePermission("sales", "view"), async (req: AuthRequest, res) => {
  try {
    const [o] = await db.select().from(storeOrders).where(eq(storeOrders.id, req.params.id)).limit(1);
    if (!o) return res.status(404).json({ error: "Pedido não encontrado." });

    const [cs] = await db.select().from(companySettings).limit(1);
    const [sale] = o.saleId ? await db.select().from(sales).where(eq(sales.id, o.saleId)).limit(1) : [undefined as any];
    const { storeOrderPayments } = await import("../db/schema");
    const parts = await db.select().from(storeOrderPayments).where(eq(storeOrderPayments.orderId, o.id)).orderBy(storeOrderPayments.seq);
    const [cust] = o.customerId ? await db.select().from(customers).where(eq(customers.id, o.customerId)).limit(1) : [undefined as any];
    const [who] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user!.userId)).limit(1);

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="dossie_${o.code}.pdf"`);
    doc.pipe(res);

    const INK = "#111827", MUTED = "#6b7280", LINE = "#e5e7eb", SOFT = "#f9fafb";
    const OK = "#047857", WARN = "#b45309", BAD = "#b91c1c";
    const M = 42, W = 595 - M * 2, COL = (W - 18) / 2, COL2 = M + COL + 18;
    const FOOT = 792; // linha do rodapé

    const brl = formatBrl;
    const dt = (d: any) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
    const cpfFmt = (v: any) => {
      const d = String(v || "").replace(/\D/g, "");
      return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (v ? String(v) : "—");
    };
    const foneFmt = (v: any) => {
      const d = String(v || "").replace(/\D/g, "");
      if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return v || "—";
    };
    const device = (ua: any) => {
      const s = String(ua || "");
      if (!s) return "—";
      const os = /iPhone|iPad/i.test(s) ? "iPhone/iPad" : /Android/i.test(s) ? "Android" : /Windows/i.test(s) ? "Windows" : /Mac OS/i.test(s) ? "Mac" : "outro";
      const br = /Edg\//i.test(s) ? "Edge" : /Chrome\//i.test(s) ? "Chrome" : /Firefox\//i.test(s) ? "Firefox" : /Safari\//i.test(s) ? "Safari" : "navegador";
      return `${os} · ${br}`;
    };
    const sectionTitle = (title: string, y: number) => {
      doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED).text(title.toUpperCase(), M, y, { characterSpacing: 0.8, width: W });
      const ly = doc.y + 2.5;
      doc.moveTo(M, ly).lineTo(M + W, ly).lineWidth(0.7).strokeColor(LINE).stroke();
      return ly + 6;
    };
    const kv = (x: number, y: number, w: number, label: string, value: string, color = INK) => {
      doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(label.toUpperCase(), x, y, { width: w, characterSpacing: 0.4 });
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(color).text(value || "—", x, doc.y + 0.5, { width: w });
      return doc.y + 5.5;
    };

    // ================= CABEÇALHO =================
    doc.rect(0, 0, 595, 68).fill(INK);
    const empresa = String(cs?.tradeName || cs?.companyName || "Sua loja");
    doc.fillColor("#ffffff").fontSize(12.5).font("Helvetica-Bold").text(empresa, M, 20, { width: 300 });
    const idLinha = [cs?.companyName !== empresa ? cs?.companyName : null, cs?.documentNumber ? `${cs?.documentType || "DOC"} ${cs.documentNumber}` : null, cs?.city]
      .filter(Boolean).join("  ·  ");
    doc.fontSize(7).font("Helvetica").fillColor("#9ca3af").text(idLinha || "—", M, 38, { width: 300 });
    doc.fontSize(6.5).font("Helvetica").fillColor("#9ca3af")
      .text("DOSSIÊ DO PEDIDO", M + 300, 20, { width: W - 300, align: "right", characterSpacing: 1 });
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#ffffff")
      .text(o.code, M + 300, 30, { width: W - 300, align: "right" });

    let y = 86;

    // ================= VALOR + SITUAÇÃO =================
    const statusTxt = o.status === "CONFIRMED" ? "Pagamento confirmado"
      : o.status === "PROOF_SENT" ? "Comprovante enviado"
      : o.status === "CANCELED" ? "Cancelado" : "Aguardando pagamento";
    const statusCor = o.status === "CONFIRMED" ? OK : o.status === "CANCELED" ? BAD : WARN;
    doc.roundedRect(M, y, W, 52, 4).fillAndStroke(SOFT, LINE);
    // valor em destaque à esquerda
    doc.fontSize(6).font("Helvetica").fillColor(MUTED).text("VALOR PAGO POR PIX", M + 14, y + 9, { characterSpacing: 0.5, width: 200 });
    doc.fontSize(19).font("Helvetica-Bold").fillColor(INK).text(brl(o.totalAmount), M + 14, y + 20, { width: 200 });
    // três blocos à direita
    const info: Array<[string, string, string]> = [
      ["Pedido feito em", dt(o.createdAt), INK],
      ["Situação", statusTxt, statusCor],
      ["Venda no sistema", sale ? `${sale.series}-${sale.number}` : "—", INK],
    ];
    info.forEach(([l, v, c], i) => {
      const x = M + 215 + i * ((W - 225) / 3);
      const wcol = (W - 225) / 3 - 6;
      doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(l.toUpperCase(), x, y + 12, { width: wcol, characterSpacing: 0.4 });
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(c).text(v, x, y + 24, { width: wcol });
    });
    y += 66;

    // ================= COMPRADOR | PAGAMENTO =================
    y = sectionTitle("Comprador e pagamento", y);
    let yL = y, yR = y;
    yL = kv(M, yL, COL, "Comprador", o.customerName);
    yL = kv(M, yL, COL, "CPF do comprador", cpfFmt(o.customerDocument));
    yL = kv(M, yL, COL, "WhatsApp", foneFmt(o.customerPhone));
    yL = kv(M, yL, COL, "Origem do pedido", `IP ${o.clientIp || "—"} · ${device(o.clientUserAgent)}`);
    if (cust) yL = kv(M, yL, COL, "Cadastro no sistema", `${cust.name} · desde ${dt(cust.createdAt).slice(0, 10)}`);

    const recebido = o.receivedAmountBrl != null ? Number(o.receivedAmountBrl) : null;
    const falta = recebido != null ? round2(Number(o.totalAmount) - recebido) : 0;
    yR = kv(COL2, yR, COL, "Forma", parts.length > 0 ? `PIX em ${parts.length} pagamentos` : "PIX à vista");
    yR = kv(COL2, yR, COL, "Quem paga (declarado no pedido)",
      o.payerIsBuyer === false
        ? `${o.payerDeclaredName || "—"} · CPF ${cpfFmt(o.payerDeclaredCpf)} (autorizado)`
        : "o próprio comprador");
    yR = kv(COL2, yR, COL, "Titular do comprovante", o.payerName || "não informado");
    yR = kv(COL2, yR, COL, "Valor conferido pela loja",
      recebido == null ? "ainda não conferido" : falta > 0.009 ? `${brl(recebido)} — faltaram ${brl(falta)}` : `${brl(recebido)} — confere`,
      recebido == null ? WARN : falta > 0.009 ? BAD : OK);
    yR = kv(COL2, yR, COL, "Entrega",
      `${o.deliveryType === "DELIVERY" ? "Entrega" : "Retirada no local"}${o.deliveryConfirmedAt ? ` · cliente confirmou em ${dt(o.deliveryConfirmedAt)}` : " · sem confirmação do cliente"}`,
      o.deliveryConfirmedAt ? OK : INK);
    y = Math.max(yL, yR) + 4;

    // Parcelas em uma linha, quando houver
    if (parts.length > 0) {
      const resumo = parts.map((p) => `${p.seq}ª ${brl(p.amountBrl)}${p.proofData ? " ✓" : " (sem comprovante)"}`).join("   ·   ");
      doc.fontSize(7).font("Helvetica").fillColor(MUTED).text(resumo, M, y, { width: W });
      y = doc.y + 6;
    }

    // ================= TERMO DE ACEITE =================
    y = sectionTitle("Termo aceito pelo comprador", y);
    if (o.termsAcceptedAt) {
      doc.fontSize(7).font("Helvetica").fillColor(MUTED)
        .text(`Aceito eletronicamente em ${dt(o.termsAcceptedAt)}   ·   IP ${o.clientIp || "—"}   ·   ${device(o.clientUserAgent)}   ·   versão ${o.termsVersion || "1"}`,
          M, y, { width: W });
      y = doc.y + 4;

      // O termo cabe na folha; se o lojista escrever um texto enorme, a fonte
      // encolhe até o limite e o excedente vai para uma página anexa.
      const txt = String(o.termsSnapshot || "—");
      const reservaComprovante = 210;
      const disponivel = FOOT - 10 - y - reservaComprovante;
      let fs = 7;
      let h = doc.heightOfString(txt, { width: W - 20 });
      while (h > disponivel - 12 && fs > 5.5) {
        fs -= 0.25;
        doc.fontSize(fs);
        h = doc.heightOfString(txt, { width: W - 20 });
      }
      const coube = h <= disponivel - 12;
      const boxH = Math.min(h + 12, Math.max(disponivel, 30));
      doc.roundedRect(M, y, W, boxH, 3).fillAndStroke("#ffffff", LINE);
      doc.fontSize(fs).font("Helvetica").fillColor("#374151")
        .text(coube ? txt : `${txt.slice(0, 900)}…`, M + 10, y + 6, { width: W - 20, height: boxH - 12, ellipsis: true });
      if (!coube) {
        doc.fontSize(6).font("Helvetica-Oblique").fillColor(MUTED).text("(texto integral no anexo)", M, y + boxH + 1, { width: W, align: "right" });
      }
      (o as any).__termoCoube = coube;
      y += boxH + 10;
    } else {
      doc.fontSize(8).font("Helvetica").fillColor(BAD).text("Pedido anterior ao registro de aceite — sem termo gravado.", M, y, { width: W });
      y = doc.y + 8;
      (o as any).__termoCoube = true;
    }

    // ================= COMPROVANTE NA MESMA FOLHA =================
    const comprovantes: Array<{ label: string; data: string | null; type: string | null; when: any }> = parts.length > 0
      ? parts.map((p) => ({ label: `${p.seq}ª parcela · ${brl(p.amountBrl)}`, data: p.proofData, type: p.proofFileType, when: p.proofSentAt }))
      : [{ label: `Pagamento · ${brl(o.totalAmount)}`, data: o.proofData, type: o.proofFileType, when: o.proofSentAt }];
    const comImagem = comprovantes.filter((c) => c.data);

    y = sectionTitle("Comprovante do pagamento", y);
    const espaco = FOOT - 12 - y;
    const principal = comImagem[0];
    if (!principal) {
      doc.fontSize(8).font("Helvetica").fillColor(WARN).text("Nenhum comprovante enviado pelo cliente até o momento.", M, y, { width: W });
    } else {
      doc.fontSize(6.5).font("Helvetica").fillColor(MUTED)
        .text(`${principal.label}  ·  enviado em ${dt(principal.when)}${comImagem.length > 1 ? `  ·  demais comprovantes em anexo` : ""}`, M, y, { width: W });
      const top = doc.y + 4;
      const alturaImg = Math.max(90, FOOT - 12 - top);
      if (/^image\/(png|jpe?g)$/i.test(String(principal.type || ""))) {
        try {
          doc.image(Buffer.from(principal.data as string, "base64"), M, top, { fit: [W, alturaImg], align: "center" });
        } catch {
          doc.fontSize(8).font("Helvetica").fillColor(BAD).text("Não foi possível embutir a imagem. Veja o original em Pedidos da Loja.", M, top, { width: W });
        }
      } else {
        doc.fontSize(8).font("Helvetica").fillColor(INK)
          .text(`Comprovante em ${String(principal.type || "").includes("pdf") ? "PDF" : "arquivo"} enviado pelo cliente — abra o original em Pedidos da Loja › Ver comprovante.`, M, top, { width: W });
      }
    }

    // ================= ANEXOS (só se precisar) =================
    for (let i = 1; i < comImagem.length; i++) {
      const pr = comImagem[i];
      doc.addPage();
      doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED).text("ANEXO · COMPROVANTE", M, 48, { characterSpacing: 0.8, width: W });
      doc.fontSize(10).font("Helvetica-Bold").fillColor(INK).text(pr.label, M, doc.y + 3, { width: W });
      doc.fontSize(7).font("Helvetica").fillColor(MUTED).text(`Pedido ${o.code}  ·  enviado em ${dt(pr.when)}`, M, doc.y + 1, { width: W });
      const top = doc.y + 8;
      if (/^image\/(png|jpe?g)$/i.test(String(pr.type || ""))) {
        try { doc.image(Buffer.from(pr.data as string, "base64"), M, top, { fit: [W, FOOT - 12 - top], align: "center" }); } catch { /* segue */ }
      } else {
        doc.fontSize(8).font("Helvetica").fillColor(INK).text("Arquivo enviado pelo cliente — abra o original no sistema.", M, top, { width: W });
      }
    }
    if (o.termsAcceptedAt && o.termsSnapshot && (o as any).__termoCoube === false) {
      doc.addPage();
      doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED).text("ANEXO · TERMO ACEITO (TEXTO INTEGRAL)", M, 48, { characterSpacing: 0.8, width: W });
      doc.fontSize(7).font("Helvetica").fillColor(MUTED)
        .text(`Pedido ${o.code}  ·  versão ${o.termsVersion || "1"}  ·  aceito em ${dt(o.termsAcceptedAt)}  ·  IP ${o.clientIp || "—"}`, M, doc.y + 3, { width: W });
      doc.fontSize(9).font("Helvetica").fillColor("#374151").text(String(o.termsSnapshot), M, doc.y + 10, { width: W, lineGap: 3 });
    }

    // ================= RODAPÉ =================
    const range = doc.bufferedPageRange();
    const carimbo = `Documento gerado em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} por ${who?.name || "usuário do sistema"} · Pedido ${o.code}`;
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.moveTo(M, FOOT).lineTo(M + W, FOOT).lineWidth(0.7).strokeColor(LINE).stroke();
      doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(carimbo, M, FOOT + 6, { width: W - 60 });
      if (range.count > 1) doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(`${i + 1}/${range.count}`, M + W - 60, FOOT + 6, { width: 60, align: "right" });
    }

    doc.end();
    await logAction(req.user!.userId, "STORE_ORDER_DOSSIER", "store_orders", o.id, null, { code: o.code });
  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: "Não foi possível gerar o dossiê." });
  }
});

/* ==================== FASE E3: config da vitrine, cupons e frete ==================== */

const STORE_CONFIG_KEY = "store_config";

// Termos que o cliente aceita ao fechar o pedido. O texto aceito fica gravado
// NO PEDIDO (snapshot), então mudar aqui não altera o que já foi aceito antes.
const DEFAULT_TERMS = `TERMOS E CONDIÇÕES GERAIS DE USO

Leia atentamente todas as informações abaixo antes de efetuar qualquer compra em nossa loja virtual.

1. Estes Termos e Condições Gerais de Uso do Site são aplicáveis a todas as compras de produtos realizadas pelos clientes neste site.

2. Para realizar um pedido de compra, o cliente precisa aceitar os presentes Termos e Condições de Uso do Site — caso contrário, a finalização do pedido não será possível. Qualquer compra feita no site pressupõe a ciência do cliente sobre o teor deste termo.

3. Reservamo-nos o direito de modificar o presente documento a qualquer momento, sem aviso prévio, respeitados os pedidos já confirmados e finalizados antes da alteração.

4. Estes Termos e Condições de Uso do Site, em conjunto com o "Pedido", constituem o acordo integral entre a loja e o cliente para a intermediação do produto ou serviço — ou seja, formam o contrato de intermediação pelo serviço prestado necessário às compras feitas via este e-commerce.

5. Para os fins deste documento, considera-se: "Cliente" — pessoa física ou jurídica que compra produto(s) como destinatário final no site; "Preço" — valor indicado no Pedido, já com o serviço de intermediação embutido, sem custos adicionais; "Produto" — bem descrito no Pedido.

6. Sendo constatado que a compra se deu por meios ilegais ou maliciosos, reservamo-nos o direito de cancelar os pedidos em que forem identificadas atividades maliciosas, uso de bots, scripts ou qualquer outra forma de compra automatizada realizada visando burlar o sistema regular de compra.

PEDIDO, PREÇOS E PAGAMENTO

7. Não será vinculante o pedido na hipótese de erro claro de lançamento de informação sobre o produto (qualidade, preço, etc.), quando o erro for verificado antes do envio da compra. Reservamo-nos o direito de cancelar o pedido nesses casos, obrigando-nos a devolver prontamente e integralmente o valor eventualmente pago.

8. Os dados da compra — número do pedido, método e prazo de envio, dados da cobrança, endereço de entrega, entre outras informações — constarão em e-mail enviado ao endereço cadastrado pelo cliente em sua conta, após a finalização da compra.

9. O cliente deve consultar também sua caixa de spam, pois este e-mail de confirmação por vezes não chega à caixa de entrada comum, por fatores externos a nós.

10. O cliente deve verificar os dados constantes no Pedido enviado após a compra — produtos, preços e quantidades — e informar imediatamente qualquer erro para correção e ajuste.

11. Ao efetuar o pagamento, o cliente concorda com o Pedido que lhe foi enviado, não podendo reclamar posteriormente de erro na inclusão dos produtos, já que essa inclusão é feita pelo próprio cliente.

12. O prazo para confirmação do pagamento é de até 2 dias úteis. Esse prazo pode ser alterado em épocas de maior demanda de pedidos (datas comemorativas, Black Friday, Natal, etc.).

13. Caso não haja confirmação do pagamento do pedido dentro do prazo, o pedido será cancelado automaticamente e sem custo. O cliente poderá fazer um novo pedido, sujeito às condições atuais de preço e disponibilidade do produto.

14. As ofertas somente são válidas quando disponibilizadas por escrito no site (ou outro meio de publicidade nosso), durante o prazo indicado e enquanto houver produtos disponíveis em estoque.

15. Descontos concedidos para pagamento via PIX são exclusivos dessa modalidade de pagamento.

16. Poderá haver alteração de valores de produtos em curto período de tempo. Produtos promocionais mantêm seu valor dentro do prazo e quantidade estipulados, encerrando-se pelo que se esgotar primeiro.

17. Em caso de produto anunciado com erro de digitação em valor, especificação ou qualquer característica, reservamo-nos o direito de corrigir o equívoco e cancelar o pedido a qualquer tempo, sem ônus às partes, devolvendo integralmente o valor pago.

18. Não garantimos preços idênticos em todos os nossos canais de venda.

19. O pedido é separado e postado para envio após a confirmação do pagamento. Em períodos de maior demanda, esse prazo de postagem pode ser aumentado, podendo o envio ocorrer em até 5 dias úteis.

20. Reservamo-nos o direito de aguardar a confirmação do pagamento antes de concluir a venda e enviar o produto, não nos responsabilizando por eventuais fraudes ocorridas no processo de pagamento.

ENTREGA

21. No momento da compra, o cliente escolhe entre envio por transportadora/Correios ou retirada no local, previamente combinada.

22. Cada localidade tem um prazo específico de entrega para cada meio disponível.

23. Mercadorias que, por dimensão ou peso, exijam forma de postagem diferente podem ter essa forma alterada independentemente da escolha feita pelo cliente.

24. Em grandes eventos e datas festivas (Black Friday, Natal, Ano Novo, etc.), os prazos de entrega podem sofrer alterações por causa da alta demanda de postagens.

25. Em caso de catástrofe natural, greve ou outro motivo de força maior fora do nosso controle, os prazos de entrega ou devolução podem ser alterados até a normalização da situação.

26. A entrega é realizada dentro do prazo e no local indicado no Pedido, sendo de responsabilidade da transportadora ou do modo de envio escolhido pelo cliente na finalização do pedido.

27. Optando pela entrega via Correios, o cliente deve verificar previamente se há restrição de entrega para o seu CEP antes de finalizar o pedido.

28. Não nos responsabilizamos por atraso no recebimento da mercadoria decorrente da não observância, pelo cliente, de restrição de entrega já informada para o seu CEP.

29. Caso o cliente resida em local de difícil acesso, ou onde por impedimento operacional a entrega não seja possível, a encomenda ficará disponível para retirada no local indicado pelos Correios ou pela transportadora.

30. Em caso de extravio, roubo ou retenção fiscalizatória da mercadoria durante o transporte, será concedido novo prazo para reposição ou reembolso, conforme o caso.

31. Em caso de atraso na entrega, o cliente deve nos informar em até 24 horas após verificado o atraso, para que possamos tomar as medidas necessárias ao nosso alcance.

32. Não somos responsáveis pela falta de entrega nos casos de: cliente ausente, recebedor não localizado, dados cadastrais e/ou endereço incorretos ou incompletos, recusa do endereço pelo cliente ou por terceiros no local, mudança de endereço não informada, endereço comercial fechado, área de risco, desastre natural, ou qualquer outro motivo fora da nossa esfera de atuação.

33. Ao informar o endereço de entrega, o cliente concorda que qualquer pessoa presente no local no momento da tentativa de entrega pode receber a encomenda em seu nome. Qualquer restrição quanto a isso deve ser informada no ato da compra.

34. Não nos responsabilizamos por danos decorrentes do transporte da mercadoria — essa responsabilidade compete à empresa transportadora, conforme os artigos 749 e 750 do Código Civil Brasileiro. Caso sejamos acionados nesse sentido, reservamo-nos o direito de indicar a transportadora responsável.

35. Em caso de dano à mercadoria durante o transporte, será concedido novo prazo para reposição.

36. O cliente deve examinar o produto imediatamente após a entrega, que será feita no endereço indicado na compra a qualquer pessoa ali encontrada.

37. Avarias não perceptíveis de imediato devem ser comunicadas em até 24 horas a contar da entrega. Divergências entre o produto recebido e o constante no pedido também devem ser comunicadas nesse mesmo prazo.

38. Transcorrido esse prazo sem manifestação do cliente, o produto será considerado, conforme a lei, aceito em perfeitas condições.

DIREITO DE ARREPENDIMENTO

39. Nos termos do art. 49 do Código de Defesa do Consumidor, o cliente tem até 7 (sete) dias corridos após o recebimento do produto para desistir da compra, sem necessidade de justificativa, com direito a reembolso integral dos valores pagos, incluindo frete.

PRODUTOS COM USO ORIENTADO

40. Alguns produtos comercializados podem exigir orientação profissional, prescrição ou cuidados específicos para uso seguro. É responsabilidade do cliente verificar a adequação do produto às normas do seu país antes da compra e utilizá-lo conforme orientação adequada.

PRODUTOS OPENBOX

41. Poderemos realizar a venda de produtos openbox — aqueles que já tiveram sua caixa aberta e seus selos/lacres rompidos. Ao clicar na aba de openbox, o cliente obtém todas as informações sobre o produto.

42. Produtos openbox podem ter eventual vício ou ausência de algum acessório/componente, sem que isso comprometa sua funcionalidade. O produto openbox não possui característica de produto novo e possui somente a garantia legal de 7 dias. Em hipótese alguma um produto openbox será substituído por um produto novo.

PRODUTOS EM PRÉ-VENDA

43. Poderemos realizar vendas em modalidade pré-venda — reserva antecipada de produto de interesse do cliente, inclusive produtos ainda não lançados pelo fabricante.

44. Ao comprar em pré-venda, o cliente deve estar ciente de possíveis atrasos e mudanças na previsão de entrega, que podem decorrer de: alteração da data de lançamento do produto; atraso na liberação por órgãos fiscalizadores; retenção da mercadoria na alfândega; bloqueio da entrada da mercadoria no país de destino; atraso da transportadora; ou revisão dos tributos de importação pela fiscalização aduaneira.

45. A data de previsão informada no anúncio é apenas uma expectativa e pode sofrer alterações pelos motivos acima — não nos responsabilizamos por essas alterações de prazo. O pagamento do produto em pré-venda serve para garantir a sua reserva.

PRIVACIDADE E ALTERAÇÕES DESTE TERMO

46. Seus dados pessoais são usados apenas para processar seu pedido e para contato sobre ele, e não são vendidos a terceiros. Se você aceitar receber comunicação de marketing no cadastro, pode cancelar isso a qualquer momento em "Meus dados".

47. Podemos alterar estes termos a qualquer momento, sem aviso prévio; pedidos já confirmados seguem as condições vigentes no momento da compra.`;

// Config editável da vitrine (hero, aviso, destaques, tema). Guardada em system_settings.
function normalizeStoreThemeColors(c: any) {
  const keys = ["bg", "surface", "headerBg", "headerText", "accent", "accentText", "text", "textMuted", "footerBg", "footerText"];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const val = c?.[k];
    out[k] = typeof val === "string" && /^#[0-9a-fA-F]{6}$/.test(val) ? val : "";
  }
  return out;
}
function normalizeStoreThemeFont(f: any) {
  return {
    url: typeof f?.url === "string" ? f.url.slice(0, MAX_FONT_URL_CHARS) : "", // data: URL do arquivo de fonte (base64)
    family: typeof f?.family === "string" ? f.family.slice(0, 80) : "",
  };
}
// ---- Seções por página (editor visual avançado, Fase 1) ----
// Allowlists fixas: seção com id desconhecido é DESCARTADA na normalização
// (spec "Arquitetura → Config de seções por página"). `tamanho` só é aceito
// nos elementos redimensionáveis (banners / sideBanner) — enum P|M|G|GG,
// mapeado a classes responsivas fixas no componente, nunca px salvos.
const HOME_SECTION_IDS = ["announcement", "banners", "howToBuy", "categories", "vitrines", "hero", "sideBanner"];
const HOME_SIZED_SECTION_IDS = ["banners", "sideBanner"];
const CATALOGO_SECTION_IDS = ["filtros", "grade"];
const TAMANHOS_VALIDOS = ["P", "M", "G", "GG"];

function normalizeStorePageSection(s: any, allowedIds: string[], sizedIds: string[]) {
  const id = String(s?.id || "");
  if (!allowedIds.includes(id)) return null;
  const out: any = {
    id,
    ordem: Number.isFinite(Number(s?.ordem)) ? Math.trunc(Number(s.ordem)) : 0,
    visivel: s?.visivel !== false,
  };
  const tamanho = String(s?.tamanho || "");
  if (sizedIds.includes(id) && TAMANHOS_VALIDOS.includes(tamanho)) out.tamanho = tamanho;
  return out;
}

// `pages` ausente/inválido → undefined (a chave nem entra no JSON gravado —
// JSON.stringify descarta undefined): o frontend cai no layout fixo de hoje.
// Migração zero-risco: a loja não muda até alguém editar seções.
function normalizeStorePages(p: any) {
  if (!p || typeof p !== "object") return undefined;
  const out: any = {};
  if (p.home && Array.isArray(p.home.sections)) {
    out.home = {
      sections: p.home.sections
        .map((s: any) => normalizeStorePageSection(s, HOME_SECTION_IDS, HOME_SIZED_SECTION_IDS))
        .filter(Boolean)
        .slice(0, HOME_SECTION_IDS.length),
    };
  }
  if (p.catalogo && (Array.isArray(p.catalogo.sections) || typeof p.catalogo.titulo === "string")) {
    out.catalogo = {
      titulo: String(p.catalogo.titulo || "").slice(0, 80),
      sections: Array.isArray(p.catalogo.sections)
        ? p.catalogo.sections
            .map((s: any) => normalizeStorePageSection(s, CATALOGO_SECTION_IDS, []))
            .filter(Boolean)
            .slice(0, CATALOGO_SECTION_IDS.length)
        : [],
    };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// Tamanho dos botões CTA do hero (elemento redimensionável que NÃO é seção —
// spec: "guarda o tamanho em campo próprio da config"). "" = padrão de hoje (M).
function normalizeHeroCtaSize(v: any) {
  return TAMANHOS_VALIDOS.includes(String(v || "")) ? String(v) : "";
}
// Ordem dos 2 CTAs fixos do hero: "" = Ver produtos primeiro (hoje),
// "invertida" = WhatsApp primeiro. Ver desvio nº 1 no topo do plano.
function normalizeHeroCtaOrder(v: any) {
  return String(v || "") === "invertida" ? "invertida" : "";
}
async function getStoreVitrineConfig() {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_KEY)).limit(1);
  const v = (rows[0]?.value as any) || {};
  return {
    heroTitle: String(v.heroTitle || ""),
    heroSubtitle: String(v.heroSubtitle || ""),
    announcement: String(v.announcement || ""),
    featuredProductIds: Array.isArray(v.featuredProductIds) ? v.featuredProductIds.map(String).slice(0, 8) : [],
    banners: Array.isArray(v.banners) ? v.banners : [],
    quickLinks: Array.isArray(v.quickLinks) ? v.quickLinks : [],
    // Banner lateral da home ("Selecionado pra você") — existia no schema mas nunca era
    // gravado por este endpoint (achado da auditoria desta sessão), corrigido aqui.
    sideBannerTitle: String(v.sideBannerTitle || "").slice(0, 120),
    sideBannerSubtitle: String(v.sideBannerSubtitle || "").slice(0, 300),
    // "Como comprar": null = usa os 5 passos padrão fixos (ver StoreHome.tsx).
    howToBuySteps: Array.isArray(v.howToBuySteps) ? v.howToBuySteps.slice(0, 6).map((s: any) => ({
      title: String(s?.title || "").slice(0, 60),
      desc: String(s?.desc || "").slice(0, 120),
    })) : null,
    howToBuyVisible: v.howToBuyVisible !== false,
    footerText: String(v.footerText || "").slice(0, 200),
    // Seções por página + campos do hero (editor visual avançado, Fase 1).
    pages: normalizeStorePages(v.pages),
    heroCtaSize: normalizeHeroCtaSize(v.heroCtaSize),
    heroCtaOrder: normalizeHeroCtaOrder(v.heroCtaOrder),
    theme: {
      colors: normalizeStoreThemeColors(v.theme?.colors),
      fonts: {
        heading: normalizeStoreThemeFont(v.theme?.fonts?.heading),
        body: normalizeStoreThemeFont(v.theme?.fonts?.body),
      },
    },
    // Vitrines manuais da home: cada uma com título e lista de produtos escolhidos à mão.
    // Vazio = a home usa as 4 vitrines padrão fixas (Mais Vendidos/Emagrecimento/Performance/Novidades).
    vitrines: Array.isArray(v.vitrines) ? v.vitrines.map((vt: any) => ({
      id: String(vt?.id || ""),
      title: String(vt?.title || ""),
      productIds: Array.isArray(vt?.productIds) ? vt.productIds.map(String).slice(0, 12) : [],
    })).slice(0, 20) : [],
    termsText: String(v.termsText || DEFAULT_TERMS),
    termsVersion: String(v.termsVersion || "1"),
  };
}

// Público: a vitrine lê a config (sem nada sensível).
router.get("/config", async (_req, res) => {
  try { res.json(await getStoreVitrineConfig()); }
  catch { res.json({ heroTitle: "", heroSubtitle: "", announcement: "", featuredProductIds: [] }); }
});

// Público: regiões de entrega ativas (nome + taxa) pro checkout.
router.get("/shipping-zones", async (_req, res) => {
  try {
    const { storeShippingZones } = await import("../db/schema");
    const rows = await db.select().from(storeShippingZones)
      .where(eq(storeShippingZones.isActive, true))
      .orderBy(storeShippingZones.sortOrder, storeShippingZones.name);
    res.json({ data: rows.map((z) => ({ id: z.id, name: z.name, feeBrl: Number(z.feeBrl) })) });
  } catch (err: any) { res.status(500).json({ error: "Erro ao carregar regiões." }); }
});

// Avalia um cupom contra um subtotal. Reutilizada no preview e na criação do pedido (E4).
export async function evaluateCoupon(codeRaw: string, subtotal: number) {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false as const, reason: "Informe o código do cupom." };
  const { storeCoupons } = await import("../db/schema");
  const [c] = await db.select().from(storeCoupons).where(eq(storeCoupons.code, code)).limit(1);
  if (!c || !c.isActive) return { ok: false as const, reason: "Cupom não encontrado ou inativo." };
  const now = new Date();
  if (c.validFrom && now < new Date(c.validFrom)) return { ok: false as const, reason: "Cupom ainda não está valendo." };
  if (c.validUntil && now > new Date(c.validUntil)) return { ok: false as const, reason: "Cupom expirado." };
  if (c.maxUses != null && Number(c.usedCount) >= Number(c.maxUses)) return { ok: false as const, reason: "Cupom esgotado." };
  const min = c.minOrderBrl != null ? Number(c.minOrderBrl) : 0;
  if (subtotal < min) return { ok: false as const, reason: `Pedido mínimo de R$ ${min.toFixed(2).replace(".", ",")} pra usar esse cupom.` };
  const value = Number(c.value);
  const discount = c.type === "FIXED" ? Math.min(round2(value), round2(subtotal)) : round2(subtotal * value / 100);
  return { ok: true as const, coupon: c, discount: round2(discount) };
}

// Público: preview do cupom no carrinho (não consome uso).
router.post("/coupon/preview", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`coupon:${ip}`, 20, 10 * 60 * 1000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde uns minutos." });
    const subtotal = Number(req.body?.subtotal) || 0;
    const result = await evaluateCoupon(req.body?.code, subtotal);
    if (!result.ok) return res.status(400).json({ error: result.reason });
    res.json({ code: String(req.body.code).trim().toUpperCase(), discount: result.discount, type: result.coupon.type, value: Number(result.coupon.value) });
  } catch { res.status(500).json({ error: "Erro ao validar cupom." }); }
});

/* -------- Admin (ERP) -------- */

// Teste do PIX: devolve o copia-e-cola que o cliente receberia, com um valor de
// exemplo. Serve pra conferir a chave e o nome que aparece no app do banco
// antes de depender de um pedido real.
router.get("/admin/pix-test", requireAuth, requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try {
    const cfg = await getStoreConfig();
    if (!cfg.pixKey) {
      return res.json({ configured: false, storeName: cfg.storeName, city: cfg.city });
    }
    const { buildPixPayload } = await import("../lib/pix");
    const amount = 10;
    const payload = buildPixPayload({
      pixKey: cfg.pixKey, amount,
      merchantName: cfg.storeName, merchantCity: cfg.city || "CIDADE", txid: "TESTE",
    });
    res.json({ configured: true, pixKey: cfg.pixKey, storeName: cfg.storeName, city: cfg.city, amount, payload });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Não foi possível gerar o teste." });
  }
});

router.get("/admin/config", requireAuth, requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try { res.json(await getStoreVitrineConfig()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/admin/config", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const b = req.body || {};
    const current = await getStoreVitrineConfig();
    const termsText = String(b.termsText ?? current.termsText).slice(0, 20000).trim() || DEFAULT_TERMS;
    // Texto mudou = nova versão. Assim dá pra saber qual versão cada pedido aceitou.
    const termsVersion = termsText === current.termsText
      ? current.termsVersion
      : String((parseInt(current.termsVersion, 10) || 1) + 1);
    const headingFontUrl = b.theme?.fonts?.heading?.url;
    const bodyFontUrl = b.theme?.fonts?.body?.url;
    if (
      (typeof headingFontUrl === "string" && headingFontUrl.length > MAX_FONT_URL_CHARS) ||
      (typeof bodyFontUrl === "string" && bodyFontUrl.length > MAX_FONT_URL_CHARS)
    ) {
      return res.status(400).json({ error: "Arquivo de fonte muito grande. Escolha um arquivo menor." });
    }
    const payload = {
      heroTitle: String(b.heroTitle || "").slice(0, 120),
      heroSubtitle: String(b.heroSubtitle || "").slice(0, 300),
      announcement: String(b.announcement || "").slice(0, 200),
      featuredProductIds: Array.isArray(b.featuredProductIds) ? b.featuredProductIds.map(String).slice(0, 8) : [],
      banners: Array.isArray(b.banners) ? b.banners : [],
      quickLinks: Array.isArray(b.quickLinks) ? b.quickLinks : [],
      sideBannerTitle: String(b.sideBannerTitle || "").slice(0, 120),
      sideBannerSubtitle: String(b.sideBannerSubtitle || "").slice(0, 300),
      howToBuySteps: Array.isArray(b.howToBuySteps) ? b.howToBuySteps.slice(0, 6).map((s: any) => ({
        title: String(s?.title || "").slice(0, 60),
        desc: String(s?.desc || "").slice(0, 120),
      })) : null,
      howToBuyVisible: b.howToBuyVisible !== false,
      footerText: String(b.footerText || "").slice(0, 200),
      pages: normalizeStorePages(b.pages),
      heroCtaSize: normalizeHeroCtaSize(b.heroCtaSize),
      heroCtaOrder: normalizeHeroCtaOrder(b.heroCtaOrder),
      theme: {
        colors: normalizeStoreThemeColors(b.theme?.colors),
        fonts: {
          heading: normalizeStoreThemeFont(b.theme?.fonts?.heading),
          body: normalizeStoreThemeFont(b.theme?.fonts?.body),
        },
      },
      vitrines: Array.isArray(b.vitrines) ? b.vitrines.map((vt: any) => ({
        id: String(vt?.id || uuidv4()),
        title: String(vt?.title || "").slice(0, 60),
        productIds: Array.isArray(vt?.productIds) ? vt.productIds.map(String).slice(0, 12) : [],
      })).slice(0, 20) : [],
      termsText, termsVersion,
    };
    const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_KEY)).limit(1);
    if (rows.length > 0) await db.update(systemSettings).set({ value: payload, updatedAt: new Date() }).where(eq(systemSettings.key, STORE_CONFIG_KEY));
    else await db.insert(systemSettings).values({ key: STORE_CONFIG_KEY, value: payload });
    // Log de auditoria não grava o base64 da fonte inteiro (até ~800KB por save) — só o tamanho,
    // senão todo save de config (mesmo sem mexer em fonte) engorda audit_logs.newValues à toa.
    const auditPayload = {
      ...payload,
      theme: {
        ...payload.theme,
        fonts: {
          heading: { ...payload.theme.fonts.heading, url: payload.theme.fonts.heading.url ? `[${payload.theme.fonts.heading.url.length} chars]` : "" },
          body: { ...payload.theme.fonts.body, url: payload.theme.fonts.body.url ? `[${payload.theme.fonts.body.url.length} chars]` : "" },
        },
      },
    };
    await logAction(req.user!.userId, "STORE_CONFIG_UPDATE", "system_settings", STORE_CONFIG_KEY, null, auditPayload);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

const STORE_CONFIG_DRAFT_KEY = "store_config_draft";

// Rascunho do editor visual: começa como uma cópia do publicado na primeira
// leitura (não é preciso reconstruir tudo do zero pra começar a editar).
async function getStoreConfigDraft() {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_DRAFT_KEY)).limit(1);
  if (rows.length > 0) return rows[0].value as any;
  const published = await getStoreVitrineConfig();
  // Insert atômico com onConflictDoNothing: se duas requisições chegarem quase juntas
  // (ex.: dois GETs concorrentes na primeira leitura do rascunho), a que perder a corrida
  // não lança erro de unique constraint — só faz nada e a gente relê o valor que ganhou.
  await db.insert(systemSettings).values({ key: STORE_CONFIG_DRAFT_KEY, value: published }).onConflictDoNothing({ target: systemSettings.key });
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_DRAFT_KEY)).limit(1);
  return row.value as any;
}

router.get("/admin/config/draft", requireAuth, requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try { res.json(await getStoreConfigDraft()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Grava incremental: o editor manda só o campo que mudou, faz merge raso com
// o que já está no rascunho. Sem isso, cada clique-editar teria que reenviar
// o objeto inteiro (título, banners, tema...) e uma corrida entre dois campos
// editados quase juntos apagaria um deles.
router.patch("/admin/config/draft", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const current = await getStoreConfigDraft();
    const patch = req.body || {};
    const headingFontUrl = patch.theme?.fonts?.heading?.url;
    const bodyFontUrl = patch.theme?.fonts?.body?.url;
    if (
      (typeof headingFontUrl === "string" && headingFontUrl.length > MAX_FONT_URL_CHARS) ||
      (typeof bodyFontUrl === "string" && bodyFontUrl.length > MAX_FONT_URL_CHARS)
    ) {
      return res.status(400).json({ error: "Arquivo de fonte muito grande. Escolha um arquivo menor." });
    }
    const merged = {
      ...current,
      ...patch,
      theme: {
        colors: { ...(current.theme?.colors || {}), ...(patch.theme?.colors || {}) },
        fonts: {
          heading: patch.theme?.fonts?.heading ? normalizeStoreThemeFont(patch.theme.fonts.heading) : (current.theme?.fonts?.heading || normalizeStoreThemeFont(null)),
          body: patch.theme?.fonts?.body ? normalizeStoreThemeFont(patch.theme.fonts.body) : (current.theme?.fonts?.body || normalizeStoreThemeFont(null)),
        },
      },
      // `pages` ganha merge POR PÁGINA (espelha o tratamento de `theme` acima):
      // um patch pode mandar só { pages: { home: {...} } } sem apagar o
      // rascunho de catalogo. DENTRO de cada página o objeto é substituído
      // inteiro (sections é array — merge parcial de array não existe aqui,
      // mesma regra do merge raso do topo pra banners/vitrines). Quem manda
      // pages.catalogo precisa mandar titulo + sections juntos.
      pages: normalizeStorePages({ ...(current.pages || {}), ...(patch.pages || {}) }),
    };
    if (patch.theme?.colors) merged.theme.colors = normalizeStoreThemeColors(merged.theme.colors);
    // heroCtaSize/heroCtaOrder chegam pelo spread de `patch` sem passar pelo
    // normalizador — renormaliza sempre (cobre também rascunho antigo).
    merged.heroCtaSize = normalizeHeroCtaSize(merged.heroCtaSize);
    merged.heroCtaOrder = normalizeHeroCtaOrder(merged.heroCtaOrder);
    await db.update(systemSettings).set({ value: merged, updatedAt: new Date() }).where(eq(systemSettings.key, STORE_CONFIG_DRAFT_KEY));
    res.json(merged);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/admin/config/discard-draft", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    await db.delete(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_DRAFT_KEY));
    await db.delete(productGroupsDraft);
    await logAction(req.user!.userId, "STORE_DRAFT_DISCARD", "system_settings", STORE_CONFIG_DRAFT_KEY, null, null);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Categorias vistas pelo editor: mescla product_groups (real) com
// product_groups_draft (o que ainda não foi publicado). Uma linha de rascunho
// com sourceGroupId sobrepõe os campos da categoria real correspondente;
// deleted=true tira da lista (mas a categoria real continua existindo até
// Publicar); sourceGroupId nulo é categoria nova, só existe aqui.
router.get("/admin/categories/draft", requireAuth, requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try {
    const [real, drafts] = await Promise.all([
      db.select().from(productGroups).where(and(eq(productGroups.isActive, true), isNull(productGroups.deletedAt))),
      db.select().from(productGroupsDraft),
    ]);
    const draftBySource = new Map(drafts.filter((d) => d.sourceGroupId).map((d) => [d.sourceGroupId as string, d]));
    const merged = real
      .map((g) => {
        const d = draftBySource.get(g.id);
        if (d?.deleted) return null;
        return {
          id: g.id,
          draftId: d?.id || null,
          name: d?.name ?? g.name,
          icon: d?.icon ?? g.icon,
          storeVisible: d?.storeVisible ?? g.storeVisible,
          sortOrder: d?.sortOrder ?? g.sortOrder,
          isNew: false,
          hasPendingChanges: !!d,
        };
      })
      .filter(Boolean) as any[];
    const newOnes = drafts.filter((d) => !d.sourceGroupId && !d.deleted).map((d) => ({
      id: d.id, draftId: d.id, name: d.name, icon: d.icon, storeVisible: d.storeVisible,
      sortOrder: d.sortOrder, isNew: true, hasPendingChanges: true,
    }));
    const all = [...merged, ...newOnes].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    res.json({ data: all });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/admin/categories/draft", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da categoria é obrigatório." });
    const [row] = await db.insert(productGroupsDraft).values({
      sourceGroupId: null,
      name,
      icon: req.body?.icon ? String(req.body.icon) : null,
      storeVisible: req.body?.storeVisible !== false,
      sortOrder: Number(req.body?.sortOrder) || 0,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// id aqui é sempre o id "visível" no editor: id real (categoria existente) ou
// id de rascunho (categoria nova, isNew=true no GET acima).
router.put("/admin/categories/draft/:id", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da categoria é obrigatório." });
    const patch = {
      name,
      icon: req.body?.icon ? String(req.body.icon) : null,
      storeVisible: req.body?.storeVisible !== false,
      sortOrder: Number(req.body?.sortOrder) || 0,
    };
    const [byId] = await db.select().from(productGroupsDraft).where(eq(productGroupsDraft.id, id)).limit(1);
    if (byId) {
      const [updated] = await db.update(productGroupsDraft).set({ ...patch, updatedAt: new Date() }).where(eq(productGroupsDraft.id, id)).returning();
      return res.json(updated);
    }
    // Upsert race-free por sourceGroupId (id aqui é sempre uma categoria real, já
    // que não bateu com nenhum id de rascunho acima): usa o índice único parcial
    // product_groups_draft_source_group_unique em vez de SELECT-then-branch, que
    // deixava uma janela pra duas requisições quase simultâneas (duplo clique,
    // duas abas) criarem duas linhas de rascunho pra mesma categoria.
    const [upserted] = await db.insert(productGroupsDraft)
      .values({ sourceGroupId: id, ...patch })
      .onConflictDoUpdate({
        target: productGroupsDraft.sourceGroupId,
        targetWhere: sql`${productGroupsDraft.sourceGroupId} IS NOT NULL`,
        set: { ...patch, updatedAt: new Date() },
      })
      .returning();
    res.json(upserted);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/admin/categories/draft/:id", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [byId] = await db.select().from(productGroupsDraft).where(eq(productGroupsDraft.id, id)).limit(1);
    if (byId && !byId.sourceGroupId) {
      await db.delete(productGroupsDraft).where(eq(productGroupsDraft.id, id));
      return res.json({ success: true });
    }
    const [bySource] = byId ? [byId] : await db.select().from(productGroupsDraft).where(eq(productGroupsDraft.sourceGroupId, id)).limit(1);
    if (bySource) {
      await db.update(productGroupsDraft).set({ deleted: true, updatedAt: new Date() }).where(eq(productGroupsDraft.id, bySource.id));
    } else {
      await db.insert(productGroupsDraft).values({ sourceGroupId: id, name: "(apagada)", deleted: true });
    }
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Publica o editor visual: aplica o diff de categorias (product_groups_draft)
// na tabela real e copia o rascunho de aparência (STORE_CONFIG_DRAFT_KEY) por
// cima do publicado (STORE_CONFIG_KEY) — tudo numa única transação, então se
// uma exclusão de categoria estiver bloqueada (produto vinculado) nada é
// publicado pela metade.
router.post("/admin/config/publish", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const blockedNames: string[] = [];
    await db.transaction(async (tx) => {
      // Trava a publicação inteira: dois cliques/abas publicando ao mesmo tempo
      // serializam em vez de correr — evita categoria duplicada no branch de
      // inserção nova. Libera sozinho no commit/rollback da transação.
      await tx.execute(sql`select pg_advisory_xact_lock(729132845)`);

      // 1) Diff de categorias primeiro.
      const drafts = await tx.select().from(productGroupsDraft);
      for (const d of drafts) {
        if (d.sourceGroupId && d.deleted) {
          const [hasProducts] = await tx.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.groupId, d.sourceGroupId));
          if (Number(hasProducts.count) > 0) {
            const [g] = await tx.select({ name: productGroups.name }).from(productGroups).where(eq(productGroups.id, d.sourceGroupId)).limit(1);
            blockedNames.push(g?.name || "categoria");
            continue;
          }
          await tx.update(productGroups).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(productGroups.id, d.sourceGroupId));
        } else if (d.sourceGroupId && !d.deleted) {
          await tx.update(productGroups).set({
            name: d.name, icon: d.icon, storeVisible: d.storeVisible, sortOrder: d.sortOrder, updatedAt: new Date(),
          }).where(eq(productGroups.id, d.sourceGroupId));
        } else if (!d.sourceGroupId && !d.deleted) {
          await tx.insert(productGroups).values({
            name: d.name, icon: d.icon, storeVisible: d.storeVisible, sortOrder: d.sortOrder,
          });
        }
      }
      if (blockedNames.length > 0) {
        throw Object.assign(new Error(`Não é possível apagar: ${blockedNames.join(", ")} — ainda tem produto vinculado. Use Arquivar em Grupos/Categorias.`), { statusCode: 400 });
      }
      await tx.delete(productGroupsDraft);

      // 2) Copia o rascunho de aparência pro publicado (só se existir rascunho).
      const draftConfig = await tx.select().from(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_DRAFT_KEY)).limit(1);
      if (draftConfig.length > 0) {
        const publishedRows = await tx.select().from(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_KEY)).limit(1);
        // termsText/termsVersion pertencem à aba Termos (legada, PUT /admin/config —
        // fluxo separado, fora do rascunho/publish). O rascunho do editor visual é
        // uma cópia feita uma única vez em getStoreConfigDraft() e nunca é
        // re-sincronizada com os termos, então pode estar desatualizada. Preserva o
        // termsText/termsVersion do publicado atual (se já existir linha) pra
        // Publicar não reverter uma edição de termos feita depois que o rascunho
        // foi criado — os dois fluxos não podem se sobrescrever.
        const publishedValue = publishedRows[0]?.value as any;
        const value = publishedValue
          ? { ...(draftConfig[0].value as any), termsText: publishedValue.termsText, termsVersion: publishedValue.termsVersion }
          : draftConfig[0].value;
        if (publishedRows.length > 0) await tx.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.key, STORE_CONFIG_KEY));
        else await tx.insert(systemSettings).values({ key: STORE_CONFIG_KEY, value });
        await tx.delete(systemSettings).where(eq(systemSettings.key, STORE_CONFIG_DRAFT_KEY));
      }

      await tx.insert(auditLogs).values({
        id: uuidv4(), userId: req.user!.userId, action: "STORE_CONFIG_PUBLISH",
        tableName: "system_settings", recordId: STORE_CONFIG_KEY, newValues: null,
      });
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || "Erro ao publicar." });
  }
});

// CRUD de cupons.
router.get("/admin/coupons", requireAuth, requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try {
    const { storeCoupons } = await import("../db/schema");
    const rows = await db.select().from(storeCoupons).orderBy(desc(storeCoupons.createdAt));
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

function parseCouponBody(b: any) {
  const code = String(b.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code || code.length < 3) throw new Error("Código do cupom precisa de pelo menos 3 caracteres.");
  const type = b.type === "FIXED" ? "FIXED" : "PERCENT";
  const value = Number(b.value);
  if (!(value > 0)) throw new Error("Valor do desconto precisa ser maior que zero.");
  if (type === "PERCENT" && value > 90) throw new Error("Desconto percentual máximo: 90%.");
  return {
    code, type, value: value.toFixed(2),
    minOrderBrl: b.minOrderBrl != null && b.minOrderBrl !== "" ? Number(b.minOrderBrl).toFixed(2) : null,
    maxUses: b.maxUses != null && b.maxUses !== "" ? Math.max(1, parseInt(String(b.maxUses), 10) || 1) : null,
    validFrom: b.validFrom ? new Date(String(b.validFrom)) : null,
    validUntil: b.validUntil ? dayEndUtc(String(b.validUntil)) : null,
    isActive: b.isActive !== false,
  };
}

router.post("/admin/coupons", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { storeCoupons } = await import("../db/schema");
    const data = parseCouponBody(req.body || {});
    const [created] = await db.insert(storeCoupons).values(data).returning();
    await logAction(req.user!.userId, "STORE_COUPON_CREATE", "store_coupons", created.id, null, { code: data.code });
    res.json({ data: created });
  } catch (err: any) {
    if (String(err.message || "").includes("unique") || String(err.message || "").includes("duplicate")) {
      return res.status(409).json({ error: "Já existe um cupom com esse código." });
    }
    res.status(400).json({ error: err.message });
  }
});

router.put("/admin/coupons/:id", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { storeCoupons } = await import("../db/schema");
    const data = parseCouponBody(req.body || {});
    const [updated] = await db.update(storeCoupons).set({ ...data, updatedAt: new Date() }).where(eq(storeCoupons.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Cupom não encontrado." });
    await logAction(req.user!.userId, "STORE_COUPON_UPDATE", "store_coupons", updated.id, null, { code: data.code });
    res.json({ data: updated });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/admin/coupons/:id", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { storeCoupons } = await import("../db/schema");
    // Nunca apaga de verdade (o pedido antigo referencia o código no histórico): só desativa.
    const [updated] = await db.update(storeCoupons).set({ isActive: false, updatedAt: new Date() }).where(eq(storeCoupons.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Cupom não encontrado." });
    await logAction(req.user!.userId, "STORE_COUPON_DISABLE", "store_coupons", updated.id, null, { code: updated.code });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// CRUD de regiões de entrega.
router.get("/admin/shipping-zones", requireAuth, requirePermission("settings", "manage"), async (_req: AuthRequest, res) => {
  try {
    const { storeShippingZones } = await import("../db/schema");
    const rows = await db.select().from(storeShippingZones).orderBy(storeShippingZones.sortOrder, storeShippingZones.name);
    res.json({ data: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/admin/shipping-zones", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { storeShippingZones } = await import("../db/schema");
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Informe o nome da região (cidade/bairro)." });
    const fee = Number(req.body?.feeBrl);
    if (!(fee >= 0)) return res.status(400).json({ error: "Taxa de entrega inválida." });
    const [created] = await db.insert(storeShippingZones).values({
      name, feeBrl: fee.toFixed(2),
      sortOrder: parseInt(String(req.body?.sortOrder), 10) || 0,
      isActive: req.body?.isActive !== false,
    }).returning();
    await logAction(req.user!.userId, "STORE_ZONE_CREATE", "store_shipping_zones", created.id, null, { name });
    res.json({ data: created });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.put("/admin/shipping-zones/:id", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { storeShippingZones } = await import("../db/schema");
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Informe o nome da região." });
    const fee = Number(req.body?.feeBrl);
    if (!(fee >= 0)) return res.status(400).json({ error: "Taxa de entrega inválida." });
    const [updated] = await db.update(storeShippingZones).set({
      name, feeBrl: fee.toFixed(2),
      sortOrder: parseInt(String(req.body?.sortOrder), 10) || 0,
      isActive: req.body?.isActive !== false,
      updatedAt: new Date(),
    }).where(eq(storeShippingZones.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Região não encontrada." });
    await logAction(req.user!.userId, "STORE_ZONE_UPDATE", "store_shipping_zones", updated.id, null, { name });
    res.json({ data: updated });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/admin/shipping-zones/:id", requireAuth, requirePermission("settings", "manage"), async (req: AuthRequest, res) => {
  try {
    const { storeShippingZones } = await import("../db/schema");
    const [updated] = await db.update(storeShippingZones).set({ isActive: false, updatedAt: new Date() }).where(eq(storeShippingZones.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Região não encontrada." });
    await logAction(req.user!.userId, "STORE_ZONE_DISABLE", "store_shipping_zones", updated.id, null, { name: updated.name });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
