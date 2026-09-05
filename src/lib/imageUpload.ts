// Comprime imagem no navegador antes de subir (base64 no banco — Render tem disco
// efêmero, então arquivo em disco não sobrevive a deploy).
// Alvo padrão: foto de produto, repetida dezenas de vezes por página (grade
// de vitrine) — precisa ficar pequena. Banner de topo é UM elemento hero por
// página, então aceita um perfil bem mais generoso (ver compressImage opts).

const MAX_DIM = 1024;       // maior lado em px — suficiente pra foto de produto
const TARGET_CHARS = 190000; // ~140KB de imagem, bom pra thumbnail repetida

export const BANNER_COMPRESS_OPTS = { maxDim: 1920, targetChars: 500000 }; // ~375KB, 1 por página
export const LOGO_COMPRESS_OPTS = { maxDim: 1600, targetChars: 650000 }; // WebP com alpha, mantém fundo transparente

export async function compressImage(file: File, opts?: { maxDim?: number; targetChars?: number }): Promise<string> {
  const maxDim = opts?.maxDim ?? MAX_DIM;
  const targetChars = opts?.targetChars ?? TARGET_CHARS;
  if (!file.type.startsWith("image/")) throw new Error("Arquivo não é imagem.");
  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);

  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > maxDim) {
    const k = maxDim / Math.max(w, h);
    w = Math.round(w * k); h = Math.round(h * k);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  // Fundo branco: JPEG não tem transparência (PNG transparente viraria preto).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  // Reduz qualidade até caber; se ainda não couber, reduz dimensão e tenta de novo.
  for (let dim = 1; dim <= 3; dim++) {
    for (const q of [0.82, 0.7, 0.58, 0.45]) {
      const out = canvas.toDataURL("image/jpeg", q);
      if (out.length <= targetChars) return out;
    }
    const nw = Math.round(canvas.width * 0.7), nh = Math.round(canvas.height * 0.7);
    const c2 = document.createElement("canvas");
    c2.width = nw; c2.height = nh;
    const cx2 = c2.getContext("2d")!;
    cx2.fillStyle = "#ffffff"; cx2.fillRect(0, 0, nw, nh);
    cx2.drawImage(canvas, 0, 0, nw, nh);
    canvas.width = nw; canvas.height = nh;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, nw, nh);
    ctx.drawImage(c2, 0, 0);
  }
  throw new Error("Não consegui comprimir a imagem o suficiente. Tente uma foto menor.");
}

// Logos precisam manter o canal alpha para funcionar sobre cabeçalhos
// translúcidos. WebP preserva transparência e normalmente fica muito menor que
// PNG; se ainda ficar grande, reduzimos a dimensão sem pintar um fundo atrás.
export async function compressTransparentImage(file: File, opts?: { maxDim?: number; targetChars?: number }): Promise<string> {
  const maxDim = opts?.maxDim ?? LOGO_COMPRESS_OPTS.maxDim;
  const targetChars = opts?.targetChars ?? LOGO_COMPRESS_OPTS.targetChars;
  if (!file.type.startsWith("image/")) throw new Error("Arquivo não é imagem.");
  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);

  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > maxDim) {
    const k = maxDim / Math.max(w, h);
    w = Math.round(w * k); h = Math.round(h * k);
  }

  for (let dim = 0; dim < 4; dim++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const q of [0.9, 0.82, 0.72, 0.62]) {
      const out = canvas.toDataURL("image/webp", q);
      if (out.length <= targetChars) return out;
    }
    w *= 0.78; h *= 0.78;
  }
  throw new Error("A logo ficou muito grande. Tente um arquivo menor ou com menos resolução.");
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
    img.src = src;
  });
}
