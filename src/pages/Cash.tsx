import React, { useState, useEffect, useMemo, useRef } from "react";
import { apiFetch } from "../lib/api";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { CompositionDonut } from "../components/charts";
import { Wallet, Search, PlusCircle, MinusCircle, Lock, DollarSign, ListOrdered, Calendar, Printer, Eye, QrCode, Copy, CreditCard, ArrowLeftRight, Landmark, CheckCircle2, AlertCircle } from "lucide-react";
import { Modal } from "../components/Modal";
import { ReceiptModal } from "../components/ReceiptModal";
import { format } from "date-fns";
import { useAdminTranslation, formatCurrency, getSystemCurrency, setSystemCurrency, moneyFieldLabel, currencySymbol } from "../lib/i18n";
import { CURRENCY_SYMBOL } from "../lib/currency";
import { buildPixPayload } from "../lib/pix";
import { MONEY_EPSILON } from "../lib/money";
import { Money } from "../components/Money";
import { DisplayCurrencySelector } from "../components/DisplayCurrencySelector";
import { PaymentProof } from "../components/PaymentProof";
import { toast } from "../components/Toast";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// Contas válidas por forma de pagamento: dinheiro só caixa; PIX/débito/transferência
// só banco; crédito só "cartão a receber".
function accountsForMethod(accounts: any[], method: string) {
  const byType = (types: string[]) => accounts.filter((a) => types.includes(a.type));
  switch (method) {
    case "CASH": return byType(["CASH"]);
    case "PIX": return byType(["BANK"]);
    case "DEBIT_CARD": return byType(["BANK"]);
    case "CREDIT_CARD": return byType(["CARD_RECEIVABLE"]);
    case "TRANSFER": return byType(["BANK", "OTHER"]);
    default: return accounts;
  }
}

export function Cash() {
  const { t, language } = useAdminTranslation();
  const [register, setRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [paidSales, setPaidSales] = useState<any[]>([]);
  const [paidSalesLoaded, setPaidSalesLoaded] = useState(false);
  const paidSalesFetchingRef = useRef(false);
  const [tab, setTab] = useState<"PENDING" | "PAID" | "ALL">("PENDING");
  // Filtro de período pras vendas pagas — sem isso a aba "Todas" só mostrava
  // as últimas 50 pagas, sem jeito de buscar um dia específico de trás.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Open Modal
  const [isOpening, setIsOpening] = useState(false);
  const [openBalances, setOpenBalances] = useState<Record<string, string>>({});
  const [openNotes, setOpenNotes] = useState("");

  // Sangria & Supply Modal
  const [movementType, setMovementType] = useState<"SUPPLY" | "WITHDRAWAL" | null>(null);
  const [amountUsd, setAmountUsd] = useState("");
  const [description, setDescription] = useState("");

  // Close Register Modal
  const [isClosing, setIsClosing] = useState(false);
  const [closeBalances, setCloseBalances] = useState<Record<string, string>>({});
  const [closingNotes, setClosingNotes] = useState("");
  const [movements, setMovements] = useState<any[]>([]);

  // Payment Modal
  const [isPaying, setIsPaying] = useState<{sale: any} | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [currency, setCurrency] = useState("USD");
  const [amountReceived, setAmountReceived] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [gatewayNumber, setGatewayNumber] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [methodMap, setMethodMap] = useState<Record<string, string>>({});
  const [destAccountId, setDestAccountId] = useState("");
  const [todayMix, setTodayMix] = useState<any[]>([]);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [todayPrev, setTodayPrev] = useState<any>(null);

  const fetchTodayMix = () => {
    // toISOString() converte pra UTC antes de cortar a data — perto da meia-noite
    // local (Paraguai/Brasil = UTC-3/-4) isso contava a noite inteira como "amanhã".
    // Corrige subtraindo o offset do fuso antes de formatar (mesmo padrão já usado
    // em getTodayDateInputValue, no Pos.tsx).
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    apiFetch(`/api/dashboard/overview?dateFrom=${today}&dateTo=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { if (Array.isArray(d.paymentMix)) setTodayMix(d.paymentMix); setTodaySummary(d.summary || null); setTodayPrev(d.previous || null); } })
      .catch(() => {});
  };
  useEffect(() => { fetchTodayMix(); }, []);

  // Split de pagamento
  const [splitMode, setSplitMode] = useState(false);
  const [splitLines, setSplitLines] = useState<Array<{ method: string; amount: string }>>([{ method: "CASH", amount: "" }]);
  // Recebimento avulso
  const [showMisc, setShowMisc] = useState(false);
  const [miscForm, setMiscForm] = useState({ method: "CASH", amount: "", description: "" });
  // Histórico + relatório de fechamento
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any | null>(null);

  const handleSplitPayment = async () => {
    if (!isPaying || !register) return;
    const valid = splitLines.filter((l) => Number(l.amount) > 0);
    if (valid.length === 0) { toast.info("Adicione ao menos uma forma com valor."); return; }
    const res = await apiFetch(`/api/cash/sales/${isPaying.sale.id}/payments/split`, {
      method: "POST",
      body: JSON.stringify({
        cashRegisterId: register.id, notes: paymentNotes,
        lines: valid.map((l) => ({ method: l.method, amount: Number(l.amount), accountId: accountsForMethod(accounts, l.method)[0]?.id || null })),
      }),
    });
    if (res.ok) {
      setReceiptSale({ id: isPaying.sale.id, number: `${isPaying.sale.series}-${isPaying.sale.number}` });
      setIsPaying(null); setSplitMode(false); setConfirmStep(false); setSplitLines([{ method: "CASH", amount: "" }]);
      fetchMovements(register.id); setPaidSalesLoaded(false); fetchSales(); fetchTodayMix();
    } else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro no pagamento dividido"); }
  };

  const handleMiscReceipt = async () => {
    const amt = Number(miscForm.amount);
    if (!(amt > 0)) { toast.info("Informe o valor."); return; }
    const res = await apiFetch("/api/cash/misc-receipt", {
      method: "POST",
      body: JSON.stringify({ cashRegisterId: register?.id, method: miscForm.method, amount: amt, accountId: accountsForMethod(accounts, miscForm.method)[0]?.id || null, description: miscForm.description }),
    });
    if (res.ok) { setShowMisc(false); setMiscForm({ method: "CASH", amount: "", description: "" }); if (register) fetchMovements(register.id); fetchTodayMix(); toast.success("Recebimento avulso registrado."); }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Erro no recebimento avulso"); }
  };

  const openHistory = async () => {
    setShowHistory(true);
    const res = await apiFetch("/api/cash/registers/history");
    if (res.ok) { const j = await res.json(); setHistory(j.data || []); }
  };

  const openReport = async (id: string) => {
    const res = await apiFetch(`/api/cash/registers/${id}/report`);
    if (res.ok) setReportData(await res.json());
  };

  const printReport = () => {
    if (!reportData) return;
    const r = reportData.register, s = reportData.summary;
    const fmt = (v: number) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    // withdrawals e refunds já vêm NEGATIVOS do servidor (movimentos gravados com sinal).
    const outflow = (v: number) => `- ${fmt(Math.abs(Number(v) || 0))}`;
    const rows = [
      ["Saldo inicial", fmt(s.opening)], ["Recebido em dinheiro", fmt(s.salesCash)], ["Suprimentos", fmt(s.supplies)],
      ["Sangrias", outflow(s.withdrawals)], ["Estornos", outflow(s.refunds)], ["Esperado", fmt(s.expected)],
      ["Declarado", fmt(s.declared)], ["Diferença", fmt(s.difference)],
    ].map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${v}</td></tr>`).join("");
    const html = `<html><head><meta charset="utf-8"><title>Fechamento de Caixa</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:6px 4px;border-bottom:1px solid #eee}.tot{font-weight:bold;font-size:16px}</style></head><body>
      <h1>Relatório de Fechamento de Caixa</h1>
      <div>Operador: ${r.userName || "-"}</div>
      <div>Aberto: ${new Date(r.openedAt).toLocaleString("pt-BR")}</div>
      <div>Fechado: ${r.closedAt ? new Date(r.closedAt).toLocaleString("pt-BR") : "-"}</div>
      <table>${rows}</table>
      <p style="margin-top:16px;font-size:12px;color:#666">Apenas dinheiro. PIX/cartão/transferência são acompanhados no módulo Financeiro.</p>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Permita pop-ups para imprimir."); return; }
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  useEffect(() => {
    // whatsappGateway vem do mesmo /company-public que fetchCompanyPix já
    // busca (chamado logo abaixo) — sem repetir a requisição aqui.
    Promise.all([apiFetch("/api/finance/accounts"), apiFetch("/api/finance/method-map")])
      .then(async ([a, m]) => {
        if (a.ok) { const j = await a.json(); setAccounts(j.data || []); }
        if (m.ok) { const j = await m.json(); setMethodMap(j.data || {}); }
      })
      .catch(() => {});
  }, []);

  const [confirmStep, setConfirmStep] = useState(false);

  // Ao trocar de método, o destino padrão é a conta mapeada (se válida para o método)
  // ou a primeira conta compatível.
  useEffect(() => {
    const list = accountsForMethod(accounts, paymentMethod);
    const mapped = methodMap[paymentMethod];
    setDestAccountId(list.some((a) => a.id === mapped) ? mapped : (list[0]?.id || ""));
    setConfirmStep(false);
  }, [paymentMethod, methodMap, isPaying, accounts]);
  const [amountAlreadyPaid, setAmountAlreadyPaid] = useState<number>(0);
  // Trava os botões de abrir/movimentar/fechar/receber enquanto a requisição está
  // em voo — sem isso, um clique duplo (ou rede lenta) podia lançar a mesma
  // sangria/pagamento duas vezes.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [receiptSale, setReceiptSale] = useState<{ id: string, number: string } | null>(null);
  const [saleDetails, setSaleDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [companyPix, setCompanyPix] = useState<any>(null);
  const [systemCurrency, setSystemCurrencyState] = useState(getSystemCurrency());
  const [pixPayload, setPixPayload] = useState("");
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixError, setPixError] = useState("");

  // Cancel Sale State
  const [cancelModal, setCancelModal] = useState<string | null>(null); // saleId
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchRegister();
    fetchSales();
    fetchCompanyPix();
  }, []);

  useEffect(() => {
    if ((tab === "PAID" || tab === "ALL") && !paidSalesLoaded) {
      fetchPaidSales();
    }
  }, [tab, paidSalesLoaded]);

  // Refaz a busca (ignorando o cache "já carregado") sempre que o filtro de
  // período mudar, pra aba Pagas/Todas refletir o novo intervalo escolhido.
  useEffect(() => {
    if (tab === "PAID" || tab === "ALL") fetchPaidSales(true);
  }, [dateFrom, dateTo]);

  // Link profundo vindo de Contas a Receber (?saleId=) — abre o modal de
  // pagamento já na nota certa. Só dispara uma vez (guardado pelo ref),
  // mesmo que `register`/`loading` mudem de novo depois (ex.: ao fechar e
  // reabrir o caixa na mesma visita).
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (deepLinkHandledRef.current || loading) return;
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get("saleId");
    if (!saleId) return;
    deepLinkHandledRef.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    if (!register) {
      toast.info("Abra o caixa para receber esta venda.");
      return;
    }
    (async () => {
      const res = await apiFetch(`/api/cash/sales/${saleId}/details`);
      if (res.ok) {
        const { sale } = await res.json();
        openPaymentModal(sale);
      } else {
        toast.error("Venda não encontrada.");
      }
    })();
  }, [register, loading]);

  // Sem isso, o Caixa aberto numa aba nunca via uma venda ser cancelada ou
  // paga (inclusive vinda da tela de Pedidos da Loja) na outra aba sem
  // recarregar a página na mão. Só enquanto a aba está visível — não gasta
  // requisição com o Caixa minimizado/em segundo plano.
  // Também reconsulta os movimentos e o "Recebido hoje" — antes só a lista de
  // vendas era atualizada, então um pagamento feito no POS (outro terminal)
  // fazia a venda virar PAGA aqui mas o "Saldo em caixa" ficava parado.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSales();
        if (register) fetchMovements(register.id);
        fetchTodayMix();
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [tab, register]);

  const fetchRegister = async () => {
    try {
      const res = await apiFetch("/api/cash/registers/current");
      if (res.ok) {
        const data = await res.json();
        setRegister(data || null);
        if (data) fetchMovements(data.id);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(`Erro ${res.status}: ${err.error || "Erro ao carregar caixa atual."}`);
      }
    } catch (e: any) {
      setErrorMsg(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    await fetchPendingSales();
    if (tab === "PAID" || tab === "ALL") {
      await fetchPaidSales(true);
    }
  };

  const fetchPendingSales = async () => {
    try {
      const pendingRes = await apiFetch("/api/cash/sales-pending");
      const pendingData = pendingRes.ok ? await pendingRes.json() : [];
      setPendingSales(Array.isArray(pendingData) ? pendingData : []);
    } catch (e) {
      console.error(e);
      setPendingSales([]);
    }
  };

  const fetchPaidSales = async (force = false) => {
    if (paidSalesLoaded && !force) return;
    // Troca rápida de aba (ou uma ação disparando refresh logo depois do efeito
    // de troca de aba já ter disparado o dele) podia deixar duas buscas dessa
    // mesma rota em voo ao mesmo tempo — a que respondesse por último "vencia",
    // podendo sobrescrever dado mais novo com um mais velho. Uma busca de
    // cada vez resolve isso e evita a requisição duplicada.
    if (paidSalesFetchingRef.current) return;
    paidSalesFetchingRef.current = true;
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (!dateFrom && !dateTo) params.set("limit", "50");
      const paidRes = await apiFetch(`/api/cash/sales-paid?${params.toString()}`);
      const paidData = paidRes.ok ? await paidRes.json() : [];
      setPaidSales(Array.isArray(paidData) ? paidData : []);
      setPaidSalesLoaded(true);
    } catch (e) {
      console.error(e);
      setPaidSales([]);
      setPaidSalesLoaded(true);
    } finally {
      paidSalesFetchingRef.current = false;
    }
  };

  const fetchMovements = async (id: string) => {
    try {
      const res = await apiFetch(`/api/cash/registers/${id}/movements`);
      if (res.ok) setMovements(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCompanyPix = async () => {
    try {
      const res = await apiFetch("/api/settings/company-public");
      if (res.ok) {
        const data = await res.json();
        setCompanyPix(data);
        if (data.whatsappGateway) setGatewayNumber(data.whatsappGateway);
        const current = data.defaultCurrency === "BRL" ? "BRL" : data.defaultCurrency === "DUAL" ? "DUAL" : "USD";
        setSystemCurrency(current);
        setSystemCurrencyState(current);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const parseMoney = (value: any) => {
    const parsed = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getDefaultPixRate = () => {
    if (systemCurrency === "BRL") return 1;
    const raw = companyPix?.pixExchangeRate ?? companyPix?.brlRateToUsd ?? "";
    const parsed = parseMoney(raw);
    return parsed > 0 ? parsed : 5.5;
  };

  const getRemainingUsd = (sale: any = isPaying?.sale) => {
    if (!sale) return 0;
    return Math.max(0, parseMoney(sale.totalAmount) - amountAlreadyPaid);
  };

  const applyPixConversion = (rateOverride?: number) => {
    const rate = rateOverride && rateOverride > 0 ? rateOverride : getDefaultPixRate();
    const remaining = getRemainingUsd();
    setCurrency("BRL");
    setExchangeRate(String(rate));
    setAmountReceived((remaining * rate).toFixed(2));
  };

  const openSaleDetails = async (sale: any) => {
    setDetailsLoading(true);
    setSaleDetails({ sale, items: [] });
    try {
      const res = await apiFetch(`/api/cash/sales/${sale.id}/details`);
      if (res.ok) {
        setSaleDetails(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setSaleDetails({ error: data.error || "Erro ao carregar nota." });
      }
    } catch (e: any) {
      setSaleDetails({ error: e.message || "Erro ao carregar nota." });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    const remaining = getRemainingUsd();
    if (method === "PIX") {
      applyPixConversion();
      return;
    }
    setCurrency(systemCurrency === "BRL" ? "BRL" : "USD");
    setExchangeRate("1");
    setAmountReceived(remaining.toFixed(2));
  };

  const openPixQr = () => {
    setPixError("");
    try {
      if (!companyPix?.pixKey) {
        setPixError("Chave PIX não configurada em Configurações > Empresa.");
        setShowPixModal(true);
        return;
      }
      const amount = parseMoney(amountReceived);
      if (!amount || amount <= 0) {
        setPixError("Informe o valor recebido em BRL para gerar o QR Code PIX.");
        setShowPixModal(true);
        return;
      }
      const payload = buildPixPayload({
        pixKey: companyPix.pixKey,
        amount,
        merchantName: companyPix.tradeName || "OMEGA PY",
        merchantCity: companyPix.city || "Ciudad del Este",
        txid: isPaying ? `${isPaying.sale.series}${String(isPaying.sale.number).padStart(6, "0")}` : "OMEGAPY",
      });
      setPixPayload(payload);
      setShowPixModal(true);
    } catch (e: any) {
      setPixError(e.message || "Erro ao gerar PIX.");
      setShowPixModal(true);
    }
  };

  const calcMovementsStats = () => {
    let sales = 0;
    let supplies = 0;
    let withdrawals = 0;
    let net = 0; // soma de todos os movimentos exceto abertura (espelha o servidor)

    movements.forEach(m => {
      const val = parseFloat(m.amountUsd) || 0;
      if (m.type === "OPENING") return; // já contado em "initial"
      net += val;
      if (m.type === "SALE_PAYMENT") sales += val;
      else if (m.type === "SUPPLY") supplies += val;
      else if (m.type === "WITHDRAWAL" || m.type === "REFUND") withdrawals += Math.abs(val); // saídas (sangria + estorno)
    });

    const initial = register ? parseFloat(register.openingAmountUsd) : 0;
    const expected = initial + net;

    return { initial, sales, supplies, withdrawals, expected };
  };

  const handleOpen = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const balances = Object.entries(openBalances)
        .map(([currency, amount]) => ({ currency, amount: Number(amount) || 0 }))
        .filter((b) => b.amount > 0);
      const res = await apiFetch("/api/cash/registers/open", {
        method: "POST",
        body: JSON.stringify({ balances, notes: openNotes })
      });
      if (res.ok) {
        setIsOpening(false);
        setOpenBalances({});
        setOpenNotes("");
        fetchRegister();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao abrir caixa");
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMovement = async () => {
    if (!movementType || !register || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const endpoint = movementType === "SUPPLY" ? "supply" : "withdrawal";
      const res = await apiFetch(`/api/cash/registers/${register.id}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({ amountUsd, description })
      });
      if (res.ok) {
        setMovementType(null);
        setAmountUsd("");
        setDescription("");
        fetchMovements(register.id);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro na movimentação");
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!register || isSubmitting) return;
    setIsSubmitting(true);
    const regId = register.id;
    try {
      const balances = Object.entries(closeBalances)
        .filter(([, amount]) => amount !== undefined && amount !== "")
        .map(([currency, amount]) => ({ currency, declaredAmount: Number(amount) || 0 }));
      const res = await apiFetch(`/api/cash/registers/${regId}/close`, {
        method: "POST",
        body: JSON.stringify({ balances, notes: closingNotes })
      });
      if (res.ok) {
        setIsClosing(false);
        setRegister(null);
        setCloseBalances({});
        openReport(regId); // revela a diferença no relatório de fechamento
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao fechar caixa");
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModal = async (sale: any) => {
    setIsPaying({sale});
    setPaymentMethod("CASH");
    setCurrency(systemCurrency === "BRL" ? "BRL" : "USD");
    setExchangeRate("1");
    setAmountReceived("");
    setPaymentNotes("");
    try {
      const res = await apiFetch(`/api/cash/sales/${sale.id}/payments`);
      const list = await res.json();
      const totalPaidUsd = list.reduce((acc: number, curr: any) => acc + parseMoney(curr.amountUsd), 0);
      setAmountAlreadyPaid(totalPaidUsd);
      
      const saleExpected = parseMoney(sale.totalAmount);
      const remaining = Math.max(0, saleExpected - totalPaidUsd);
      setAmountReceived(remaining.toFixed(2));
    } catch (e) {
      console.error(e);
    }
  };

  const handleReceivePayment = async () => {
    if (!isPaying || !register || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const receivedNum = parseMoney(amountReceived);
      const rateNum = parseMoney(exchangeRate);
      // Conversão depende só da moeda em que o pagamento foi recebido (currency),
      // não da preferência de exibição da loja (systemCurrency) — loja configurada
      // em BRL recebendo pagamento em BRL/USDT também precisa converter pra USD,
      // que é a moeda em que o pagamento fica gravado (payments.amountUsd).
      const shouldConvert = currency !== "USD";
      const convertedUsd = shouldConvert && rateNum > 0 ? receivedNum / rateNum : receivedNum;

      const saleExpected = parseMoney(isPaying.sale.totalAmount);
      const remaining = saleExpected - amountAlreadyPaid;

      // if payment is higher than remaining, tell user they need to give change
      if (convertedUsd > remaining + MONEY_EPSILON) {
        // TODO: Trocar esse confirm() nativo por um modal próprio do sistema (Anotado para ajustes futuros)
        if (!confirm(`O valor pago ultrapassa o pendente.
Pendente: ${formatCurrency(remaining, language)}
Recebido: ${formatCurrency(convertedUsd, language)}
Troco devido: ${formatCurrency(convertedUsd - remaining, language)}

Isto registrará apenas o valor restante como pagamento (para fechar a venda). O caixa irá abater o troco?`)) {
          return;
        }
      }

      const finalAmountUsd = Math.min(convertedUsd, remaining);

      const res = await apiFetch(`/api/cash/sales/${isPaying.sale.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          cashRegisterId: register.id,
          paymentMethod,
          currency,
          amount: amountReceived,
          exchangeRate,
          amountUsd: finalAmountUsd, // We log what was applied to the sale
          notes: paymentNotes,
          accountId: destAccountId || null,
        })
      });

      if (res.ok) {
        setReceiptSale({ 
           id: isPaying.sale.id, 
           number: `${isPaying.sale.series}-${isPaying.sale.number}` 
        });
        setIsPaying(null);
        setConfirmStep(false);
        fetchMovements(register.id);
        setPaidSalesLoaded(false);
        fetchSales();
        fetchTodayMix();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao pagar");
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSale = async () => {
    if (!cancelModal) return;
    setCancelError("");
    setCancelLoading(true);
    try {
      const res = await apiFetch(`/api/sales/${cancelModal}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.ok) {
        setCancelModal(null);
        setCancelReason("");
        setCancelConfirm(false);
        setPaidSalesLoaded(false);
        fetchSales();
      } else {
        const d = await res.json().catch(() => ({}));
        setCancelError(d.error || "Erro ao cancelar venda.");
      }
    } catch (e: any) {
      setCancelError(e.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const stats = register ? calcMovementsStats() : null;

  // useMemo: sem isso, o merge+sort da aba "Todas" refaz a cada re-render (poll de 25s inclusive),
  // não só quando pendingSales/paidSales/tab realmente mudam.
  const displaySales = useMemo(
    () => tab === "PENDING" ? pendingSales : tab === "PAID" ? paidSales : [...pendingSales, ...paidSales].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tab, pendingSales, paidSales]
  );

  // Colunas da tabela do Caixa (TanStack): ordenação, busca instantânea e paginação.
  // As abas (Pendentes/Pagas/Todas) continuam filtrando o que entra na tabela.
  const cashColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: ({ getValue }) => <span className="whitespace-nowrap text-gray-300">{format(new Date(String(getValue())), "dd/MM/yyyy HH:mm")}</span>,
    },
    {
      id: "numero",
      header: "Número",
      accessorFn: (s: any) => `${s.series}-${String(s.number).padStart(6, "0")}`,
      cell: ({ getValue }) => <span className="font-mono text-gray-300">{String(getValue())}</span>,
    },
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (s: any) => s.customerName || "Consumidor Final",
      cell: ({ getValue }) => <span className="font-medium text-gray-200">{String(getValue())}</span>,
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">{moneyFieldLabel("Total")}</div>,
      sortingFn: (a, b) => Number(a.original.totalAmount) - Number(b.original.totalAmount),
      cell: ({ row }) => <div className="text-right font-medium text-white"><Money value={row.original.totalAmount} lang={language} /></div>,
    },
    {
      id: "situacao",
      header: "Situação",
      accessorFn: (s: any) => t(`status.${s.paymentStatus}`),
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div>
            <Badge variant={s.paymentStatus === "PAID" ? "success" : s.paymentStatus === "PARTIAL" ? "warning" : "destructive"}>
              {t(`status.${s.paymentStatus}`)}
            </Badge>
            {s.paymentStatus === "PARTIAL" && s.paidAmount != null && (
              <div className="mt-1 text-[10px] text-gray-400 leading-tight">
                Pago <span className="text-emerald-400 font-semibold"><Money value={s.paidAmount} lang={language} /></span> · Falta <span className="text-yellow-500 font-semibold"><Money value={s.remainingAmount} lang={language} /></span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "detalhes",
      header: "Detalhes Rec.",
      accessorFn: (s: any) => s.paymentMethod || "",
      cell: ({ row }) => {
        const s = row.original;
        return s.paymentMethod ? (
          <div className="text-xs text-gray-400">
            <div><span className="font-semibold text-gray-300">{s.paymentMethod}</span></div>
            {s.paymentDate && <div>{format(new Date(s.paymentDate), "dd/MM/yyyy HH:mm")}</div>}
            {s.cashierName && <div><span className="text-brand-gold">{s.cashierName}</span></div>}
          </div>
        ) : <span className="text-gray-600">-</span>;
      },
    },
    {
      id: "acoes",
      header: () => <div className="text-center">Ações</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-xs" onClick={() => openSaleDetails(s)} title="Visualizar nota" className="text-blue-300 hover:text-blue-200">
              <Eye className="w-4 h-4" />
            </Button>
            {s.paymentStatus !== "PAID" && (
              <Button size="xs" className="cash-receive-button bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => openPaymentModal(s)}>
                Receber
              </Button>
            )}
            {s.paymentStatus === "PENDING" && s.orderStatus !== "CANCELED" && s.orderStatus !== "CANCELLED" && (
              <Button variant="destructive" size="icon-xs" onClick={() => setCancelModal(s.id)} title="Cancelar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={() => setReceiptSale({ id: s.id, number: `${s.series}-${s.number}` })} title="Imprimir Recibo" className="text-indigo-400 hover:text-indigo-300">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ], [language, t, systemCurrency]);

  // Early return SEMPRE depois de todos os hooks (senão o React acusa
  // "Rendered more hooks than during the previous render").
  if (loading) return <div>Carregando caixa...</div>;

  return (
    <div className="cash-page flex flex-col h-full overflow-hidden w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <h1 className="cash-title text-2xl font-semibold text-gray-100 flex items-center gap-2">
          <Wallet className="text-brand-gold w-6 h-6" />
          Caixa e Pagamentos
        </h1>
        <DisplayCurrencySelector />
      </div>
      
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg mb-6 shrink-0">
           {errorMsg}
           <Button variant="ghost" size="icon-xs" className="float-right text-red-500 hover:text-red-300" onClick={() => setErrorMsg(null)}>✕</Button>
        </div>
      )}

      {!register ? (
        <div className="bg-brand-navylight p-8 rounded-lg shadow-xl text-center border border-gray-800">
          <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">Caixa Fechado</h2>
          <p className="text-gray-400 mb-6">Você precisa abrir um caixa para receber pagamentos e movimentar valores.</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => setIsOpening(true)}>Abrir Caixa</Button>
            <Button variant="outline" onClick={openHistory}>
              <ListOrdered className="w-4 h-4" /> Histórico de caixas
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#171717] p-4 md:p-5 shadow-md mb-4 shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Resumo do caixa (dinheiro físico) */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> CAIXA ABERTO</span>
                <span className="text-xs text-gray-500">desde {new Date(register.openedAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-700 bg-brand-navylight p-3">
                  <div className="text-[11px] text-gray-400 mb-1">Saldo inicial</div>
                  <div className="text-lg font-bold text-white"><Money value={stats?.initial || 0} lang={language} /></div>
                </div>
                <div className="rounded-xl border border-gray-700 bg-brand-navylight p-3">
                  <div className="text-[11px] text-gray-400 mb-1">Recebido em dinheiro</div>
                  <div className="text-lg font-bold text-emerald-400">+<Money value={stats?.sales || 0} lang={language} /></div>
                </div>
                <div className="rounded-xl border border-gray-700 bg-brand-navylight p-3">
                  <div className="text-[11px] text-gray-400 mb-1">Entradas / Saídas</div>
                  <div className="text-sm font-bold text-emerald-400">+<Money value={stats?.supplies || 0} lang={language} /></div>
                  <div className="text-sm font-bold text-red-400">−<Money value={stats?.withdrawals || 0} lang={language} /></div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-300 font-medium">Saldo em caixa (dinheiro)</span>
                <span className="text-2xl font-black text-brand-gold"><Money value={stats?.expected || 0} lang={language} /></span>
              </div>
            </div>

            {/* Recebido hoje por forma de pagamento */}
            <div className="lg:border-l lg:border-gray-800 lg:pl-4">
              <h3 className="text-sm font-semibold text-white mb-3">Recebido hoje</h3>
              {(() => {
                const PAYL: Record<string, string> = { CASH: "Dinheiro", PIX: "PIX", DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito", TRANSFER: "Transf." };
                const PAYC: Record<string, string> = { CASH: "#ffd700", PIX: "#34d399", DEBIT_CARD: "#a78bfa", CREDIT_CARD: "#60a5fa", TRANSFER: "#fbbf24" };
                const items = todayMix
                  .map((m) => ({ label: PAYL[m.method] || m.method, value: Number(m.total), color: PAYC[m.method] || "#64748b" }))
                  .filter((i) => i.value > 0);
                if (items.length === 0) return <div className="text-sm text-gray-500 py-4 text-center">Nenhum recebimento hoje.</div>;
                // Donut vivo (tooltip no hover) no lugar das barras estáticas.
                return <CompositionDonut items={items} height={150} />;
              })()}
            </div>
          </div>

          {/* Resumo do dia (nº vendas, ticket médio, comparativo com ontem) */}
          {todaySummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-800">
              <div className="rounded-xl border border-gray-700 bg-brand-navylight p-3">
                <div className="text-[11px] text-gray-400 mb-1">Vendas hoje</div>
                <div className="text-2xl font-black text-white">{todaySummary.salesCount}</div>
                {todayPrev && <div className={`text-[11px] font-semibold ${todayPrev.salesCountDeltaPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>{todayPrev.salesCountDeltaPercent >= 0 ? "▲" : "▼"} {Math.abs(todayPrev.salesCountDeltaPercent)}% vs ontem ({todayPrev.salesCount})</div>}
              </div>
              <div className="rounded-xl border border-gray-700 bg-brand-navylight p-3">
                <div className="text-[11px] text-gray-400 mb-1">Ticket médio</div>
                <div className="text-2xl font-black text-brand-gold"><Money value={todaySummary.averageTicket || 0} lang={language} /></div>
                <div className="text-[11px] text-gray-500">por venda</div>
              </div>
              <div className="rounded-xl border border-gray-700 bg-brand-navylight p-3">
                <div className="text-[11px] text-gray-400 mb-1">Faturado hoje</div>
                <div className="text-2xl font-black text-emerald-400"><Money value={todaySummary.netSales || 0} lang={language} /></div>
                {todayPrev && <div className={`text-[11px] font-semibold ${todayPrev.netSalesDeltaPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>{todayPrev.netSalesDeltaPercent >= 0 ? "▲" : "▼"} {Math.abs(todayPrev.netSalesDeltaPercent)}% vs ontem</div>}
              </div>
              <div className="rounded-xl border border-gray-700 bg-brand-navylight p-3">
                <div className="text-[11px] text-gray-400 mb-1">Ontem faturou</div>
                <div className="text-2xl font-black text-gray-300"><Money value={todayPrev?.netSales || 0} lang={language} /></div>
                <div className="text-[11px] text-gray-500">{todayPrev?.salesCount || 0} vendas</div>
              </div>
            </div>
          )}

          <div className="cash-actions flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-800">
             <Button variant="outline" onClick={() => setMovementType("SUPPLY")}>
               <PlusCircle className="w-4 h-4 text-green-400" /> Suprimento
             </Button>
             <Button variant="outline" onClick={() => setMovementType("WITHDRAWAL")}>
               <MinusCircle className="w-4 h-4 text-red-400" /> Sangria
             </Button>
             <Button variant="outline" onClick={() => { setMiscForm({ method: "CASH", amount: "", description: "" }); setShowMisc(true); }}>
               <DollarSign className="w-4 h-4 text-emerald-400" /> Recebimento avulso
             </Button>
             <Button variant="outline" className="ml-auto" onClick={openHistory}>
               <ListOrdered className="w-4 h-4 text-blue-300" /> Histórico
             </Button>
             <Button variant="destructive" onClick={() => { setCloseBalances({}); setClosingNotes(""); setIsClosing(true); }}>
               <Lock className="w-4 h-4" /> Fechar Caixa
             </Button>
          </div>
          </div>

          <div className="cash-sales-card flex-1 flex flex-col bg-brand-navylight rounded-lg shadow-xl shadow-black/20 overflow-hidden border border-brand-navylight">
            <div className="flex gap-2 border-b border-gray-800 p-2 shrink-0">
              <Button variant={tab === "PENDING" ? "default" : "outline"} className="flex-1" onClick={() => setTab("PENDING")}>
                Vendas Pendentes
              </Button>
              <Button variant={tab === "PAID" ? "default" : "outline"} className="flex-1" onClick={() => setTab("PAID")}>
                Vendas Pagas
              </Button>
              <Button variant={tab === "ALL" ? "default" : "outline"} className="flex-1" onClick={() => setTab("ALL")}>
                Todas
              </Button>
            </div>
            {(tab === "PAID" || tab === "ALL") && (
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 px-4 py-2.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[11px] text-gray-500">Período</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[#171717] border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none focus:border-brand-gold" />
                <span className="text-gray-600 text-xs">até</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[#171717] border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none focus:border-brand-gold" />
                {(dateFrom || dateTo) && (
                  <Button variant="link" size="xs" className="h-auto p-0 text-[11px] font-semibold" onClick={() => { setDateFrom(""); setDateTo(""); }}>Limpar</Button>
                )}
                {!dateFrom && !dateTo && <span className="text-[11px] text-gray-600">últimas 50 vendas pagas</span>}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {/* Tabela TanStack: ordenar por coluna, busca instantânea e paginação.
                  Clique na linha abre os detalhes da nota. */}
              <DataTable
                columns={cashColumns}
                data={displaySales}
                pageSize={10}
                searchPlaceholder="Buscar por cliente ou número..."
                emptyText="Nenhuma venda encontrada"
                onRowClick={(s: any) => openSaleDetails(s)}
              />
            </div>
          </div>
        </>
      )}

      {/* Opening Modal */}
      <Modal isOpen={isOpening} onClose={() => setIsOpening(false)} title="Abrir Caixa">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Valor inicial por moeda</label>
            <p className="text-xs text-gray-500 mb-2">Deixe 0 nas moedas que não vão circular neste turno.</p>
            <div className="space-y-2">
              {(["USD", "BRL", "PYG", "USDT"] as const).map((cur) => (
                <div key={cur} className="flex items-center gap-2">
                  <span className="w-14 text-xs font-bold text-gray-400">{cur === "USD" ? "US$" : cur === "BRL" ? "R$" : cur === "PYG" ? "₲" : "USDT"}</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={openBalances[cur] || ""}
                    onChange={(e) => setOpenBalances((prev) => ({ ...prev, [cur]: e.target.value }))}
                    placeholder="0"
                    className="flex-1 bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Observações</label>
            <textarea value={openNotes} onChange={e => setOpenNotes(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white h-24 focus:outline-none focus:border-brand-gold" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="ghost" onClick={() => setIsOpening(false)}>Cancelar</Button>
            <Button onClick={handleOpen} disabled={isSubmitting}>{isSubmitting ? "Abrindo..." : "Confirmar Abertura"}</Button>
          </div>
        </div>
      </Modal>

      {/* Closing Modal */}
      <Modal isOpen={isClosing} onClose={() => setIsClosing(false)} title="Fechar Caixa — Conferência cega">
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200 flex items-start gap-2">
            <Eye className="w-4 h-4 shrink-0 mt-0.5" /> Conte o dinheiro físico da gaveta (e saldos digitais) e informe o total por moeda. O sistema <b>não mostra o valor esperado agora</b> — a diferença aparece no relatório assim que fechar. Isso evita "ajustar pra bater".
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-400 mb-1.5">Valor contado por moeda</label>
             <div className="space-y-2">
               {(["USD", "BRL", "PYG", "USDT"] as const).map((cur, idx) => (
                 <div key={cur} className="flex items-center gap-2">
                   <span className="w-14 text-xs font-bold text-gray-400">{cur === "USD" ? "US$" : cur === "BRL" ? "R$" : cur === "PYG" ? "₲" : "USDT"}</span>
                   <input
                     type="number" step="0.01" min="0"
                     placeholder="0"
                     autoFocus={idx === 0}
                     value={closeBalances[cur] || ""}
                     onChange={(e) => setCloseBalances((prev) => ({ ...prev, [cur]: e.target.value }))}
                     className="flex-1 bg-[#171717] border border-gray-700 rounded-lg px-4 py-3 text-white text-xl font-mono focus:outline-none focus:border-brand-gold"
                   />
                 </div>
               ))}
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Observações de Fechamento</label>
            <textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white h-20 focus:outline-none focus:border-brand-gold" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="ghost" onClick={() => setIsClosing(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClose} disabled={Object.values(closeBalances).every((v) => v === undefined || v === "") || isSubmitting}>{isSubmitting ? "Fechando..." : "Confirmar Fechamento"}</Button>
          </div>
        </div>
      </Modal>

      {/* Movement (Sangria/Supply) Modal */}
      <Modal isOpen={!!movementType} onClose={() => setMovementType(null)} title={movementType === "SUPPLY" ? "Suprimento (Entrada)" : "Sangria (Saída)"}>
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">{moneyFieldLabel("Valor")}</label>
               <input type="number" step="0.01" value={amountUsd} onChange={e => setAmountUsd(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-gold" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
               <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={movementType === "SUPPLY" ? "Ex.: troco trazido de casa" : "Ex.: depósito no banco, pagamento fornecedor"} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-gold" />
            </div>
            <Card className="py-0">
              <CardContent className="p-3">
               <div className="text-xs font-semibold text-gray-300 mb-1">Comprovante (opcional)</div>
               <p className="text-[11px] text-gray-500 mb-2">{movementType === "SUPPLY" ? "Anexe o comprovante da entrada, se houver." : "Anexe o comprovante (foto do depósito, recibo) pra justificar a saída. Pode enviar por WhatsApp."}</p>
               <PaymentProof
                 saleLabel={`${movementType === "SUPPLY" ? "Suprimento" : "Sangria"}: ${description || "caixa"}`}
                 amountLabel={`R$ ${Number(amountUsd || 0).toFixed(2)}`}
                 gatewayNumber={gatewayNumber}
               />
              </CardContent>
            </Card>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <Button variant="ghost" onClick={() => setMovementType(null)}>Cancelar</Button>
              <Button onClick={handleMovement} disabled={isSubmitting}>{isSubmitting ? "Confirmando..." : "Confirmar"}</Button>
            </div>
         </div>
      </Modal>

      {/* Sale Details Modal */}
      <Modal isOpen={!!saleDetails} onClose={() => setSaleDetails(null)} title="Visualizar Nota / Conferência">
        {detailsLoading ? (
          <div className="p-6 text-center text-gray-400">Carregando nota...</div>
        ) : saleDetails?.error ? (
          <Card className="border-red-500/30 bg-red-500/10 py-0">
            <CardContent className="p-3 text-red-300">{saleDetails.error}</CardContent>
          </Card>
        ) : saleDetails?.sale ? (
          <div className="cash-note-review space-y-3">
            <div className="cash-note-header border-b border-gray-800 pb-2">
              <div className="text-[10px] uppercase tracking-wider text-brand-gold">Nota</div>
              <div className="font-mono text-sm font-bold text-white">{saleDetails.sale.series}-{String(saleDetails.sale.number).padStart(6, '0')}</div>
              <div className="mt-1 truncate text-xs text-gray-300">Cliente: {saleDetails.sale.customerName || 'Consumidor Final'}</div>
            </div>
            <Card className="max-h-[42vh] overflow-y-auto rounded-lg py-0">
              <CardContent className="p-0">
              {(saleDetails.items || []).map((item: any) => (
                <div key={item.id} className="border-b border-gray-800 px-3 py-2.5 last:border-b-0">
                  <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{item.productName || 'Produto'}</div>
                      <div className="mt-0.5 text-[11px] font-mono text-gray-500">SKU: {item.sku || '-'}</div>
                      <div className="mt-1 text-xs text-gray-400">Qtd: <strong className="text-gray-200">{item.quantity}</strong> × <Money value={item.unitPrice} lang={language} /></div>
                      {item.lots && item.lots.length > 0 && <div className="mt-1 text-[11px] font-mono text-emerald-300">Lote: {item.lots.map((lot: any) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")}</div>}
                    </div>
                    <div className="text-right text-sm font-bold text-brand-gold">
                      <Money value={item.totalPrice} lang={language} />
                    </div>
                  </div>
                </div>
              ))}
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/10 py-0">
              <CardContent className="p-3 text-sm">
              <div className="flex items-center justify-between font-bold">
                <span className="text-gray-200">Total da nota</span>
                <span className="text-lg text-brand-gold"><Money value={saleDetails.sale.totalAmount} lang={language} /></span>
              </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </Modal>

      {/* Receive Payment Modal — reformulado */}
      <Modal isOpen={!!isPaying} onClose={() => setIsPaying(null)} title="Receber Pagamento">
        {isPaying && (() => {
          const remaining = getRemainingUsd();
          const received = parseMoney(amountReceived);
          const rate = parseMoney(exchangeRate);
          const receivedBase = (currency !== "USD" && rate > 0) ? received / rate : received;
          const willApply = Math.min(receivedBase, remaining);
          const isPartial = receivedBase > MONEY_EPSILON && receivedBase < remaining - MONEY_EPSILON;
          const isFull = receivedBase >= remaining - MONEY_EPSILON;
          const change = receivedBase > remaining + MONEY_EPSILON ? receivedBase - remaining : 0;
          const restAfter = Math.max(0, remaining - willApply);
          const destAccount = accounts.find((a) => a.id === destAccountId);
          const needsProof = paymentMethod === "PIX" || paymentMethod === "TRANSFER";
          const methodLabel = ({ CASH: "Dinheiro", PIX: "PIX", DEBIT_CARD: "Cartão de débito", CREDIT_CARD: "Cartão de crédito", TRANSFER: "Transferência" } as Record<string, string>)[paymentMethod] || paymentMethod;
          const methods: Array<[string, string, any]> = [
            ["CASH", "Dinheiro", Wallet], ["PIX", "PIX", QrCode], ["DEBIT_CARD", "Débito", CreditCard],
            ["CREDIT_CARD", "Crédito", CreditCard], ["TRANSFER", "Transf.", ArrowLeftRight],
          ];
          const setTotal = () => setAmountReceived((currency !== "USD" && rate > 0 ? remaining * rate : remaining).toFixed(2));
          return (
          <div className="space-y-4">
             {/* Cabeçalho da venda */}
             <Card className="py-0">
               <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                   <div className="text-[11px] font-semibold text-brand-gold">Venda {isPaying.sale.series}-{String(isPaying.sale.number).padStart(6, '0')}</div>
                   <div className="text-white font-semibold truncate">{isPaying.sale.customerName || "Consumidor final"}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                   <div className="text-[11px] text-gray-400">Total da venda</div>
                   <div className="text-lg font-bold text-white"><Money value={isPaying.sale.totalAmount} lang={language} /></div>
                </div>
               </CardContent>
             </Card>

             {/* Resumo: pago / falta pagar (destaque) */}
             <div className="grid grid-cols-2 gap-3">
                <Card className="py-0">
                  <CardContent className="p-3">
                   <div className="text-[11px] text-gray-400 mb-0.5">Já pago</div>
                   <div className="text-emerald-400 font-bold"><Money value={amountAlreadyPaid} lang={language} /></div>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/30 bg-amber-500/10 py-0">
                  <CardContent className="p-3">
                   <div className="text-[11px] text-amber-300 mb-0.5">Falta pagar</div>
                   <div className="text-xl font-black text-amber-200"><Money value={remaining} lang={language} /></div>
                  </CardContent>
                </Card>
             </div>

             {(isPaying.sale.lotStatus === "PENDING" || isPaying.sale.lotStatus === "PARTIAL") && (
               <Card className="border-yellow-500/30 bg-yellow-500/10 py-0">
                 <CardContent className="p-3 text-xs text-yellow-200 flex items-start gap-2">
                 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> Venda com lote pendente. Pode cobrar agora e completar o lote depois em Vendas Realizadas.
                 </CardContent>
               </Card>
             )}

             {/* Alternar: pagamento único x dividido */}
             <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => { setSplitMode(!splitMode); setConfirmStep(false); if (!splitMode) setSplitLines([{ method: "CASH", amount: "" }]); }}>
               <ArrowLeftRight className="w-3.5 h-3.5" /> {splitMode ? "Voltar ao pagamento único" : "Dividir em várias formas (ex.: parte dinheiro, parte PIX)"}
             </Button>

             {splitMode ? (() => {
               const total = splitLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
               const rest = remaining - total;
               return (
                 <div className="space-y-3">
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dividir entre formas de pagamento</div>
                   {splitLines.map((line, i) => {
                     const acc = accountsForMethod(accounts, line.method)[0];
                     return (
                       <Card key={i} className="py-0">
                         <CardContent className="space-y-2 p-3">
                         <div className="flex gap-2">
                           <select value={line.method} onChange={(e) => { const v = [...splitLines]; v[i] = { ...v[i], method: e.target.value }; setSplitLines(v); }} className="flex-1 bg-[#171717] border border-gray-700 rounded-lg px-2 py-2 text-white text-sm outline-none focus:border-brand-gold">
                             <option value="CASH">Dinheiro</option><option value="PIX">PIX</option><option value="DEBIT_CARD">Débito</option><option value="CREDIT_CARD">Crédito</option><option value="TRANSFER">Transferência</option>
                           </select>
                           <input type="number" step="0.01" placeholder="0,00" value={line.amount} onChange={(e) => { const v = [...splitLines]; v[i] = { ...v[i], amount: e.target.value }; setSplitLines(v); }} className="w-28 bg-[#171717] border border-gray-700 rounded-lg px-2 py-2 text-white text-sm font-mono outline-none focus:border-brand-gold" />
                           {splitLines.length > 1 && <Button type="button" variant="destructive" size="icon-xs" onClick={() => setSplitLines(splitLines.filter((_, j) => j !== i))}><MinusCircle className="w-4 h-4" /></Button>}
                         </div>
                         <div className="text-[11px] text-gray-500">{acc ? `→ ${acc.name}${acc.type === "CARD_RECEIVABLE" ? " (a receber)" : ""}` : "⚠ sem conta p/ esta forma em Financeiro"}</div>
                         </CardContent>
                       </Card>
                     );
                   })}
                   <Button type="button" variant="link" size="xs" className="h-auto p-0 gap-1.5 text-sm font-semibold" onClick={() => setSplitLines([...splitLines, { method: "CASH", amount: "" }])}><PlusCircle className="w-4 h-4" /> Adicionar forma</Button>
                   <Card className="py-0">
                     <CardContent className="grid grid-cols-2 gap-y-1 p-3 text-sm">
                     <span className="text-gray-400">Falta pagar</span><span className="text-right text-white font-semibold"><Money value={remaining} lang={language} /></span>
                     <span className="text-gray-400">Somado</span><span className="text-right text-brand-gold font-bold"><Money value={total} lang={language} /></span>
                     <span className={rest < -0.01 ? "text-blue-300" : "text-amber-300"}>{rest < -0.01 ? "Troco" : "Restará"}</span><span className={`text-right font-semibold ${rest < -0.01 ? "text-blue-200" : "text-amber-200"}`}><Money value={Math.abs(rest)} lang={language} /></span>
                     </CardContent>
                   </Card>
                   <div className="flex gap-3 pt-1">
                     <Button variant="ghost" onClick={() => setSplitMode(false)}>Cancelar</Button>
                     <Button className="flex-1" onClick={handleSplitPayment} disabled={total <= 0}><CheckCircle2 className="w-5 h-5" /> Registrar {splitLines.filter((l) => Number(l.amount) > 0).length} pagamento(s) · <Money value={total} lang={language} /></Button>
                   </div>
                 </div>
               );
             })() : (<>
             {/* Método em botões */}
             <div>
               <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Forma de pagamento</label>
               <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                 {methods.map(([m, label, Icon]) => (
                   <Button key={m} type="button" variant={paymentMethod === m ? "default" : "outline"} className="flex-col gap-1 px-2 py-2.5 h-auto" onClick={() => handlePaymentMethodChange(m)}>
                     <Icon className="w-4 h-4" /> {label}
                   </Button>
                 ))}
               </div>
             </div>

             {/* Destino do dinheiro — para onde vai */}
             <div>
               <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Landmark className="w-3.5 h-3.5" /> Para onde vai o dinheiro</label>
               <select value={destAccountId} onChange={(e) => setDestAccountId(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-brand-gold">
                 <option value="">— escolher conta —</option>
                 {accountsForMethod(accounts, paymentMethod).map((a) => <option key={a.id} value={a.id}>{a.name}{a.type === "CARD_RECEIVABLE" ? " · CRÉDITO (a receber)" : ""}</option>)}
               </select>
               {accountsForMethod(accounts, paymentMethod).length === 0 ? (
                 <p className="mt-1 text-[11px] text-amber-300">Nenhuma conta do tipo certo para {paymentMethod === "CASH" ? "dinheiro" : paymentMethod === "CREDIT_CARD" ? "cartão de crédito (crie uma conta 'cartão a receber')" : "esta forma (crie uma conta banco)"} em Financeiro.</p>
               ) : !destAccountId ? (
                 <p className="mt-1 text-[11px] text-amber-300">Escolha a conta para rastrear onde o dinheiro caiu.</p>
               ) : destAccount?.type === "CARD_RECEIVABLE" ? (
                 <p className="mt-1 text-[11px] text-gray-500">Entra como "a receber": taxa {Number(destAccount.feePercent).toFixed(2)}% e prazo D+{destAccount.settlementDays}.</p>
               ) : (
                 <p className="mt-1 text-[11px] text-gray-500">O valor vai direto para <b className="text-gray-300">{destAccount?.name}</b>.</p>
               )}
             </div>

             {paymentMethod === "CASH" && (
               <div>
                 <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Moeda recebida</label>
                 <div className="grid grid-cols-3 gap-2">
                   {(["USD", "BRL", "USDT"] as const).map((cur) => (
                     <Button
                       key={cur}
                       type="button"
                       variant={currency === cur ? "default" : "outline"}
                       onClick={() => { setCurrency(cur); if (cur === "USD") setExchangeRate("1"); }}
                     >
                       {cur === "USD" ? "US$" : cur === "BRL" ? "R$" : "USDT"}
                     </Button>
                   ))}
                 </div>
               </div>
             )}

             {/* Valor a receber */}
             <div>
               <div className="flex items-center justify-between mb-1.5">
                 <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor recebido ({paymentMethod === "PIX" ? "R$" : (CURRENCY_SYMBOL[currency as keyof typeof CURRENCY_SYMBOL] || currencySymbol(currency))})</label>
                 <Button type="button" variant="link" size="xs" className="h-auto p-0 text-[11px] font-bold" onClick={setTotal}>Valor total</Button>
               </div>
               <input type="number" step="0.01" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-3 text-white text-lg font-bold font-mono outline-none focus:border-brand-gold" />
               {currency !== "USD" && paymentMethod !== "PIX" && (
                 <div className="mt-2 grid grid-cols-2 gap-2 items-center">
                   <input type="number" step="0.0001" disabled={currency === "USD"} value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="Cotação" className="bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-gray-300 font-mono text-sm disabled:opacity-50" />
                   <div className="text-right text-xs text-gray-400">≈ <Money value={receivedBase} lang={language} currencyOverride="USD" /></div>
                 </div>
               )}
               {/* Status: parcial / quita / troco */}
               <div className="mt-2">
                 {change > 0 ? (
                   <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 flex items-center justify-between">
                     <span>Troco a devolver</span><span className="font-bold"><Money value={change} lang={language} /></span>
                   </div>
                 ) : isPartial ? (
                   <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 flex items-center justify-between">
                     <span className="font-bold flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Pagamento PARCIAL</span>
                     <span>restará <b><Money value={restAfter} lang={language} /></b></span>
                   </div>
                 ) : isFull && received > 0 ? (
                   <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 flex items-center gap-1.5">
                     <CheckCircle2 className="w-4 h-4" /> Este valor quita a venda.
                   </div>
                 ) : null}
               </div>
             </div>

             {paymentMethod === "PIX" && (
               <Button type="button" className="w-full" onClick={openPixQr}>
                 <QrCode className="h-5 w-5" /> Gerar QR Code PIX
               </Button>
             )}

             {/* Comprovante — só quando precisa de confirmação do banco (PIX/Transferência) */}
             {needsProof && (
               <Card className="py-0">
                 <CardContent className="p-3">
                 <div className="text-xs font-semibold text-gray-300 mb-1">Comprovante do depósito</div>
                 <p className="text-[11px] text-gray-500 mb-2">O cliente enviou o comprovante? Anexe e mande pro seu banco/gateway confirmar que caiu.</p>
                 <PaymentProof
                   saleLabel={`Venda ${isPaying.sale.series}-${String(isPaying.sale.number).padStart(6, '0')}`}
                   amountLabel={`R$ ${willApply.toFixed(2)}`}
                   gatewayNumber={gatewayNumber}
                 />
                 </CardContent>
               </Card>
             )}

             <div>
               <label className="block text-[11px] text-gray-500 mb-1">Observação (opcional)</label>
               <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold text-sm" />
             </div>

             {confirmStep ? (
               <Card className="border-primary/40 bg-primary/10 py-0">
                 <CardContent className="space-y-3 p-4">
                 <div className="text-sm font-bold text-brand-gold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Confira antes de registrar</div>
                 <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                   <span className="text-gray-400">Forma</span><span className="text-white font-semibold text-right">{methodLabel}</span>
                   <span className="text-gray-400">Vai para</span><span className="text-white font-semibold text-right">{destAccount ? destAccount.name : "— sem conta —"}</span>
                   <span className="text-gray-400">Valor</span><span className="text-brand-gold font-bold text-right"><Money value={willApply} lang={language} /></span>
                   {isPartial && (<><span className="text-amber-300">Ficará faltando</span><span className="text-amber-200 font-semibold text-right"><Money value={restAfter} lang={language} /></span></>)}
                   {change > 0 && (<><span className="text-blue-300">Troco</span><span className="text-blue-200 font-semibold text-right"><Money value={change} lang={language} /></span></>)}
                 </div>
                 <div className="flex gap-3 pt-1">
                   <Button variant="ghost" onClick={() => setConfirmStep(false)} disabled={isSubmitting}>Voltar</Button>
                   <Button className="flex-1" onClick={handleReceivePayment} disabled={isSubmitting}>
                     <CheckCircle2 className="w-5 h-5" /> {isSubmitting ? "Registrando..." : "Confirmar recebimento"}
                   </Button>
                 </div>
                 </CardContent>
               </Card>
             ) : (
               <div className="flex gap-3 pt-1">
                 <Button variant="ghost" onClick={() => setIsPaying(null)}>Cancelar</Button>
                 <Button className="flex-1" onClick={() => { if (willApply > 0) setConfirmStep(true); }} disabled={willApply <= 0}>
                   <CheckCircle2 className="w-5 h-5" />
                   {isPartial ? "Revisar parcial" : "Revisar"} · <Money value={willApply} lang={language} />{destAccount ? ` → ${destAccount.name}` : ""}
                 </Button>
               </div>
             )}
             </>)}
          </div>
          );
        })()}
      </Modal>

      {/* PIX QR Modal - precisa renderizar por cima do modal de "Receber
          Pagamento" (linha ~1073) quando os dois estão abertos ao mesmo
          tempo. Modal.tsx usa z-50 fixo pros dois, sem prop de z-index — a
          ordem "por cima" hoje só existe porque este bloco vem DEPOIS do
          modal de pagamento no JSX (mesmo z-index empata por ordem no DOM).
          Se este `<Modal>` for movido pra antes do de pagamento, o PIX passa
          a ficar por baixo silenciosamente — manter nesta posição. */}
      <Modal isOpen={showPixModal} onClose={() => setShowPixModal(false)} title="QR Code PIX" maxWidth="max-w-md">
        <div className="space-y-4">
          {pixError ? (
            <Card className="border-red-500/30 bg-red-500/10 py-0">
              <CardContent className="p-3 text-red-300">{pixError}</CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-brand-gold/20 bg-[#171717] py-0">
                <CardContent className="p-3 text-center">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Valor PIX</div>
                  <div className="text-2xl font-bold text-brand-gold">R$ {parseMoney(amountReceived).toFixed(2)}</div>
                </CardContent>
              </Card>
              <div className="flex justify-center rounded-xl bg-white p-4">
                <img
                  alt="QR Code PIX"
                  className="h-64 w-64"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pixPayload)}`}
                />
              </div>
              <textarea readOnly value={pixPayload} className="h-24 w-full rounded-lg border border-gray-700 bg-[#171717] p-3 text-xs text-gray-300" />
              <Button type="button" variant="outline" className="w-full" onClick={() => navigator.clipboard?.writeText(pixPayload)}>
                <Copy className="h-4 w-4" /> Copiar código PIX
              </Button>
            </>
          )}
          <Button type="button" className="w-full" onClick={() => setShowPixModal(false)}>Fechar QR Code</Button>
        </div>
      </Modal>

      {receiptSale && (
        <ReceiptModal 
           saleId={receiptSale.id} 
           saleNumber={receiptSale.number} 
           onClose={() => setReceiptSale(null)} 
        />
      )}

      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        maxWidth="max-w-sm"
        title={
          <span className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Cancelar Venda
          </span>
        }
      >
        <div className="flex flex-col gap-4">
           {cancelError && (
             <Card className="border-red-500/30 bg-red-500/10 py-0">
               <CardContent className="p-3 text-red-300 text-xs font-bold">{cancelError}</CardContent>
             </Card>
           )}

           <div className="text-sm text-gray-300">
             Esta ação reverterá todo o processo da venda.
           </div>

           <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Motivo do cancelamento (Obrigatório)</label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Motivo detalhado..." className="w-full bg-brand-navylight border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-gold outline-none min-h-[80px]" />
           </div>

           <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={cancelConfirm} onChange={(e) => setCancelConfirm(e.target.checked)} className="mt-1 bg-brand-navylight border-gray-700 rounded text-brand-gold focus:ring-offset-brand-navy focus:ring-brand-gold" />
              <span className="text-xs text-gray-400 select-none">Confirmo que quero cancelar esta venda e reverter o estoque. Se houver pagamento registrado, será necessário reembolso.</span>
           </label>

           <div className="flex gap-2 justify-end pt-2 border-t border-gray-800">
              <Button variant="ghost" onClick={() => setCancelModal(null)} disabled={cancelLoading}>Fechar</Button>
              <Button variant="destructive" onClick={handleCancelSale} disabled={!cancelReason || !cancelConfirm || cancelLoading}>Confirmar Cancelamento</Button>
           </div>
        </div>
      </Modal>

      {/* Recebimento avulso (sem venda) */}
      <Modal isOpen={showMisc} onClose={() => setShowMisc(false)} title="Recebimento avulso (sem venda)">
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Registrar uma entrada que não está ligada a uma venda (ex.: adiantamento, acerto, venda fora do sistema).</p>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Forma</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {([["CASH", "Dinheiro", Wallet], ["PIX", "PIX", QrCode], ["DEBIT_CARD", "Débito", CreditCard], ["CREDIT_CARD", "Crédito", CreditCard], ["TRANSFER", "Transf.", ArrowLeftRight]] as Array<[string, string, any]>).map(([m, label, Icon]) => (
                <Button key={m} type="button" variant={miscForm.method === m ? "default" : "outline"} className="flex-col gap-1 px-2 py-2.5 h-auto" onClick={() => setMiscForm({ ...miscForm, method: m })}>
                  <Icon className="w-4 h-4" /> {label}
                </Button>
              ))}
            </div>
            {(() => { const acc = accountsForMethod(accounts, miscForm.method)[0]; return <p className="mt-1.5 text-[11px] text-gray-500">{acc ? <>Vai para <b className="text-gray-300">{acc.name}</b>{acc.type === "CARD_RECEIVABLE" ? " (a receber)" : ""}.</> : <span className="text-amber-300">Sem conta p/ esta forma — crie em Financeiro.</span>}</p>; })()}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Valor</label>
            <input type="number" step="0.01" placeholder="0,00" value={miscForm.amount} onChange={(e) => setMiscForm({ ...miscForm, amount: e.target.value })} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-3 text-white text-xl font-mono outline-none focus:border-brand-gold" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Descrição</label>
            <input type="text" value={miscForm.description} onChange={(e) => setMiscForm({ ...miscForm, description: e.target.value })} placeholder="Motivo do recebimento" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="ghost" onClick={() => setShowMisc(false)}>Cancelar</Button>
            <Button onClick={handleMiscReceipt} disabled={!(Number(miscForm.amount) > 0)}>Registrar entrada</Button>
          </div>
        </div>
      </Modal>

      {/* Histórico de caixas fechados */}
      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Histórico de caixas fechados">
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">Nenhum caixa fechado ainda.</div>
          ) : (
            <Card className="max-h-[60vh] overflow-y-auto rounded-lg py-0">
              <CardContent className="divide-y divide-gray-800 p-0">
              {history.map((h) => {
                const diff = Number(h.differenceAmountUsd || 0);
                return (
                  <Button key={h.id} type="button" variant="ghost" className="h-auto w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-brand-navy/50" onClick={() => openReport(h.id)}>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{h.userName || "—"}</div>
                      <div className="text-[11px] text-gray-500">{h.closedAt ? new Date(h.closedAt).toLocaleString("pt-BR") : "—"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400">Declarado <span className="text-gray-200 font-semibold"><Money value={Number(h.declaredClosingAmountUsd || 0)} lang={language} /></span></div>
                      <div className={`text-[11px] font-bold ${Math.abs(diff) < 0.01 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-brand-gold"}`}>Dif: <Money value={diff} lang={language} /></div>
                    </div>
                  </Button>
                );
              })}
              </CardContent>
            </Card>
          )}
          <div className="flex justify-end pt-2"><Button variant="ghost" onClick={() => setShowHistory(false)}>Fechar</Button></div>
        </div>
      </Modal>

      {/* Relatório de fechamento (imprimível) */}
      <Modal isOpen={!!reportData} onClose={() => setReportData(null)} title="Relatório de fechamento">
        {reportData && (() => {
          const r = reportData.register, s = reportData.summary;
          const diff = Number(s.difference || 0);
          const rowsData: Array<[string, number, string]> = [
            ["Saldo inicial", Number(s.opening), "text-gray-200"],
            ["Recebido em dinheiro", Number(s.salesCash), "text-emerald-400"],
            ["Suprimentos", Number(s.supplies), "text-emerald-400"],
            ["Sangrias", -Math.abs(Number(s.withdrawals) || 0), "text-red-400"],
            ["Estornos", -Math.abs(Number(s.refunds) || 0), "text-red-400"],
          ];
          return (
            <div className="space-y-4">
              <Card className="py-0">
                <CardContent className="flex justify-between p-3 text-xs text-gray-400">
                  <span>Operador: <b className="text-gray-200">{r.userName || "—"}</b></span>
                  <span>{r.closedAt ? new Date(r.closedAt).toLocaleString("pt-BR") : "—"}</span>
                </CardContent>
              </Card>
              <Card className="py-0">
                <CardContent className="space-y-2 p-4 text-sm">
                  {rowsData.map(([k, v, c]) => (
                    <div key={k} className="flex justify-between"><span className="text-gray-400">{k}</span><span className={`font-semibold ${c}`}><Money value={v} lang={language} /></span></div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-800"><span className="text-gray-300 font-semibold">Esperado (dinheiro)</span><span className="text-white font-bold"><Money value={Number(s.expected)} lang={language} /></span></div>
                  <div className="flex justify-between"><span className="text-gray-300 font-semibold">Declarado (contado)</span><span className="text-white font-bold"><Money value={Number(s.declared)} lang={language} /></span></div>
                  <div className={`flex justify-between pt-2 border-t border-gray-800 text-base font-black ${Math.abs(diff) < 0.01 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-brand-gold"}`}>
                    <span>{Math.abs(diff) < 0.01 ? "Bateu certinho" : diff < 0 ? "Faltou" : "Sobrou"}</span><span><Money value={diff} lang={language} /></span>
                  </div>
                </CardContent>
              </Card>
              <p className="text-[11px] text-gray-500">Só dinheiro. PIX/cartão/transferência são acompanhados no módulo Financeiro.</p>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                <Button variant="ghost" onClick={() => setReportData(null)}>Fechar</Button>
                <Button onClick={printReport}><Printer className="w-4 h-4" /> Imprimir</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
