import { Router } from "express";
import { AuthRequest, requireAuth, requirePermission } from "./authMiddleware";
import { getOllamaErrorInfo, ollamaChat } from "./ollama";

const router = Router();
router.use(requireAuth);

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

    const analysis = await ollamaChat({
      messages: [
        { role: "system", content: "Você é um auditor financeiro sênior e analista de ERP. Não invente números nem fatos ausentes." },
        { role: "user", content: prompt },
      ],
      model: process.env.OLLAMA_REPORT_MODEL || process.env.OLLAMA_MODEL,
      temperature: 0.15,
      timeoutMs: 58_000,
    });

    res.json({ analysis: analysis || "Não foi possível gerar análise." });
  } catch (error: any) {
    const failure = getOllamaErrorInfo(error);
    if (failure.notConfigured) {
      return res.status(400).json({ code: "AI_NOT_CONFIGURED", error: "Ollama não configurado. Defina OLLAMA_API_KEY ou OLLAMA_BASE_URL." });
    }
    if (failure.rateLimited) {
      const wait = failure.retryAfterSeconds ? ` Aguarde cerca de ${failure.retryAfterSeconds} segundos e tente novamente.` : " Aguarde um momento e tente novamente.";
      return res.status(429).json({ code: "AI_RATE_LIMIT", error: `Limite temporário da IA atingido.${wait}`, retryAfterSeconds: failure.retryAfterSeconds });
    }
    if (failure.unavailable) {
      return res.status(503).json({ code: "AI_UNAVAILABLE", error: "O Ollama está temporariamente indisponível. Tente novamente em alguns instantes." });
    }
    console.error("Ollama report error:", failure.message);
    res.status(500).json({ code: "AI_ERROR", error: "Não foi possível gerar a análise com IA agora. Tente novamente mais tarde." });
  }
});

export default router;
