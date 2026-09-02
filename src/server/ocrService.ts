import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";

// Initialize Gemini client dynamically to avoid throwing load-time errors if API key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

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

export async function processInvoiceOcr(
  fileBuffer: Buffer,
  mimeType: string,
  language: string = "pt"
): Promise<OcrResult> {
  // Validate API configuration
  try {
    getAiClient();
  } catch (error: any) {
    if (error.message === "GEMINI_API_KEY_MISSING") {
      throw new Error("OCR não configurado. Configure a chave em Configurações > Sistema ou no .env.");
    }
    throw error;
  }

  const base64Data = fileBuffer.toString("base64");
  const outputLanguage = language?.toLowerCase().startsWith("es") ? "Spanish (Paraguay)" : "Brazilian Portuguese";

  const prompt = `
    Analyze the uploaded document which is a commercial invoice or purchase receipt.
    Extract the following details:
    1. Supplier Corporate Name or Trade Name.
    2. Supplier Tax ID / Document Number (like CNPJ, CPF, RUC, RUT, NIT, etc.).
    3. Invoice Number.
    4. Invoice Date in standard YYYY-MM-DD format (if only partial date is shown, estimate or complete it relative to year 2026 if context suggests).
    5. Invoice Total numeric amount.
    6. Main tabular products/items, including:
       - SKU/Code (Part Number, reference, etc.)
       - UPC/EAN/GTIN barcode number if printed
       - Product description/name (completely and cleanly capitalized)
       - Quantity purchased
       - Unit cost price
       - Total cost price for that line item (Quantity * Unit Cost)
       - Your confidence level (between 0.0 and 1.0) for this item extraction
       - Raw description line text from the document for auditing

    Language setting requested: ${language}.
    All warnings, notices, observations and any explanatory text in the JSON must be written only in ${outputLanguage}. Do not write warnings or notes in English.
    Product names may remain as printed on the document, but warnings must respect the requested language.
    Verify that the item totals sum up correctly and flag any warnings if math differences arise.
    If quantities for weighted products must be rounded to integers because of the schema, explain that warning in ${outputLanguage}.
    Provide the detailed output parsed into the strictly matched JSON schema object.
  `;

  try {
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplier: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Supplier corporate name or trade name found on the invoice" },
                document: { type: Type.STRING, description: "Supplier document or tax number (RUC/CNPJ/CPF/RUT/etc)" }
              },
              required: ["name"]
            },
            invoice: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.STRING, description: "Invoice number or document identifier" },
                date: { type: Type.STRING, description: "Invoice date in YYYY-MM-DD format" },
                total: { type: Type.NUMBER, description: "Total amount on the invoice" }
              },
              required: ["number"]
            },
            items: {
              type: Type.ARRAY,
              description: "List of products or items listed in the invoice table",
              items: {
                type: Type.OBJECT,
                properties: {
                  sku: { type: Type.STRING, description: "Part Number, SKU, reference code or code internal to the supplier" },
                  upc: { type: Type.STRING, description: "UPC, EAN, GTIN barcode number if present" },
                  name: { type: Type.STRING, description: "Description or name of the item" },
                  quantity: { type: Type.INTEGER, description: "Quantity purchased" },
                  unitCost: { type: Type.NUMBER, description: "Unit price or unit cost of the item" },
                  totalCost: { type: Type.NUMBER, description: "Total price/total cost of this item line" },
                  confidence: { type: Type.NUMBER, description: "A confidence score between 0.0 and 1.0 for this item extraction" },
                  rawText: { type: Type.STRING, description: "Original raw text/description line of the item from the invoice" }
                },
                required: ["name", "quantity", "unitCost"]
              }
            },
            rawText: { type: Type.STRING, description: "The full detected text content of the invoice for verification" },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Any warnings or notices (e.g. calculation mismatch, blurry parts)"
            }
          },
          required: ["supplier", "invoice", "items"]
        },
      },
    });

    if (!response.text) {
      throw new Error("Não foi possível obter texto estruturado do modelo Gemini.");
    }

    const result = JSON.parse(response.text.trim()) as OcrResult;
    return result;
  } catch (error: any) {
    console.error("Gemini OCR extraction failed:", error);
    throw new Error(error.message || "Erro no processamento OCR com Gemini API.");
  }
}
