// Leitura + aplicação de fontes customizadas da loja (upload de arquivo .ttf/
// .otf/.woff/.woff2 -> data: URL -> @font-face injetado + CSS custom property
// --store-font-heading/--store-font-body). Mesmo espírito de storeTheme.ts:
// funções puras, sem React, reaproveitadas pelo FontsPanel (editor) e pelo
// ShopLayout (aplicação real).

// ~290KB raw. O servidor rejeita a data: URL inteira (prefixo + base64) acima
// de MAX_FONT_URL_CHARS=400000 chars (src/server/store.ts). Base64 infla em
// 4/3 e o prefixo "data:font/...;base64," soma ~40 chars no pior caso, então
// o teto seguro de bytes crus é (400000-40)/4*3 ≈ 299970 — 290KB fica com
// margem confortável sem deixar passar arquivo que o servidor vai rejeitar.
const MAX_FONT_BYTES = 290_000;

export async function readFontFile(file: File): Promise<string> {
  const allowed = [".ttf", ".otf", ".woff", ".woff2"];
  const name = file.name.toLowerCase();
  if (!allowed.some((ext) => name.endsWith(ext))) throw new Error("Formato inválido. Use .ttf, .otf, .woff ou .woff2.");
  if (file.size > MAX_FONT_BYTES) throw new Error(`Arquivo muito grande (máx. ${Math.round(MAX_FONT_BYTES / 1024)}KB).`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

let injectedStyleEl: HTMLStyleElement | null = null;

// A família vem do FontsPanel já sanitizada (nome do arquivo sem extensão,
// tudo que não é [a-zA-Z0-9] vira espaço — ver handleFile em FontsPanel.tsx),
// então não pode conter aspas nem qualquer caractere capaz de "escapar" da
// string da regra @font-face abaixo. Mesmo assim, escapamos aspas/backslash
// aqui como defesa em profundidade — não custa nada e blinda esta função
// caso algum dia passe a receber `family` de outro lugar sem essa sanitização.
function escapeCssString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function applyStoreFonts(root: HTMLElement, fonts: { heading?: { url: string; family: string }; body?: { url: string; family: string } }) {
  if (!injectedStyleEl) {
    injectedStyleEl = document.createElement("style");
    document.head.appendChild(injectedStyleEl);
  }
  const rules: string[] = [];
  if (fonts.heading?.url && fonts.heading.family) rules.push(`@font-face { font-family: "${escapeCssString(fonts.heading.family)}"; src: url(${fonts.heading.url}); }`);
  if (fonts.body?.url && fonts.body.family) rules.push(`@font-face { font-family: "${escapeCssString(fonts.body.family)}"; src: url(${fonts.body.url}); }`);
  injectedStyleEl.textContent = rules.join("\n");

  if (fonts.heading?.family) root.style.setProperty("--store-font-heading", `"${fonts.heading.family}"`);
  else root.style.removeProperty("--store-font-heading");
  if (fonts.body?.family) root.style.setProperty("--store-font-body", `"${fonts.body.family}"`);
  else root.style.removeProperty("--store-font-body");
}
