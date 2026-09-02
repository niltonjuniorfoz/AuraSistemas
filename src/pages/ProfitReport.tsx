import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Filter, Search, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";
import { useNavigate } from "react-router";
import { apiFetch } from "../lib/api";
import { formatCurrency, formatDate, moneyFieldLabel, useAdminTranslation } from "../lib/i18n";
import { useAuthStore } from "../stores/authStore";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import { AiReportModal } from "../components/AiReportModal";
import { Money } from "../components/Money";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export function ProfitReport() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { t, language } = useAdminTranslation();
  
  const canViewProfit = (user?.roleKey === "admin" || user?.roleKey === "master") || user?.roleKey === "management";
  const canManageExpenses = canViewProfit || (user?.roleKey === "admin" || user?.roleKey === "master") || user?.roleKey === "management";

  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
     const d = new Date();
     d.setDate(1);
     return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"sales"|"expenses">("sales");

  const [data, setData] = useState<any>(null);
  
  // Expenses Form
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ id: "", categoryId: "", description: "", amountUsd: "", expenseDate: new Date().toISOString().split("T")[0], isFixed: false, dueDay: "", isActive: true });
  const [categories, setCategories] = useState<any[]>([]);
  
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if ((user?.roleKey === "admin" || user?.roleKey === "master") || user?.roleKey === "management") {
      fetchData();
      fetchCategories();
    }
  }, [user]);

  if (user?.roleKey !== "admin" && user?.roleKey !== "master" && user?.roleKey !== "management") {
     return <div className="p-8 text-center text-red-500 font-medium">Você não tem permissão para visualizar o relatório de lucro.</div>;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (dateFrom) qs.append("dateFrom", dateFrom);
      if (dateTo) qs.append("dateTo", dateTo);
      if (status !== "ALL") qs.append("status", status);

      const res = await apiFetch(`/api/reports/profit?${qs.toString()}`);
      if (res.ok) {
        const text = await res.text();
        try {
          setData(JSON.parse(text));
        } catch {
          alert("Erro ao ler resposta da API.");
        }
      } else {
        const text = await res.text();
        try {
           const err = JSON.parse(text);
           alert(err.error || "Erro ao carregar relatório");
        } catch {
           alert("Erro ao carregar relatório. Rota ou sistema indisponível.");
        }
      }
    } catch(err) {
      console.error(err);
      alert("Erro ao conectar");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
     try {
       const res = await apiFetch("/api/expenses/categories");
       if (res.ok) setCategories(await res.json());
     } catch(err) {
       console.error("Failed to load categories.");
     }
  };

  const saveExpense = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
       const url = expenseForm.id ? `/api/expenses/${expenseForm.id}` : "/api/expenses";
       const method = expenseForm.id ? "PUT" : "POST";
       const payload = {
         ...expenseForm,
         dueDay: expenseForm.isFixed && expenseForm.dueDay ? Number(expenseForm.dueDay) : null,
          recurrence: expenseForm.isFixed ? "MONTHLY" : "NONE"
       };
       const res = await apiFetch(url, {
         method,
         body: JSON.stringify(payload)
       });
       if (res.ok) {
         setShowExpenseModal(false);
         setExpenseForm({ id: "", categoryId: "", description: "", amountUsd: "", expenseDate: new Date().toISOString().split("T")[0], isFixed: false, dueDay: "", isActive: true });
         fetchData();
       } else {
         const text = await res.text();
         try {
           const err = JSON.parse(text);
           alert(err.error || "Erro ao salvar despesa");
         } catch {
           alert("Erro ao ler resposta da API.");
         }
       }
     } catch (err) {
        alert("Erro na conexão");
     }
  };

  const deleteExpense = async () => {
     if (!expenseToDelete) return;
     setIsDeletingExpense(true);
     try {
       const res = await apiFetch(`/api/expenses/${expenseToDelete}`, { method: "DELETE" });
       if (res.ok) {
         setExpenseToDelete(null);
         fetchData();
       } else {
         const text = await res.text();
         try {
           const err = JSON.parse(text);
           alert(err.error || "Erro ao excluir");
         } catch {
           alert("Erro ao excluir.");
         }
       }
     } catch(err) {
       alert("Erro na conexão");
     } finally {
       setIsDeletingExpense(false);
     }
  };

  const generateAiReport = async () => {
    if (!data) return;
    setAiModalOpen(true);
    setAiLoading(true);
    setAiError("");
    setAiReport("");
    try {
      const res = await apiFetch("/api/ai-reports/analysis", {
        method: "POST",
        body: JSON.stringify({
          reportType: "dre_dashboard_financeiro",
          language,
          filters: { dateFrom, dateTo, status },
          data,
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

  const SummaryCard = ({ title, value, prefix = "", suffix = "", isNegative = false, highlight = false, toneValue }: any) => {
    let colorClass = 'text-gray-100';
    let borderClass = highlight ? 'border-brand-gold/30' : 'border-gray-800';
    let bgClass = 'bg-brand-navylight';

    if (toneValue !== undefined) {
       if (toneValue > 0) {
          colorClass = 'text-green-400';
          borderClass = 'border-green-500/30';
       } else if (toneValue < 0) {
          colorClass = 'text-red-400';
          borderClass = 'border-red-500/30';
       } else {
          colorClass = 'text-gray-100';
          borderClass = 'border-gray-800';
       }
    } else {
       if (isNegative) colorClass = 'text-red-400';
       else if (highlight) colorClass = 'text-brand-gold';
    }

    return (
      <Card className={`financial-summary-card rounded-xl border ${bgClass} ${borderClass} gap-0 shadow-none`}>
         <CardContent className="p-0">
           <div className="financial-summary-title text-gray-400">{title}</div>
           <div className={`financial-summary-value font-bold ${colorClass}`}>
             {prefix}{value}{suffix}
           </div>
         </CardContent>
      </Card>
    );
  };

  return (
    <div className="dashboard-financial-page space-y-4 pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/reports")} className="rounded-full bg-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800">
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="text-2xl font-semibold text-white">Dashboard Financeiro</h2>
        </div>
      </div>

      <div className="financial-filter-panel bg-brand-navylight border border-gray-800 p-4 rounded-xl shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,12.5rem))_9.5rem] gap-4 items-end lg:justify-start">
        <div className="financial-filter-field">
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Data Inicial</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold" />
        </div>
        <div className="financial-filter-field">
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Data Final</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold" />
        </div>
        <div className="financial-filter-field financial-filter-field-wide">
           <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Status de Venda</label>
           <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#171717] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-gold">
              <option value="ALL">Todas exceto Canceladas</option>
              <option value="PAID">Pagamentos Concluídos</option>
              <option value="DELIVERED">Entregas Concluídas</option>
           </select>
        </div>
        <Button onClick={fetchData} className="financial-filter-button gap-2 justify-center rounded bg-brand-gold px-5 py-2 text-base font-bold text-brand-navydark hover:bg-brand-goldhover lg:w-[9.5rem]">
          {loading ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />} Buscar
        </Button>

      </div>

      {!loading && data && (
        <>
          <div className="financial-summary-sections space-y-4 shrink-0">
             {/* Bloco 1: Resumo Comercial */}
             <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Resumo Comercial</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                   <SummaryCard title="Qtd. Vendas do Período" value={data.summary.salesCount} />
                   <SummaryCard title="Faturamento Bruto" value={<Money value={data.summary.grossSales} lang="pt-BR" />} />
                   <SummaryCard title="Faturamento Líquido" value={<Money value={data.summary.netSales} lang="pt-BR" />} highlight />
                   <SummaryCard title="Ticket Médio" value={<Money value={data.summary.averageTicket} lang="pt-BR" />} />
                </div>
             </div>

             {/* Bloco 2: Lucro */}
             <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Lucro</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                   <SummaryCard title="Custo Produtos (CMV)" value={<Money value={data.summary.productCost} lang="pt-BR" />} isNegative />
                   <SummaryCard title="Lucro Bruto" value={<Money value={data.summary.grossProfit} lang="pt-BR" />} toneValue={data.summary.grossProfit} />
                   <SummaryCard title="Margem Bruta" value={Number(data.summary.grossMarginPercent).toFixed(1)} suffix="%" toneValue={data.summary.grossMarginPercent} />
                   <SummaryCard title="Lucro Líquido" value={<Money value={data.summary.netProfit} lang="pt-BR" />} toneValue={data.summary.netProfit} />
                   <SummaryCard title="Margem Líquida" value={Number(data.summary.netMarginPercent).toFixed(1)} suffix="%" toneValue={data.summary.netMarginPercent} />
                </div>
             </div>

             {/* Bloco 3: Financeiro */}
             <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Financeiro</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   <SummaryCard title="Total Pago" value={<Money value={data.summary.paidAmount} lang="pt-BR" />} />
                   <SummaryCard title="Total Pendente" value={<Money value={data.summary.pendingAmount} lang="pt-BR" />} />
                   <SummaryCard title="Despesas do Período" value={<Money value={data.summary.expenses} lang="pt-BR" />} isNegative />
                </div>
             </div>

             {/* Bloco 4: Operacional */}
             <div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Operacional</h3>
                <div className="grid grid-cols-2 gap-3">
                   <SummaryCard title="Produtos Ativos" value={data.summary.activeProducts} />
                   <SummaryCard title="Clientes Cadastrados" value={data.summary.activeCustomers} />
                </div>
             </div>
          </div>

          {data.hasEstimatedCost && (
            <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300 p-4 rounded-xl text-sm shrink-0">
               ⚠️ Algumas vendas antigas usam custo atual estimado porque não possuem custo gravado no momento da venda.
            </div>
          )}

          <div className="flex gap-4 border-b border-gray-800 shrink-0">
             <Button variant="ghost" onClick={() => setActiveTab("sales")} className={`h-auto rounded-none border-b-2 pb-3 text-sm font-medium hover:bg-transparent dark:hover:bg-transparent ${activeTab === "sales" ? 'border-brand-gold text-brand-gold hover:text-brand-gold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
               Vendas do Período
             </Button>
             <Button variant="ghost" onClick={() => setActiveTab("expenses")} className={`h-auto rounded-none border-b-2 pb-3 text-sm font-medium hover:bg-transparent dark:hover:bg-transparent ${activeTab === "expenses" ? 'border-brand-gold text-brand-gold hover:text-brand-gold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
               Despesas
             </Button>
          </div>

          <div className="financial-report-table-card bg-brand-navylight border border-gray-800 rounded-xl overflow-hidden">
             {activeTab === "sales" && (
                <div className="financial-report-table-scroll overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="text-xs uppercase bg-[#171717] text-gray-500 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 font-medium whitespace-nowrap">Data</th>
                        <th className="px-6 py-3 font-medium">Nota</th>
                        <th className="px-6 py-3 font-medium">Cliente</th>
                        <th className="px-6 py-3 font-medium whitespace-nowrap">Total Venda</th>
                        <th className="px-6 py-3 font-medium whitespace-nowrap">Custo (CMV)</th>
                        <th className="px-6 py-3 font-medium whitespace-nowrap">Lucro Bruto</th>
                        <th className="px-6 py-3 font-medium">Margem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.sales.length > 0 ? data.sales.map((s: any) => (
                         <tr key={s.id} className="hover:bg-brand-navydark/50 transition">
                           <td className="px-6 py-4 whitespace-nowrap">{formatDate(s.createdAt, 'pt-BR')}</td>
                           <td className="px-6 py-4 whitespace-nowrap">{s.series}-{String(s.number).padStart(6,'0')}</td>
                           <td className="px-6 py-4 truncate max-w-[200px]">{s.customerName}</td>
                           <td className="px-6 py-4 font-bold text-gray-100"><Money value={s.totalAmount} lang="pt-BR" /></td>
                           <td className="px-6 py-4 text-red-300"><Money value={s.cost} lang="pt-BR" /></td>
                           <td className="px-6 py-4 font-bold text-green-400"><Money value={s.profit} lang="pt-BR" /></td>
                           <td className="px-6 py-4">{Number(s.marginPercent).toFixed(1)}%</td>
                         </tr>
                      )) : (
                         <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Nenhuma venda no período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
             )}

             {activeTab === "expenses" && (
                <div className="flex flex-col">
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-brand-navydark">
                     <h3 className="font-medium text-white">Despesas do Período</h3>
                     {((user?.roleKey === "admin" || user?.roleKey === "master") || user?.roleKey === "management") && (
                       <Button variant="outline" onClick={() => {
                          setExpenseForm({ id: "", categoryId: "", description: "", amountUsd: "", expenseDate: new Date().toISOString().split("T")[0], isFixed: false, dueDay: "", isActive: true });
                          setShowExpenseModal(true);
                       }} className="rounded-lg border-gray-700 bg-[#171717] px-4 py-2 text-sm text-white shadow-none hover:bg-gray-800 hover:text-white dark:bg-[#171717] dark:border-gray-700 dark:hover:bg-gray-800">
                         + Adicionar Despesa
                       </Button>
                     )}
                  </div>
                  <div className="financial-report-table-scroll overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                      <thead className="text-xs uppercase bg-[#171717] text-gray-500 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 font-medium whitespace-nowrap">Data / Tipo</th>
                          <th className="px-6 py-3 font-medium">Categoria</th>
                          <th className="px-6 py-3 font-medium">Descrição</th>
                          <th className="px-6 py-3 font-medium">Valor</th>
                          <th className="px-6 py-3 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {data.expenses.length > 0 ? data.expenses.map((e: any) => {
                           const catName = categories.find(c => c.id === e.categoryId)?.name || "OUTROS";
                           return (
                           <tr key={e.id} className="hover:bg-brand-navydark/50 transition">
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div>{e.isFixed ? `Dia ${e.dueDay || '-'}` : formatDate(e.expenseDate, 'pt-BR')}</div>
                               <div className={`text-xs mt-1 ${e.isFixed ? 'text-blue-400' : 'text-gray-500'}`}>
                                  {e.isFixed ? (e.isActive ? 'Fixo Mensal (Ativa)' : 'Fixo Mensal (Inativa)') : 'Avulsa'}
                               </div>
                             </td>
                             <td className="px-6 py-4">{catName}</td>
                             <td className="px-6 py-4">{e.description}</td>
                             <td className="px-6 py-4 font-bold text-red-400"><Money value={e.amountUsd} lang="pt-BR" /></td>
                             <td className="px-6 py-4 text-right space-x-2">
                                <Button variant="link" onClick={() => {
                                   setExpenseForm({
                                      id: e.id,
                                      categoryId: e.categoryId || "",
                                      description: e.description,
                                      amountUsd: e.amountUsd,
                                      expenseDate: e.expenseDate ? e.expenseDate.split("T")[0] : new Date().toISOString().split("T")[0],
                                      isFixed: e.isFixed,
                                      dueDay: e.dueDay || "",
                                      isActive: e.isActive !== false
                                   });
                                   setShowExpenseModal(true);
                                }} className="h-auto p-0 text-sm text-gray-400 hover:text-brand-gold hover:no-underline">Editar</Button>
                                <Button variant="link" onClick={() => setExpenseToDelete(e.id)} className="h-auto p-0 text-sm text-gray-400 hover:text-red-400 hover:no-underline">Excluir</Button>
                             </td>
                           </tr>
                         )}) : (
                           <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma despesa no período.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
             )}
          </div>
        </>
      )}

      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title={expenseForm.id ? "Editar Despesa" : "Nova Despesa"} maxWidth="max-w-md">
        <form onSubmit={saveExpense} className="space-y-4">
           <div>
              <label className="flex items-center gap-2 text-sm text-white mb-4 cursor-pointer">
                <input type="checkbox" checked={expenseForm.isFixed} onChange={e => setExpenseForm({...expenseForm, isFixed: e.target.checked})} className="rounded bg-[#171717] border-gray-700 text-brand-gold focus:ring-brand-gold" />
                <span>Despesa Mensal Fixa</span>
              </label>
           </div>
           {expenseForm.isFixed ? (
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Dia do Vencimento</label>
                  <input required type="number" min="1" max="31" value={expenseForm.dueDay} onChange={e => setExpenseForm({...expenseForm, dueDay: e.target.value})} className="w-full bg-[#171717] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-brand-gold outline-none" />
                </div>
                <div className="flex items-end pb-2">
                   <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                     <input type="checkbox" checked={expenseForm.isActive} onChange={e => setExpenseForm({...expenseForm, isActive: e.target.checked})} className="rounded bg-[#171717] border-gray-700 text-brand-gold focus:ring-brand-gold" />
                     <span>Ativa</span>
                   </label>
                </div>
             </div>
           ) : (
             <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Data da Despesa</label>
                <input required type="date" value={expenseForm.expenseDate} onChange={e => setExpenseForm({...expenseForm, expenseDate: e.target.value})} className="w-full bg-[#171717] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-brand-gold outline-none" />
             </div>
           )}
           <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Categoria (Opcional)</label>
              <select value={expenseForm.categoryId} onChange={e => setExpenseForm({...expenseForm, categoryId: e.target.value})} className="w-full bg-[#171717] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-brand-gold outline-none">
                <option value="">Geral / Outros</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
           <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Descrição</label>
              <input required type="text" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-[#171717] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-brand-gold outline-none" />
           </div>
           <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">{moneyFieldLabel("Valor")}</label>
              <input required type="number" step="0.01" min="0.01" value={expenseForm.amountUsd} onChange={e => setExpenseForm({...expenseForm, amountUsd: e.target.value})} className="w-full bg-[#171717] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-brand-gold outline-none" />
           </div>
           <div className="pt-4">
             <Button type="submit" className="h-auto w-full whitespace-normal rounded-lg bg-brand-gold py-3 text-lg font-bold text-brand-navydark shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:bg-brand-goldhover">
               Salvar Despesa
             </Button>
           </div>
        </form>
      </Modal>

      <AiReportModal
         isOpen={aiModalOpen}
         onClose={() => setAiModalOpen(false)}
         title={t("ai.title")}
         loading={aiLoading}
         content={aiReport}
         error={aiError}
      />

      <ConfirmModal
         isOpen={!!expenseToDelete}
         onClose={() => setExpenseToDelete(null)}
         onConfirm={deleteExpense}
         title="Excluir Despesa"
         message="Tem certeza que deseja excluir esta despesa?"
         confirmText="Excluir"
         confirmingText="Excluindo..."
         confirmAsDeleting={isDeletingExpense}
      />
    </div>
  );
}
