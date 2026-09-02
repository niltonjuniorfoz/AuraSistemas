// src/pages/store/editor/elementCatalog.ts
// Catálogo de elementos editáveis do editor visual — FONTE ÚNICA (spec
// docs/superpowers/specs/2026-08-20-editor-visual-avancado-design.md,
// "Arquitetura → Catálogo de elementos"). Módulo puro, sem nenhum import de
// React: na Fase 3 o servidor do lápis IA importa ESTE MESMO arquivo pra
// montar o prompt e validar o patch — não adicionar dependência de UI aqui.

export type Capacidade = "editar" | "apagar" | "mover" | "duplicar" | "redimensionar" | "abrirPagina" | "editarNoErp";
export type Tamanho = "P" | "M" | "G" | "GG";
export type CampoPermitido = { path: string; tipo: "texto" | "cor" | "enum" | "lista"; max?: number };
export type ElementoCatalogo = {
  id: string;                       // "hero-title", "vitrine-<id>", "secao-banners"...
  descricao: string;                // pra UI e (Fase 3) pro prompt da IA
  pagina: "home" | "catalogo" | "produto";
  campos: CampoPermitido[];
  capacidades: Capacidade[];
  tamanhos?: Tamanho[];
};

export const TAMANHOS: Tamanho[] = ["P", "M", "G", "GG"];

// ---- Seções por página: padrões que replicam o layout de HOJE ----
export type SecaoPagina = { id: string; ordem: number; visivel: boolean; tamanho?: Tamanho };

export const DEFAULT_HOME_SECTIONS: SecaoPagina[] = [
  { id: "announcement", ordem: 0, visivel: true },
  { id: "banners", ordem: 1, visivel: true, tamanho: "M" },
  { id: "howToBuy", ordem: 2, visivel: true },
  { id: "categories", ordem: 3, visivel: true },
  { id: "vitrines", ordem: 4, visivel: true },
  { id: "marcas", ordem: 5, visivel: true },
  { id: "hero", ordem: 6, visivel: false },
  { id: "sideBanner", ordem: 7, visivel: false, tamanho: "M" },
];

export const DEFAULT_CATALOGO_SECTIONS: SecaoPagina[] = [
  { id: "filtros", ordem: 0, visivel: true },
  { id: "grade", ordem: 1, visivel: true },
];

export const SECTION_LABELS: Record<string, string> = {
  announcement: "Aviso do topo",
  banners: "Banners do topo",
  howToBuy: "Como comprar",
  categories: "Categorias",
  marcas: "Marcas",
  vitrines: "Vitrines",
  hero: "Bloco de marca (hero)",
  sideBanner: "Destaque com banner lateral",
  filtros: "Faixa de filtros",
  grade: "Grade de produtos",
};

function effectiveSections(defaults: SecaoPagina[], fromCfg: any): SecaoPagina[] {
  const list = Array.isArray(fromCfg) ? fromCfg : [];
  const byId = new Map(list.map((s: any) => [String(s?.id), s]));
  // Parte SEMPRE dos defaults (nunca da config): seção nova adicionada numa
  // versão futura do app não pode sumir só porque a config foi salva antes
  // dela existir. A config só sobrepõe ordem/visivel/tamanho do que conhece.
  return defaults
    .map((d) => ({ ...d, ...(byId.get(d.id) || {}) }))
    // Empates de `ordem` são possíveis em config salva; a garantia de que
    // empate mantém a ordem dos defaults depende do sort estável do
    // Array.prototype.sort (ES2019+) — é isso que torna a ordem de
    // renderização determinística.
    .sort((a, b) => a.ordem - b.ordem);
}

export function effectiveHomeSections(cfg: any): SecaoPagina[] {
  return effectiveSections(DEFAULT_HOME_SECTIONS, cfg?.pages?.home?.sections);
}
export function effectiveCatalogoSections(cfg: any): SecaoPagina[] {
  return effectiveSections(DEFAULT_CATALOGO_SECTIONS, cfg?.pages?.catalogo?.sections);
}

// ---- Elementos estáticos ----
// Nota sobre "apagar" em seção vs item de lista: pra SEÇÃO, apagar = ocultar
// (visivel:false, sempre reversível pelo painel Seções — spec, Escopo item 7);
// o InlineToolbar renderiza 👁️ sem confirmação. Pra ITEM DE LISTA
// (vitrine/banner), apagar = remover do rascunho (Descartar recupera até
// publicar); o InlineToolbar renderiza 🗑️ com confirmação inline. A distinção
// é feita por qual callback o call site fornece (onHide vs onDelete).
const ESTATICOS: ElementoCatalogo[] = [
  // --- Home: elementos de texto/grupo ---
  { id: "hero-title", descricao: "Título grande do bloco de marca da home", pagina: "home", campos: [{ path: "heroTitle", tipo: "texto", max: 120 }], capacidades: ["editar"] },
  { id: "hero-subtitle", descricao: "Subtítulo do bloco de marca da home", pagina: "home", campos: [{ path: "heroSubtitle", tipo: "texto", max: 300 }], capacidades: ["editar"] },
  { id: "hero-ctas", descricao: "Botões de ação do bloco de marca (Ver produtos / WhatsApp) — trocar ordem e tamanho", pagina: "home", campos: [{ path: "heroCtaSize", tipo: "enum" }, { path: "heroCtaOrder", tipo: "enum" }], capacidades: ["mover", "redimensionar"], tamanhos: ["P", "M", "G", "GG"] },
  { id: "announcement", descricao: "Texto da faixa de aviso no topo da loja", pagina: "home", campos: [{ path: "announcement", tipo: "texto", max: 200 }], capacidades: ["editar"] },
  { id: "sideBanner", descricao: "Texto do banner lateral escuro (Selecionado pra você)", pagina: "home", campos: [{ path: "sideBannerTitle", tipo: "texto", max: 120 }, { path: "sideBannerSubtitle", tipo: "texto", max: 300 }], capacidades: ["editar"] },
  { id: "footer", descricao: "Texto de direitos autorais do rodapé", pagina: "home", campos: [{ path: "footerText", tipo: "texto", max: 200 }], capacidades: ["editar"] },
  // --- Home: seções (ordem/visibilidade em pages.home.sections) ---
  // secao-announcement sem "mover": renderiza no ShopLayout, acima do header,
  // fora do fluxo de seções da StoreHome (desvio nº 3 do plano).
  { id: "secao-announcement", descricao: "Seção: faixa de aviso do topo", pagina: "home", campos: [{ path: "announcement", tipo: "texto", max: 200 }], capacidades: ["editar", "apagar"] },
  { id: "secao-banners", descricao: "Seção: carrossel de banners do topo da home", pagina: "home", campos: [{ path: "banners", tipo: "lista" }], capacidades: ["editar", "mover", "apagar", "redimensionar"], tamanhos: ["P", "M", "G", "GG"] },
  { id: "secao-howToBuy", descricao: "Seção: faixa Como comprar (5 passos)", pagina: "home", campos: [{ path: "howToBuySteps", tipo: "lista" }], capacidades: ["editar", "mover", "apagar"] },
  { id: "secao-categories", descricao: "Seção: grade de categorias da home", pagina: "home", campos: [], capacidades: ["editar", "mover", "apagar"] },
  { id: "secao-vitrines", descricao: "Seção: vitrines de produtos da home", pagina: "home", campos: [{ path: "vitrines", tipo: "lista" }], capacidades: ["editar", "mover", "apagar"] },
  { id: "secao-hero", descricao: "Seção: bloco de marca (hero central) da home", pagina: "home", campos: [], capacidades: ["mover", "apagar"] },
  { id: "secao-sideBanner", descricao: "Seção: destaque com banner lateral + produtos", pagina: "home", campos: [{ path: "sideBannerTitle", tipo: "texto", max: 120 }, { path: "sideBannerSubtitle", tipo: "texto", max: 300 }], capacidades: ["editar", "mover", "apagar", "redimensionar"], tamanhos: ["P", "M", "G", "GG"] },
  // --- Catálogo ---
  { id: "catalogo-titulo", descricao: "Título da página de catálogo", pagina: "catalogo", campos: [{ path: "pages.catalogo.titulo", tipo: "texto", max: 80 }], capacidades: ["editar"] },
  { id: "secao-filtros", descricao: "Seção: faixa de filtros (categorias + ordenação) do catálogo", pagina: "catalogo", campos: [], capacidades: ["mover", "apagar"] },
  { id: "secao-grade", descricao: "Seção: grade de produtos do catálogo", pagina: "catalogo", campos: [], capacidades: ["mover", "apagar"] },
  // --- Cards de produto (vitrines/grades): ⤷ abre a página no editor.
  // "editarNoErp" declarado desde já (🔗 é Fase 2 — nenhum botão renderiza
  // sem callback fornecido, então declarar não muda nada agora). ---
  { id: "produto-card", descricao: "Card de produto (vitrines e grades)", pagina: "home", campos: [], capacidades: ["abrirPagina", "editarNoErp"] },
];

// ---- Elementos dinâmicos (gerados a partir do rascunho atual) ----
export function vitrineElements(cfg: any): ElementoCatalogo[] {
  const vitrines = Array.isArray(cfg?.vitrines) ? cfg.vitrines : [];
  return vitrines.map((v: any, i: number) => ({
    id: `vitrine-${String(v?.id || i)}`,
    descricao: `Vitrine de produtos "${String(v?.title || `#${i + 1}`)}" da home`,
    pagina: "home" as const,
    campos: [{ path: "vitrines", tipo: "lista" as const }],
    capacidades: ["editar", "apagar", "mover", "duplicar"] as Capacidade[],
  }));
}

export function bannerElements(cfg: any): ElementoCatalogo[] {
  const banners = Array.isArray(cfg?.banners) ? cfg.banners : [];
  return banners.map((_b: any, i: number) => ({
    id: `banner-${i}`,
    descricao: `Banner ${i + 1} do carrossel do topo`,
    pagina: "home" as const,
    campos: [{ path: "banners", tipo: "lista" as const }],
    capacidades: ["editar", "apagar"] as Capacidade[],
  }));
}

export function getElemento(id: string, cfg: any): ElementoCatalogo | null {
  const estatico = ESTATICOS.find((e) => e.id === id);
  if (estatico) return estatico;
  return (
    vitrineElements(cfg).find((e) => e.id === id) ||
    bannerElements(cfg).find((e) => e.id === id) ||
    null
  );
}
