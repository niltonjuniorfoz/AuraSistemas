// Helpers puros do tema visual da loja (cores) — sem React, reaproveitados
// tanto pelo ColorsPanel (editor) quanto pelo ShopLayout (aplicação real via
// CSS custom properties). Mantidos em módulo separado pra poderem ser
// testados/usados fora de componentes.

function relativeLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Contraste WCAG entre duas cores hex (#rrggbb). Entradas inválidas retornam
// 21 (contraste máximo possível) pra nunca disparar um aviso falso enquanto
// o usuário ainda está digitando/limpando um campo de cor.
export function contrastRatio(hexA: string, hexB: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexA) || !/^#[0-9a-fA-F]{6}$/.test(hexB)) return 21;
  const l1 = relativeLuminance(hexA), l2 = relativeLuminance(hexB);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

// Mesmas 10 chaves de src/server/store.ts normalizeStoreThemeColors() —
// qualquer chave nova precisa ser adicionada nos dois lugares.
export const STORE_COLOR_TOKENS: { key: string; label: string; cssVar: string }[] = [
  { key: "bg", label: "Fundo da página", cssVar: "--store-bg" },
  { key: "surface", label: "Fundo de cards/produtos", cssVar: "--store-surface" },
  { key: "headerBg", label: "Fundo do cabeçalho", cssVar: "--store-header-bg" },
  { key: "headerText", label: "Texto do cabeçalho", cssVar: "--store-header-text" },
  { key: "accent", label: "Destaque (botões, preços)", cssVar: "--store-accent" },
  { key: "accentText", label: "Texto em cima do destaque", cssVar: "--store-accent-text" },
  { key: "text", label: "Texto principal", cssVar: "--store-text" },
  { key: "textMuted", label: "Texto secundário", cssVar: "--store-text-muted" },
  { key: "footerBg", label: "Fundo do rodapé", cssVar: "--store-footer-bg" },
  { key: "footerText", label: "Texto do rodapé", cssVar: "--store-footer-text" },
];

// Aplica (ou remove, se vazio) cada token como CSS custom property no elemento
// raiz da loja. Removida (não setada como string vazia) quando não configurada,
// pra deixar o fallback do CSS (var(--store-bg, #fafaf9) etc.) valer.
export function applyStoreColors(root: HTMLElement, colors: Record<string, string>) {
  for (const { key, cssVar } of STORE_COLOR_TOKENS) {
    const value = colors?.[key];
    if (value) root.style.setProperty(cssVar, value);
    else root.style.removeProperty(cssVar);
  }
}
