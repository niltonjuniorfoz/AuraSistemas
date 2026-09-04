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
  { pt: "Sobre o produto", es: "Sobre el producto", en: "About the product" },
  { pt: "Filtrar", es: "Filtrar", en: "Filters" },
  { pt: "Filtros", es: "Filtros", en: "Filters" },
  { pt: "Aplicar filtros", es: "Aplicar filtros", en: "Apply filters" },
  { pt: "Limpar filtros", es: "Limpiar filtros", en: "Clear filters" },
  { pt: "Buscar", es: "Buscar", en: "Search" },
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

const ptReverse = flattenResource(i18nInstance.getResourceBundle("pt", "translation") || {});
const extraMap = new Map(EXTRA_COPY.map((item) => [item.pt, item]));

function translateValue(original: string, language: Lang) {
  if (language === "pt") return original;
  const trimmed = original.trim();
  if (!trimmed) return original;

  const extra = extraMap.get(trimmed);
  let translated = extra?.[language];
  if (!translated) {
    const key = ptReverse.get(trimmed);
    if (key) {
      const value = i18nInstance.t(key, { lng: language, defaultValue: trimmed });
      if (typeof value === "string" && value && value !== key) translated = value;
    }
  }
  if (!translated || translated === trimmed) return original;

  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

function shouldSkip(element: Element | null) {
  if (!element) return true;
  if (element.closest("[data-no-store-translate]")) return true;
  if (element.closest("[contenteditable='true']")) return true;
  const tag = element.tagName;
  return tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "CODE" || tag === "PRE";
}

function translateElement(root: Element, language: Lang) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!shouldSkip(parent)) {
      if (!originalText.has(text)) originalText.set(text, text.nodeValue || "");
      const source = originalText.get(text) || "";
      const next = translateValue(source, language);
      if (text.nodeValue !== next) text.nodeValue = next;
    }
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
      if (!saved!.has(attribute)) saved!.set(attribute, element.getAttribute(attribute) || "");
      const source = saved!.get(attribute) || "";
      const next = translateValue(source, language);
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
    run();

    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(run);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
