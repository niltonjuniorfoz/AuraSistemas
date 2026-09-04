import { Router } from "express";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  companySettings,
  productGroups,
  products,
  stockBalances,
  storeShippingZones,
} from "../db/schema";
import { formatBrl } from "../lib/money";

const FALLBACK_SHIPPING_ZONE_ID = "00000000-0000-4000-8000-000000000001";
const FALLBACK_SHIPPING_ZONE_NAME = "Entrega local";

const normalize = (value: unknown) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const availableStockExpr = () => sql<number>`greatest(${stockBalances.physicalStock} - ${stockBalances.reservedStock}, 0)`;

async function getOrCreateShippingZones() {
  let rows = await db.select().from(storeShippingZones)
    .where(eq(storeShippingZones.isActive, true))
    .orderBy(storeShippingZones.sortOrder, storeShippingZones.name);

  if (rows.length) return rows;

  await db.insert(storeShippingZones).values({
    id: FALLBACK_SHIPPING_ZONE_ID,
    name: FALLBACK_SHIPPING_ZONE_NAME,
    feeBrl: "0",
    isActive: true,
    sortOrder: 999,
  }).onConflictDoNothing();

  rows = await db.select().from(storeShippingZones)
    .where(eq(storeShippingZones.isActive, true))
    .orderBy(storeShippingZones.sortOrder, storeShippingZones.name);
  return rows;
}

const STOP_WORDS = new Set([
  "tem", "ter", "vcs", "voce", "voces", "produto", "produtos", "para", "com", "uma", "uns", "das", "dos",
  "algum", "alguma", "quero", "queria", "e", "de", "da", "do", "na", "no", "loja", "vende", "vender",
]);
const BROAD_PRODUCT_WORDS = new Set([
  "perfume", "perfumes", "perfum", "fragr", "parfum", "toilette", "cabel", "cabelo", "cabelos", "hair",
  "shampoo", "condicionador", "oleo", "oil", "body", "splash", "maqui", "makeup", "creme", "hidrat", "kit", "kits",
]);

function baseMessageTerms(message: string) {
  return normalize(message).split(" ").filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
}

function searchTerms(message: string) {
  const base = baseMessageTerms(message);
  const text = normalize(message);
  const extra: string[] = [];

  if (/cabel|shampoo|condicionador|hair/.test(text)) extra.push("cabel", "shampoo", "condicionador", "hair");
  if (/perfum|fragr|eau de/.test(text)) extra.push("perfum", "fragr", "parfum", "toilette");
  if (/oleo|oil/.test(text)) extra.push("oleo", "oil");
  if (/body splash|splash/.test(text)) extra.push("body splash", "splash");
  if (/maqui|makeup/.test(text)) extra.push("maqui", "makeup");
  if (/hidrat|creme/.test(text)) extra.push("hidrat", "creme");

  return [...new Set([...base, ...extra])].slice(0, 12);
}

function specificTerms(message: string) {
  return baseMessageTerms(message)
    .filter((term) => !BROAD_PRODUCT_WORDS.has(term))
    .filter((term) => term.length >= 4)
    .slice(0, 5);
}

function formatPrice(value: number, currency: string) {
  if (currency === "USD") return `US$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (currency === "PYG") return `Gs. ${Math.round(value).toLocaleString("es-PY")}`;
  return formatBrl(value);
}

function stockLabel(available: number, lang: string) {
  if (lang === "en") return available > 10 ? "in stock" : available > 0 ? `${available} units left` : "out of stock";
  if (lang === "es") return available > 10 ? "disponible" : available > 0 ? `quedan ${available} unidades` : "agotado";
  return available > 10 ? "disponível" : available > 0 ? `restam ${available} unidades` : "esgotado";
}

async function realCatalogMatches(message: string): Promise<Array<{ nome: string; preco: string; estoque: number }>> {
  const terms = searchTerms(message);
  if (!terms.length) return [];
  const requiredSpecific = specificTerms(message);

  const [company] = await db.select({ defaultCurrency: companySettings.defaultCurrency }).from(companySettings).limit(1);
  const currency = String(company?.defaultCurrency || "BRL").toUpperCase();

  const rows = await db.select({
    id: products.id,
    name: products.name,
    sku: products.sku,
    description: products.storeDescription,
    brand: products.brand,
    model: products.model,
    price: products.salePriceA,
    groupName: productGroups.name,
    available: availableStockExpr(),
  })
    .from(products)
    .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
    .leftJoin(productGroups, eq(products.groupId, productGroups.id))
    .where(and(eq(products.isActive, true), eq(products.storeVisible, true), isNull(products.parentId)))
    .limit(240);

  const scored = rows.map((row) => {
    const name = normalize(row.name);
    const group = normalize(row.groupName);
    const haystack = normalize([row.name, row.sku, row.description, row.brand, row.model, row.groupName].filter(Boolean).join(" "));
    if (requiredSpecific.length && !requiredSpecific.every((term) => haystack.includes(term))) {
      return { row, score: 0 };
    }
    let score = 0;
    for (const term of terms) {
      if (name.includes(term)) score += 8;
      if (group.includes(term)) score += 7;
      if (haystack.includes(term)) score += 2;
    }
    return { row, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!scored.length) return [];

  const ids = scored.map((entry) => entry.row.id);
  const variants = await db.select({
    parentId: products.parentId,
    price: products.salePriceA,
    available: availableStockExpr(),
  })
    .from(products)
    .innerJoin(stockBalances, eq(products.id, stockBalances.productId))
    .where(and(eq(products.isActive, true), eq(products.storeVisible, true), inArray(products.parentId, ids)));

  const byParent = new Map<string, Array<{ price: number; available: number }>>();
  for (const variant of variants) {
    if (!variant.parentId) continue;
    const list = byParent.get(variant.parentId) || [];
    list.push({ price: Number(variant.price), available: Number(variant.available) });
    byParent.set(variant.parentId, list);
  }

  return scored.map(({ row }) => {
    const children = byParent.get(row.id) || [];
    const available = children.length ? children.reduce((sum, item) => sum + item.available, 0) : Number(row.available);
    const price = children.length ? Math.min(...children.map((item) => item.price)) : Number(row.price);
    return { nome: row.name, preco: formatPrice(price, currency), estoque: available };
  }).filter((item) => item.estoque > 0).slice(0, 5);
}

function productReply(matches: Array<{ nome: string; preco: string; estoque: number }>, lang: string) {
  if (!matches.length) {
    if (lang === "en") return "I couldn't find a matching product in the current catalog. Try a brand, product name, or category and I'll check the live inventory.";
    if (lang === "es") return "No encontré un producto que coincida en el catálogo actual. Probá con una marca, nombre o categoría y reviso el stock real.";
    return "Não localizei um produto correspondente no catálogo atual. Tente uma marca, nome ou categoria e eu confiro o estoque real.";
  }
  const lines = matches.map((item) => `• ${item.nome} — ${item.preco} (${stockLabel(item.estoque, lang)})`);
  if (lang === "en") return `Yes. I found ${matches.length} matching option${matches.length > 1 ? "s" : ""} in the live catalog:\n${lines.join("\n")}`;
  if (lang === "es") return `Sí. Encontré ${matches.length} opción${matches.length > 1 ? "es" : ""} en el catálogo actual:\n${lines.join("\n")}`;
  return `Sim. Encontrei ${matches.length} opção${matches.length > 1 ? "ões" : ""} no catálogo atual:\n${lines.join("\n")}`;
}

function sanitizeUsdtWhatsappUrl(raw: string) {
  try {
    const url = new URL(raw);
    const text = url.searchParams.get("text") || "";
    const cleaned = text
      .replace(/^\s*Ol[aá]!\s*Vim pelo site da\s+(.+?)\s+e quero efetivar o pedido\s+([^\s]+)\s+via USDT\.\s*/i, "Pedido $2 via USDT — $1.\n")
      .replace(/^\s*Ol[aá]!\s*/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    url.searchParams.set("text", cleaned);
    return url.toString();
  } catch {
    return raw;
  }
}

export const storefrontFixesRouter = Router();

// O checkout não pode bloquear Entrega só porque o ambiente ainda não tem uma
// zona cadastrada. Nesse caso criamos uma opção local neutra; assim que o admin
// cadastrar regiões reais, elas passam a ser usadas automaticamente.
storefrontFixesRouter.get("/shipping-zones", async (_req, res) => {
  try {
    const rows = await getOrCreateShippingZones();
    res.json({ data: rows.map((row) => ({ id: row.id, name: row.name, feeBrl: Number(row.feeBrl) })) });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Não foi possível carregar as opções de entrega." });
  }
});

// Antes do handler original criar o pedido, garante que a opção de entrega
// enviada ainda existe e limpa a mensagem de WhatsApp devolvida para USDT.
storefrontFixesRouter.post("/orders", async (req, res, next) => {
  try {
    if (String(req.body?.deliveryType || "").toUpperCase() === "DELIVERY" && !req.body?.shippingZoneId) {
      const zones = await getOrCreateShippingZones();
      if (zones[0]) req.body.shippingZoneId = zones[0].id;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
      if (body?.whatsappUrl && String(body?.paymentMethod || "").toUpperCase() === "USDT") {
        body = { ...body, whatsappUrl: sanitizeUsdtWhatsappUrl(String(body.whatsappUrl)) };
      }
      return originalJson(body);
    }) as typeof res.json;
    next();
  } catch (error) {
    next(error);
  }
});

// Respostas factuais de catálogo e pagamento são determinísticas. A IA antiga
// continua disponível para conversa genérica, mas não pode negar produto/meio
// de pagamento que existe no próprio banco/configuração.
storefrontFixesRouter.post("/assistant/chat", async (req, res, next) => {
  try {
    const message = String(req.body?.message || "").trim();
    const normalized = normalize(message);
    const lang = ["pt", "es", "en"].includes(req.body?.lang) ? String(req.body.lang) : "pt";

    if (/\busdt\b|\bpix\b|pagamento|payment|pago|pagar/.test(normalized)) {
      const [company] = await db.select({ whatsapp: companySettings.whatsappGateway }).from(companySettings).limit(1);
      const usdtEnabled = String(company?.whatsapp || "").replace(/\D/g, "").length >= 8;
      if (lang === "en") return res.json({ reply: usdtEnabled ? "Yes. We accept PIX and USDT. For USDT, after checkout WhatsApp opens with the verified order summary so you can confirm the network and wallet address before transferring." : "PIX is available. USDT is temporarily unavailable because the store WhatsApp has not been configured." });
      if (lang === "es") return res.json({ reply: usdtEnabled ? "Sí. Aceptamos PIX y USDT. Para USDT, después de finalizar el pedido se abre WhatsApp con el resumen verificado para confirmar la red y la dirección de la billetera antes de transferir." : "PIX está disponible. USDT está temporalmente indisponible porque falta configurar el WhatsApp de la tienda." });
      return res.json({ reply: usdtEnabled ? "Sim. Aceitamos PIX e USDT. No USDT, após finalizar o pedido o WhatsApp abre com o resumo conferido para você confirmar a rede e o endereço da carteira antes de transferir." : "PIX está disponível. O USDT está temporariamente indisponível porque o WhatsApp da loja ainda não foi configurado." });
    }

    const terms = searchTerms(message);
    const catalogIntent = terms.length > 0 && /(tem|produto|produtos|shampoo|condicionador|cabel|perfum|fragr|oleo|oil|body splash|splash|maqui|creme|hidrat|kit|carolina|victoria|kerasy)/.test(normalized);
    if (!catalogIntent) return next();

    const matches = await realCatalogMatches(message);
    return res.json({ reply: productReply(matches, lang) });
  } catch (error) {
    next(error);
  }
});
