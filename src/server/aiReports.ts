import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";

const router = Router();
router.use(requireAuth);

function getAiFailure(error: any) {
  const message = String(error?.message || error || "");
  const status = Number(error?.status || error?.code || 0);
  const rateLimited = status === 429 || /RESOURCE_EXHAUSTED|quota exceeded|rate.?limit|too many requests/i.test(message);
  const unavailable = status === 503 || /UNAVAILABLE|temporarily unavailable|service unavailable/i.test(message);
  const retryMatch = message.match(/retry(?:\s+in|Delay[^0-9]*)\s*([0-9]+(?:\.[0-9]+)?)s/i);
  return { message, status, rateLimited, unavailable, retryAfterSeconds: retryMatch ? Math.ceil(Number(retryMatch[1])) : null };
}

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY_MISSING");
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const cleanData = (data: any) => {
  const json = JSON.stringify(data ?? {}, (_key, value) => {
    if (typeof value === "string" && value.length > 400) return `${value.slice(0, 400)}...`;
    return value;
  });
  return json.length > 45000 ? `${json.slice(0, 45000)}...` : json;
};

router.post("/analysis", requirePermission("reports", "profit"), async (req: AuthRequest, res) => {
  try {
    const { reportType, language = "pt-BR", filters = {}, data = {} } = req.body || {};
    const outputLanguage = String(language).toLowerCase().startsWith("es") ? "Spanish (Paraguay)" : "Brazilian Portuguese";
    const prompt = `
You are a senior financial auditor and retail ERP analyst for a Paraguay store.
Generate a practical management report in ${outputLanguage}.

Report type: ${reportType || "financial"}
Filters used: ${JSON.stringify(filters)}
Data extracted from the ERP: ${cleanData(data)}

Required structure:
1. Resumo executivo.
2. DRE gerencial simplificada when the data has revenue/cost/expenses/profit.
3. Main risks, inconsistencies, alerts and unusual points.
4. Product analysis when product-level data exists: best products, low margin products, negative margin, inventory/cash issues.
5. Operational recommendations for the owner/manager.
6. Checklist of what to verify next in the system.

Rules:
- Do not invent values not present in the data.
- If a metric is missing, say it is unavailable.
- Use short sections, clear bullets and currency formatting.
- Keep it concise but useful for decision-making.
`;

    const response = await getAiClient().models.generateContent({
      model: process.env.GEMINI_REPORT_MODEL || "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text || "Não foi possível gerar análise." });
  } catch (error: any) {
    if (error.message === "GEMINI_API_KEY_MISSING") {
      return res.status(400).json({ error: "Recurso de IA não configurado. Solicite a configuração ao administrador do sistema." });
    }
    const failure = getAiFailure(error);
    if (failure.rateLimited) {
      const wait = failure.retryAfterSeconds ? ` Aguarde cerca de ${failure.retryAfterSeconds} segundos e tente novamente.` : " Aguarde um momento e tente novamente.";
      return res.status(429).json({ code: "AI_RATE_LIMIT", error: `Limite temporário da IA atingido.${wait}`, retryAfterSeconds: failure.retryAfterSeconds });
    }
    if (failure.unavailable) {
      return res.status(503).json({ code: "AI_UNAVAILABLE", error: "A IA está temporariamente indisponível. Tente novamente em alguns instantes." });
    }
    console.error("AI report error:", failure.message);
    res.status(500).json({ code: "AI_ERROR", error: "Não foi possível gerar a análise com IA agora. Tente novamente mais tarde." });
  }
});

export default router;
