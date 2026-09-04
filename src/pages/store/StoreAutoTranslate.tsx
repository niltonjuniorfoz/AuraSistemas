import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18nInstance from "./i18n";

type Lang = "pt" | "es" | "en";
type Copy = { pt: string; es: string; en: string };

const EXTRA_COPY: Copy[] = [
  { pt: "Todas categorias", es: "Todas las categorías", en: "All categories" },
  { pt: "Todas as categorias", es: "Todas las categorías", en: "All categories" },
  { pt: "Favoritos", es: "Favoritos", en: "Favorites" },
  { pt: "Meus pedidos", es: "Mis pedidos", en: "My orders" },
  { pt: "Minha conta", es: "Mi cuenta", en: "My account" },
  { pt: "Ofertas", es: "Ofertas", en: "Deals" },
  { pt: "Início", es: "Inicio", en: "Home" },
  { pt: "Categorias", es: "Categorías", en: "Categories" },
  { pt: "Conta", es: "Cuenta", en: "Account" },
  { pt: "Menu", es: "Menú", en: "Menu" },
  { pt: "Fechar", es: "Cerrar", en: "Close" },
  { pt: "Buscar", es: "Buscar", en: "Search" },
  { pt: "Pagamento seguro", es: "Pago seguro", en: "Secure payment" },
  { pt: "Ambiente protegido para suas compras.", es: "Ambiente protegido para tus compras.", en: "Protected checkout environment." },
  { pt: "Compra 100% segura", es: "Compra 100% segura", en: "100% secure purchase" },
  { pt: "Seus dados protegidos", es: "Tus datos protegidos", en: "Your data is protected" },
  { pt: "Produtos de qualidade", es: "Productos de calidad", en: "Quality products" },
  { pt: "Seleção e procedência", es: "Selección y procedencia", en: "Curated and traceable" },
  { pt: "Envio para todo o Brasil", es: "Envíos a todo Brasil", en: "Shipping across Brazil" },
  { pt: "Entrega rápida e rastreada", es: "Entrega rápida y rastreada", en: "Fast tracked delivery" },
  { pt: "Atendimento especializado", es: "Atención especializada", en: "Specialized support" },
  { pt: "Antes e depois da compra", es: "Antes y después de la compra", en: "Before and after purchase" },
  { pt: "Você também pode gostar", es: "También te puede gustar", en: "You may also like" },
  { pt: "Ver mais", es: "Ver más", en: "See more" },
  { pt: "Você está vendo", es: "Estás viendo", en: "You are viewing" },
  { pt: "Sobre o produto", es: "Sobre el producto", en: "About the product" },
  { pt: "Filtrar", es: "Filtrar", en: "Filters" },
  { pt: "Filtros", es: "Filtros", en: "Filters" },
  { pt: "Aplicar filtros", es: "Aplicar filtros", en: "Apply filters" },
  { pt: "Limpar filtros", es: "Limpiar filtros", en: "Clear filters" },
  { pt: "Marca", es: "Marca", en: "Brand" },
  { pt: "Categoria", es: "Categoría", en: "Category" },
  { pt: "Modelo", es: "Modelo", en: "Model" },
  { pt: "Preço", es: "Precio", en: "Price" },
  { pt: "Mínimo", es: "Mínimo", en: "Minimum" },
  { pt: "Máximo", es: "Máximo", en: "Maximum" },
  { pt: "Pagamento por PIX com QR Code na finalização", es: "Pago por PIX con QR al finalizar", en: "PIX payment with QR code at checkout" },
  { pt: "Retirada ou entrega — você escolhe no pedido", es: "Retiro o envío — elegís al hacer el pedido", en: "Pickup or delivery — choose at checkout" },
  { pt: "Carrinho", es: "Carrito", en: "Cart" },
  { pt: "Finalizar pedido", es: "Finalizar pedido", en: "Checkout" },
  { pt: "Continuar comprando", es: "Seguir comprando", en: "Continue shopping" },
  { pt: "Produtos", es: "Productos", en: "Products" },
  { pt: "Produto", es: "Producto", en: "Product" },
  { pt: "Carregando...", es: "Cargando...", en: "Loading..." },
  { pt: "Carregando produtos...", es: "Cargando productos...", en: "Loading products..." },
  { pt: "LOADING PRODUCTS...", es: "CARGANDO PRODUCTOS...", en: "LOADING PRODUCTS..." },
  { pt: "Nenhum produto encontrado", es: "Ningún producto encontrado", en: "No products found" },
  { pt: "Nome (A–Z)", es: "Nombre (A–Z)", en: "Name (A–Z)" },
  { pt: "Nome (A-Z)", es: "Nombre (A-Z)", en: "Name (A-Z)" },
  { pt: "Menor preço", es: "Menor precio", en: "Lowest price" },
  { pt: "Maior preço", es: "Mayor precio", en: "Highest price" },
  { pt: "Ver todos", es: "Ver todos", en: "See all" },
  { pt: "Produtos mais amados", es: "Productos más amados", en: "Most loved products" },
  { pt: "Categorias em destaque", es: "Categorías destacadas", en: "Featured categories" },
  { pt: "Lançamentos", es: "Novedades", en: "New arrivals" },
  { pt: "Kits e Presentes", es: "Kits y regalos", en: "Kits & gifts" },
  { pt: "Acessórios", es: "Accesorios", en: "Accessories" },
  { pt: "Corpo e Banho", es: "Cuerpo y baño", en: "Body & bath" },
  { pt: "Perfumes", es: "Perfumes", en: "Perfumes" },
  { pt: "Cabelos", es: "Cabello", en: "Hair" },
  { pt: "Skincare", es: "Skincare", en: "Skincare" },
  { pt: "Maquiagem", es: "Maquillaje", en: "Makeup" },
];

const PRODUCT_GLOSSARY: Array<{ pt: string; es: string; en: string }> = [
  { pt: "PRODUTO TESTE", es: "PRODUCTO DE PRUEBA", en: "TEST PRODUCT" },
  { pt: "KIT DE CUIDADOS", es: "KIT DE CUIDADO", en: "CARE KIT" },
  { pt: "CUIDADOS CORPORAIS", es: "CUIDADOS CORPORALES", en: "BODY CARE" },
  { pt: "CORPO E BANHO", es: "CUERPO Y BAÑO", en: "BODY & BATH" },
  { pt: "PARA CABELOS", es: "PARA EL CABELLO", en: "HAIR CARE" },
  { pt: "KITS E PRESENTES", es: "KITS Y REGALOS", en: "KITS & GIFTS" },
  { pt: "LANÇAMENTOS", es: "NOVEDADES", en: "NEW ARRIVALS" },
  { pt: "MAQUIAGEM", es: "MAQUILLAJE", en: "MAKEUP" },
  { pt: "HIDRATANTE", es: "HIDRATANTE", en: "MOISTURIZER" },
  { pt: "HIDRATAÇÃO", es: "HIDRATACIÓN", en: "HYDRATION" },
  { pt: "DESODORANTE", es: "DESODORANTE", en: "DEODORANT" },
  { pt: "SABONETE", es: "JABÓN", en: "CLEANSER" },
  { pt: "CONDICIONADOR", es: "ACONDICIONADOR", en: "CONDITIONER" },
  { pt: "MÁSCARA", es: "MASCARILLA", en: "MASK" },
  { pt: "OLEO", es: "ACEITE", en: "OIL" },
  { pt: "ÓLEO", es: "ACEITE", en: "OIL" },
  { pt: "CREME", es: "CREMA", en: "CREAM" },
  { pt: "PERFUME", es: "PERFUME", en: "PERFUME" },
  { pt: "FEMININO", es: "FEMENINO", en: "WOMEN'S" },
  { pt: "MASCULINO", es: "MASCULINO", en: "MEN'S" },
  { pt: "CORPORAL", es: "CORPORAL", en: "BODY" },
  { pt: "CORPO", es: "CUERPO", en: "BODY" },
  { pt: "ROSTO", es: "ROSTRO", en: "FACE" },
  { pt: "MÃOS", es: "MANOS", en: "HANDS" },
  { pt: "CABELOS", es: "CABELLO", en: "HAIR" },
  { pt: "PÊSSEGO", es: "DURAZNO", en: "PEACH" },
  { pt: "PRESENTES", es: "REGALOS", en: "GIFTS" },
  { pt: "CONJUNTO", es: "CONJUNTO", en: "SET" },
  { pt: "PEÇAS", es: "PIEZAS", en: "PIECES" },
  { pt: "PRODUTO", es: "PRODUCTO", en: "PRODUCT" },
  { pt: "TESTE", es: "PRUEBA", en: "TEST" },
];

const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();
const ATTRIBUTES = ["placeholder", "title", "aria-label"];

function langCode(value: string | undefined): Lang {
  const code = String(value || "pt").toLowerCase().split("-")[0];
  return code === "es" || code === "en" ? code : "pt";
}

function flattenResource(value: any, prefix = "", out = new Map<string, string>()) {
  if (!value || typeof value !== "object") return out;
  Object.entries(value).forEach(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string" && child.trim() && !child.includes("{{")) out.set(child.trim(), path);
    else if (child && typeof child === "object") flattenResource(child, path, out);
  });
  return out;
}

const resourceReverse = new Map<string, string>();
(["pt", "es", "en"] as const).forEach((language) => {
  const bundle = flattenResource(i18nInstance.getResourceBundle(language, "translation") || {});
  bundle.forEach((key, value) => resourceReverse.set(value, key));
});

const extraLookup = new Map<string, Copy>();
EXTRA_COPY.forEach((item) => {
  extraLookup.set(item.pt, item);
  extraLookup.set(item.es, item);
  extraLookup.set(item.en, item);
});

function isDynamicValue(value: string) {
  const text = value.trim();
  if (!text) return true;
  if (/^(?:R\$|US?\$|U\$|Gs\.?|₲)\s*[\d.,]+/i.test(text)) return true;
  if (/^[A-Z]{2,5}-\d{3,}(?:\s|$)/i.test(text)) return true;
  if (/^[\d\s.,%/+\-]+$/.test(text)) return true;
  if (/^(?:https?:\/\/|www\.)/i.test(text)) return true;
  return false;
}

function replaceInsensitive(value: string, from: string, to: string) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(escaped, "gi"), (match) => {
    if (match === match.toUpperCase()) return to.toUpperCase();
    if (match === match.toLowerCase()) return to.toLowerCase();
    return to.charAt(0).toUpperCase() + to.slice(1).toLowerCase();
  });
}

function translateProductCopy(source: string, language: Lang) {
  if (language === "pt" || isDynamicValue(source)) return null;
  let result = source;
  for (const item of PRODUCT_GLOSSARY) {
    result = replaceInsensitive(result, item.pt, language === "es" ? item.es : item.en);
  }
  return result !== source ? result : null;
}

function translateKnownValue(source: string, language: Lang) {
  const trimmed = source.trim();
  if (!trimmed || isDynamicValue(trimmed)) return null;

  const extra = extraLookup.get(trimmed);
  if (extra) {
    const translated = extra[language];
    if (translated !== trimmed || language === "pt") {
      const leading = source.match(/^\s*/)?.[0] || "";
      const trailing = source.match(/\s*$/)?.[0] || "";
      return `${leading}${translated}${trailing}`;
    }
  }

  const key = resourceReverse.get(trimmed);
  if (key) {
    const translated = i18nInstance.t(key, { lng: language, defaultValue: trimmed });
    if (typeof translated === "string" && translated && translated !== key) {
      const leading = source.match(/^\s*/)?.[0] || "";
      const trailing = source.match(/\s*$/)?.[0] || "";
      return `${leading}${translated}${trailing}`;
    }
  }

  const product = translateProductCopy(source, language);
  if (product) return product;
  return null;
}

function shouldSkip(element: Element | null) {
  if (!element) return true;
  if (element.closest("[data-no-store-translate]")) return true;
  if (element.closest("[contenteditable='true']")) return true;
  const tag = element.tagName;
  return tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "CODE" || tag === "PRE";
}

function translateTextNode(text: Text, language: Lang) {
  const parent = text.parentElement;
  if (shouldSkip(parent)) return;

  const current = text.nodeValue || "";
  if (isDynamicValue(current)) return;

  let source = originalText.get(text);
  if (!source) {
    const candidate = translateKnownValue(current, language);
    if (!candidate) return;
    source = current;
    originalText.set(text, source);
  }

  const translated = language === "pt" ? source : translateKnownValue(source, language);
  const next = translated || source;
  if (text.nodeValue !== next) text.nodeValue = next;
}

function translateElement(root: Element, language: Lang) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text, language);
    node = walker.nextNode();
  }

  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  elements.forEach((element) => {
    if (shouldSkip(element)) return;
    let saved = originalAttrs.get(element);
    if (!saved) {
      saved = new Map<string, string>();
      originalAttrs.set(element, saved);
    }

    ATTRIBUTES.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const current = element.getAttribute(attribute) || "";
      if (isDynamicValue(current)) return;

      if (!saved!.has(attribute)) {
        const candidate = translateKnownValue(current, language);
        if (!candidate) return;
        saved!.set(attribute, current);
      }

      const source = saved!.get(attribute) || "";
      const translated = language === "pt" ? source : translateKnownValue(source, language);
      const next = translated || source;
      if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
    });
  });
}

export function StoreAutoTranslate() {
  const { i18n } = useTranslation();
  const language = langCode(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    if (!window.location.pathname.startsWith("/loja")) return;
    let queued = false;

    const run = () => {
      queued = false;
      translateElement(document.body, language);
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(run);
    };

    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
