const MAX_DIM = 1024;
const TARGET_CHARS = 190000;

export const BANNER_COMPRESS_OPTS = { maxDim: 2560, targetChars: 1200000 };
export const LOGO_COMPRESS_OPTS = { maxDim: 2400, targetChars: 1200000 };

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
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const highQuality = maxDim > MAX_DIM || targetChars > TARGET_CHARS;
  const qualities = highQuality ? [0.94, 0.9, 0.86, 0.8, 0.74] : [0.82, 0.7, 0.58, 0.45];
  const mime = highQuality ? "image/webp" : "image/jpeg";

  for (let dim = 1; dim <= 3; dim++) {
    for (const q of qualities) {
      const out = canvas.toDataURL(mime, q);
      if (out.length <= targetChars) return out;
    }
    const nw = Math.max(1, Math.round(canvas.width * 0.78));
    const nh = Math.max(1, Math.round(canvas.height * 0.78));
    const c2 = document.createElement("canvas");
    c2.width = nw; c2.height = nh;
    const cx2 = c2.getContext("2d")!;
    cx2.fillStyle = "#ffffff";
    cx2.fillRect(0, 0, nw, nh);
    cx2.imageSmoothingEnabled = true;
    cx2.imageSmoothingQuality = "high";
    cx2.drawImage(canvas, 0, 0, nw, nh);
    canvas.width = nw; canvas.height = nh;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, nw, nh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(c2, 0, 0);
  }
  throw new Error("Não consegui comprimir a imagem o suficiente. Tente uma foto menor.");
}

export async function compressTransparentImage(file: File, opts?: { maxDim?: number; targetChars?: number }): Promise<string> {
  const maxDim = opts?.maxDim ?? LOGO_COMPRESS_OPTS.maxDim;
  const targetChars = opts?.targetChars ?? LOGO_COMPRESS_OPTS.targetChars;
  if (!file.type.startsWith("image/")) throw new Error("Arquivo não é imagem.");
  const dataUrl = await readFile(file);

  if (file.type === "image/svg+xml") return dataUrl;

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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const q of [0.96, 0.92, 0.88, 0.82, 0.74]) {
      const out = canvas.toDataURL("image/webp", q);
      if (out.length <= targetChars) return out;
    }
    w *= 0.82; h *= 0.82;
  }
  throw new Error("A logo ficou muito grande. Tente um arquivo menor ou use SVG.");
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
