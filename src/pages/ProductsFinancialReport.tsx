import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Search,
  AlertCircle,
  FileText,
  Bot,
} from "lucide-react";
import { useNavigate } from "react-router";
import { apiFetch, loadList, extractList } from "../lib/api";
import { formatCurrency, useAdminTranslation } from "../lib/i18n";
import { useAuthStore } from "../stores/authStore";
import { AiReportModal } from "../components/AiReportModal";
import { Money } from "../components/Money";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export function ProductsFinancialReport() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { t, language } = useAdminTranslation();

  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [errorConfig, setErrorConfig] = useState("");
  const [errorData, setErrorData] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [aiError, setAiError] = useState("");

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const [groupId, setGroupId] = useState("");
  const [subgroupId, setSubgroupId] = useState("");
  const [shelfId, setShelfId] = useState("");
  const [q, setQ] = useState("");

  const [onlySold, setOnlySold] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyNegativeProfit, setOnlyNegativeProfit] = useState(false);

  const [data, setData] = useState<any>(null);
  const [lastReportQuery, setLastReportQuery] = useState("");

  // Helpers for filters
  const [groups, setGroups] = useState<any[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);

  useEffect(() => {
    if ((user?.roleKey === "admin" || user?.roleKey === "master") || user?.roleKey === "management") {
      fetchOptions();
      fetchData();
    }
  }, [user]);

  if (user?.roleKey !== "admin" && user?.roleKey !== "master" && user?.roleKey !== "management") {
    const generateAiReport = async () => {
    if (!data) return;
    setAiModalOpen(true);
    setAiLoading(true);
    setAiError("");
    setAiReport("");
    try {
      const rows = extractList(data?.data).slice(0, 120);
      const res = await apiFetch("/api/ai-reports/analysis", {
        method: "POST",
        body: JSON.stringify({
          reportType: "relatorio_financeiro_produtos",
          language,
          filters: { dateFrom, dateTo, groupId, subgroupId, shelfId, q, onlySold, onlyInStock, onlyNegativeProfit },
          data: { summary: data.summary, products: rows },
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Erro ao gerar relatório com IA.");
      setAiReport(payload.analysis || "");
    } catch (err: any) {
      setAiError(err.message || "Erro ao gerar relatório com IA.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
      <div className="p-8 text-center text-red-500 font-medium">
        Você não tem permissão para visualizar este relatório.
      </div>
    );
  }

  const fetchOptions = async () => {
    try {
      setErrorConfig("");
      const [gr, sh] = await Promise.all([
        loadList("/api/groups"),
        loadList("/api/shelves"),
      ]);
      setGroups(gr);
      setShelves(sh);
    } catch (e: any) {
      setErrorConfig("Erro ao carregar filtros do relatório.");
    }
  };

  const buildReportQuery = () => {
    const qs = new URLSearchParams();
    if (dateFrom) qs.append("dateFrom", dateFrom);
    if (dateTo) qs.append("dateTo", dateTo);
    if (groupId) qs.append("groupId", groupId);
    if (subgroupId) qs.append("subgroupId", subgroupId);
    if (shelfId) qs.append("shelfId", shelfId);
    if (q) qs.append("q", q);
    if (onlySold) qs.append("onlySold", "true");
    if (onlyInStock) qs.append("onlyInStock", "true");
    if (onlyNegativeProfit) qs.append("onlyNegativeProfit", "true");
    return qs;
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorData("");
    try {
      const qs = buildReportQuery();
      const res = await apiFetch(
        `/api/reports/products-financial?${qs.toString()}`,
      );
      if (res.ok) {
        setData(await res.json());
        setLastReportQuery(qs.toString());
      } else {
        setErrorData("Erro ao carregar relatório financeiro de produtos.");
      }
    } catch (err) {
      console.error(err);
      setErrorData("Erro ao carregar relatório financeiro de produtos.");
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    setErrorData("");
    try {
      const queryString = lastReportQuery || buildReportQuery().toString();
      const res = await apiFetch(
        `/api/reports/products-financial/pdf?${queryString}`,
      );
      if (!res.ok) {
        setErrorData("Erro ao gerar PDF do relatório financeiro de produtos.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_financeiro_produtos_${dateFrom || "inicio"}_${dateTo || "fim"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorData("Erro ao gerar PDF do relatório financeiro de produtos.");
    } finally {
      setPdfLoading(false);
    }
  };

  const generateAiReport = async () => {
    if (!data) return;
    setAiModalOpen(true);
    setAiLoading(true);
    setAiError("");
    setAiReport("");
    try {
      const rows = extractList(data?.data).slice(0, 120);
      const res = await apiFetch("/api/ai-reports/analysis", {
        method: "POST",
        body: JSON.stringify({
          reportType: "relatorio_financeiro_produtos",
          language,
          filters: { dateFrom, dateTo, groupId, subgroupId, shelfId, q, onlySold, onlyInStock, onlyNegativeProfit },
          data: { summary: data.summary, products: rows },
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Erro ao gerar relatório com IA.");
      setAiReport(payload.analysis || "");
    } catch (err: any) {
      setAiError(err.message || "Erro ao gerar relatório com IA.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="products-financial-page space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/reports")}
            className="rounded-full bg-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="text-2xl font-semibold text-white">
            Relatório Financeiro de Produtos
          </h2>
        </div>
      </div>

      {errorConfig && (
        <Card className="flex-row items-center gap-2 rounded-xl border-red-500/20 bg-red-500/10 p-4 text-red-500 shadow-none">
          <AlertCircle className="w-5 h-5" />
          <span>{errorConfig}</span>
        </Card>
      )}

      {errorData && (
        <Card className="flex-row items-center gap-2 rounded-xl border-red-500/20 bg-red-500/10 p-4 text-red-500 shadow-none">
          <AlertCircle className="w-5 h-5" />
          <span>{errorData}</span>
        </Card>
      )}

      <Card className="products-financial-filters gap-4 rounded-xl border-gray-800 bg-[#171717] p-4 shrink-0 shadow-none">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">
              Data Final
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">
              Grupo
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold"
            >
              <option value="">Todos</option>
              {extractList(groups).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">
              Subgrupo
            </label>
            <select
              disabled={!groupId}
              value={subgroupId}
              onChange={(e) => setSubgroupId(e.target.value)}
              className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold disabled:opacity-50"
            >
              <option value="">Todos</option>
              {extractList(
                extractList(groups).find((g) => g.id === groupId)?.subgroups,
              ).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">
              Prateleira
            </label>
            <select
              value={shelfId}
              onChange={(e) => setShelfId(e.target.value)}
              className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold"
            >
              <option value="">Todas</option>
              {extractList(shelves).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">
              SKU ou Nome
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busca..."
              className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-800">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="checkbox"
              checked={onlySold}
              onChange={(e) => setOnlySold(e.target.checked)}
              className="rounded bg-[#171717] border-gray-700 text-brand-gold focus:ring-brand-gold"
            />
            Apenas produtos vendidos
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="rounded bg-[#171717] border-gray-700 text-brand-gold focus:ring-brand-gold"
            />
            Apenas c/ estoque disponível
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="checkbox"
              checked={onlyNegativeProfit}
              onChange={(e) => setOnlyNegativeProfit(e.target.checked)}
              className="rounded bg-[#171717] border-gray-700 text-red-500 focus:ring-red-500"
            />
            Apenas lucro negativo
          </label>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={generatePdf}
              disabled={!data || pdfLoading}
              className="gap-2 rounded border-gray-700 bg-[#171717] px-5 py-2 has-[>svg]:px-5 text-base font-bold text-gray-200 shadow-none hover:border-brand-gold hover:bg-[#171717] hover:text-brand-gold dark:bg-[#171717] dark:border-gray-700 dark:hover:bg-[#171717]"
            >
              {pdfLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <FileText className="size-5" />
              )}{" "}
              Gerar PDF
            </Button>
            <Button
              onClick={fetchData}
              className="gap-2 rounded bg-brand-gold px-6 py-2 has-[>svg]:px-6 text-base font-bold text-brand-navydark hover:bg-brand-goldhover"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Search className="size-5" />
              )}{" "}
              Filtros
            </Button>
          </div>
        </div>
      </Card>

      {!loading && data && (
        <>
          <Card className="products-financial-summary gap-0 rounded-2xl border-gray-800 bg-[#171717] p-4 shrink-0 shadow-none">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
                <div className="text-xs text-gray-400 mb-1">Média Margem</div>
                <div className="text-xl font-bold text-white">
                  {data.summary.averageMarginPercent.toFixed(1)}%
                </div>
              </Card>
              <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
                <div className="text-xs text-gray-400 mb-1">
                  Produtos Listados
                </div>
                <div className="text-xl font-bold text-white">
                  {data.summary.totalProducts}
                </div>
              </Card>
              <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
                <div className="text-xs text-gray-400 mb-1">
                  Total Qtd Vendida
                </div>
                <div className="text-xl font-bold text-white">
                  {data.summary.totalSoldQuantity}
                </div>
              </Card>
              <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
                <div className="text-xs text-gray-400 mb-1">
                  Total Faturamento
                </div>
                <div className="text-xl font-bold text-green-400">
                  <Money value={data.summary.totalRevenue} lang="pt-BR" />
                </div>
              </Card>
              <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
                <div className="text-xs text-gray-400 mb-1">
                  Total Custo Venda
                </div>
                <div className="text-xl font-bold text-red-400">
                  <Money value={data.summary.totalCost} lang="pt-BR" />
                </div>
              </Card>
              <Card className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-none">
                <div className="text-xs text-gray-400 mb-1">
                  Total Lucro Bruto
                </div>
                <div
                  className={`text-xl font-bold ${data.summary.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  <Money value={data.summary.totalProfit} lang="pt-BR" />
                </div>
              </Card>
            </div>
          </Card>

          <Card className="products-financial-table-card gap-0 overflow-hidden rounded-xl border-gray-800 bg-brand-navylight py-0 shadow-none">
            <CardContent className="p-0">
            <div className="products-financial-table-scroll overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-[10px] uppercase tracking-wider bg-[#171717] text-gray-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      SKU
                    </th>
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Grupo / Subgrupo
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Qtd Vend.
                    </th>
                    <th className="px-4 py-3 font-medium text-right whitespace-nowrap">
                      Fat. Líquido
                    </th>
                    <th className="px-4 py-3 font-medium text-right whitespace-nowrap">
                      Custo Vendas
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Lucro Bruto
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Margem %
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Estq. Atual
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Custo Unid.
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Preço Varejo
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Preço Atacado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {extractList(data?.data).length > 0 ? (
                    extractList(data?.data).map((p: any) => (
                      <tr
                        key={p.productId}
                        className="hover:bg-brand-navydark/50 transition"
                      >
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 truncate max-w-[200px]">
                          {p.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                          {p.group}
                          <br />
                          {p.subgroup}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {p.soldQuantity}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold">
                          <Money value={p.revenue} lang="pt-BR" />
                        </td>
                        <td className="px-4 py-3 text-right text-red-300">
                          <Money value={p.cost} lang="pt-BR" />
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold ${p.profit >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          <Money value={p.profit} lang="pt-BR" />
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${p.marginPercent >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {p.marginPercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {p.availableStock}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          <Money value={p.costPrice} lang="pt-BR" />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          <Money value={p.salePriceA} lang="pt-BR" />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          <Money value={p.salePriceB} lang="pt-BR" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Nenhum produto encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
        </>
      )}
      <AiReportModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={t("ai.title")}
        loading={aiLoading}
        content={aiReport}
        error={aiError}
      />
    </div>
  );
}
