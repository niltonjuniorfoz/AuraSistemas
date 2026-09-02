import { extractJsonObject, getOllamaErrorInfo, getOllamaModel, ollamaChat } from "./ollama";

export interface OcrResult {
  supplier: {
    name: string;
    document?: string;
  };
  invoice: {
    number: string;
    date?: string;
    total?: number;
  };
  items: Array<{
    sku?: string;
    upc?: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost?: number;
    confidence: number;
    rawText?: string;
  }>;
  rawText?: string;
  warnings?: string[];
}

const OCR_JSON_SHAPE = `{
  "supplier": {"name":"string","document":"string opcional"},
  "invoice": {"number":"string","date":"YYYY-MM-DD opcional","total":0},
  "items": [{"sku":"opcional","upc":"opcional","name":"string","quantity":1,"unitCost":0,"totalCost":0,"confidence":0.0,"rawText":"opcional"}],
  "rawText":"texto detectado opcional",
  "warnings":["avisos opcionais"]
}`;

function normalizeOcrResult(value: any): OcrResult {
  const supplier = value?.supplier && typeof value.supplier === "object" ? value.supplier : {};
  const invoice = value?.invoice && typeof value.invoice === "object" ? value.invoice : {};
  const items = Array.isArray(value?.items) ? value.items : [];

  return {
    supplier: {
      name: String(supplier.name || "Não informado"),
      ...(supplier.document ? { document: String(supplier.document) } : {}),
    },
    invoice: {
      number: String(invoice.number || "Não informado"),
      ...(invoice.date ? { date: String(invoice.date) } : {}),
      ...(Number.isFinite(Number(invoice.total)) ? { total: Number(invoice.total) } : {}),
    },
    items: items
      .filter((item: any) => item && typeof item === "object")
      .slice(0, 250)
      .map((item: any) => ({
        ...(item.sku ? { sku: String(item.sku) } : {}),
        ...(item.upc ? { upc: String(item.upc) } : {}),
        name: String(item.name || "Item não identificado"),
        quantity: Math.max(0, Math.round(Number(item.quantity) || 0)),
        unitCost: Number(item.unitCost) || 0,
        ...(Number.isFinite(Number(item.totalCost)) ? { totalCost: Number(item.totalCost) } : {}),
        confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
        ...(item.rawText ? { rawText: String(item.rawText) } : {}),
      })),
    ...(value?.rawText ? { rawText: String(value.rawText) } : {}),
    ...(Array.isArray(value?.warnings) ? { warnings: value.warnings.map(String).slice(0, 30) } : {}),
  };
}

async function processImageWithOllama(fileBuffer: Buffer, language: string) {
  const outputLanguage = language?.toLowerCase().startsWith("es") ? "Spanish (Paraguay)" : "Brazilian Portuguese";
  const base64Data = fileBuffer.toString("base64");
  const prompt = `Analise esta imagem de nota fiscal, fatura comercial ou recibo de compra.
Extraia fornecedor, documento fiscal, número/data/total da nota e todos os itens visíveis com SKU/código, UPC/EAN/GTIN, descrição, quantidade, custo unitário, total da linha, confiança de 0 a 1 e texto bruto quando útil.
Não invente valores que não estejam legíveis. Se algo estiver incerto, registre um aviso.
Todos os avisos e observações devem estar em ${outputLanguage}.
Retorne APENAS JSON válido neste formato: ${OCR_JSON_SHAPE}`;

  const text = await ollamaChat({
    model: getOllamaModel("vision"),
    messages: [{ role: "user", content: prompt, images: [base64Data] }],
    temperature: 0,
    json: true,
    timeoutMs: 58_000,
  });
  return normalizeOcrResult(extractJsonObject(text));
}

// Ollama recebe imagens para visão. PDF bruto não é enviado para outro
// provedor: o sistema agora usa Ollama exclusivamente. Para PDF, o usuário
// deve exportar/rasterizar a página como JPG/PNG/WEBP antes do OCR.
async function processPdfWithOllama(): Promise<OcrResult> {
  throw new Error("OCR_PDF_NEEDS_IMAGE");
}

export async function processInvoiceOcr(
  fileBuffer: Buffer,
  mimeType: string,
  language: string = "pt",
): Promise<OcrResult> {
  try {
    if (mimeType === "application/pdf") {
      return await processPdfWithOllama();
    }
    if (!mimeType.startsWith("image/")) {
      throw new Error("OCR_UNSUPPORTED_TYPE");
    }
    return await processImageWithOllama(fileBuffer, language);
  } catch (error: any) {
    if (error?.message === "OCR_PDF_NEEDS_IMAGE") {
      throw new Error("PDF ainda precisa ser convertido para imagem antes do OCR com Ollama. Envie JPG, PNG ou WEBP.");
    }
    if (error?.message === "OCR_UNSUPPORTED_TYPE") {
      throw new Error("Formato não suportado para OCR.");
    }
    const info = getOllamaErrorInfo(error);
    if (info.notConfigured) {
      throw new Error("OCR com Ollama não configurado. Defina OLLAMA_API_KEY ou OLLAMA_BASE_URL.");
    }
    console.error("OCR extraction failed:", info.message || error?.message || error);
    throw new Error(error?.message || "Erro no processamento OCR.");
  }
}
