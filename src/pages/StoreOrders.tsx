import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Store, RefreshCw, ExternalLink, FileText, CheckCircle2, XCircle, Clock, Truck, Package, Copy, Check, Split,
  IdCard, ShieldCheck, FileDown, AlertTriangle, PackageCheck, Receipt, QrCode, CircleDollarSign
} from "lucide-react";
import { formatCpf as fmtCpf } from "../lib/cpf";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// Aparelho legível a partir do user-agent (só pra leitura humana na contestação).
const deviceOf = (ua: string) => {
  const s = String(ua);
  const os = /iPhone|iPad/i.test(s) ? "iPhone/iPad" : /Android/i.test(s) ? "Android" : /Windows/i.test(s) ? "Windows" : /Mac OS/i.test(s) ? "Mac" : "outro";
  const br = /Edg\//i.test(s) ? "Edge" : /Chrome\//i.test(s) ? "Chrome" : /Firefox\//i.test(s) ? "Firefox" : /Safari\//i.test(s) ? "Safari" : "navegador";
  return `${os} · ${br}`;
};
import { apiFetch } from "../lib/api";
import { Modal } from "../components/Modal";
import { toast } from "../components/Toast";
import { format } from "date-fns";
import { formatBrl as brl, MONEY_EPSILON } from "../lib/money";

const ST: Record<string, { label: string; cls: string; icon: any }> = {
  AWAITING_PAYMENT: { label: "Aguardando pagamento", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300", icon: Clock },
  PROOF_SENT: { label: "Comprovante enviado", cls: "border-blue-500/30 bg-blue-500/10 text-blue-300", icon: FileText },
  CONFIRMED: { label: "Confirmado", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", icon: CheckCircle2 },
  CANCELED: { label: "Cancelado", cls: "border-red-500/30 bg-red-500/10 text-red-300", icon: XCircle },
};

// Painel dos pedidos vindos da loja online: confere comprovante, confirma ou cancela.
export function StoreOrders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [confirmForm, setConfirmForm] = useState<any>({ receivedAmount: "", payerName: "", force: false });
  const [purgeTarget, setPurgeTarget] = useState<any>(null);
  const [purgePassword, setPurgePassword] = useState("");

  const load = async (status = filter) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/store/admin/orders${status ? `?status=${status}` : ""}`);
      if (res.ok) { const j = await res.json(); setRows(j.data || []); setCounts(j.counts || {}); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Mesmo motivo do polling no Caixa: sem isso, cancelar/pagar uma venda por
  // lá nunca aparecia aqui (nem o contrário) sem recarregar a página na mão.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load(filter);
    }, 25000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [filter]);

  // Pedido pago em 2+ PIX: abre a primeira parte com comprovante e lista as outras.
  const openProof = async (o: any) => {
    const partsRes = await apiFetch(`/api/store/admin/orders/${o.id}/payments`);
    const parts = partsRes.ok ? ((await partsRes.json()).data || []) : [];
    if (parts.length > 0) {
      const withProof = parts.filter((p: any) => p.hasProof);
      if (withProof.length === 0) { toast.error("Nenhuma parte deste pedido tem comprovante ainda."); return; }
      await openPartProof(o, withProof[0], parts);
      return;
    }
    const res = await apiFetch(`/api/store/admin/orders/${o.id}/proof`);
    if (res.ok) { const j = await res.json(); setProof({ order: o, data: j.data, type: j.fileType, parts: [], partSeq: null }); }
    else toast.error("Este pedido não tem comprovante.");
  };

  const openPartProof = async (o: any, part: any, parts: any[]) => {
    const res = await apiFetch(`/api/store/admin/orders/${o.id}/payments/${part.id}/proof`);
    if (res.ok) { const j = await res.json(); setProof({ order: o, data: j.data, type: j.fileType, parts, partSeq: part.seq, partAmount: j.amount }); }
    else toast.error("Esta parte não tem comprovante.");
  };

  // O PDF vem por rota autenticada — baixa via fetch com token e salva o arquivo.
  const baixarDossie = async (o: any) => {
    try {
      const res = await apiFetch(`/api/store/admin/orders/${o.id}/dossier`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `dossie_${o.code}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { toast.error("Não foi possível gerar o dossiê."); }
  };

  // Confere o dinheiro antes de dar OK: valor que caiu na conta + titular que pagou.
  const confirm = (o: any) => {
    setConfirmTarget(o);
    setConfirmForm({ receivedAmount: String(Number(o.totalAmount).toFixed(2)), payerName: "", force: false });
  };

  const doConfirm = async () => {
    const o = confirmTarget;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/store/admin/orders/${o.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ receivedAmount: confirmForm.receivedAmount, payerName: confirmForm.payerName, force: confirmForm.force }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(j.missing > 0 ? `Confirmado com falta de ${brl(j.missing)} registrada.` : "Pedido confirmado — valor bateu.");
        setConfirmTarget(null); setProof(null); load();
      } else if (j.code === "AMOUNT_MISMATCH") {
        // Servidor barrou: mostra a diferença e exige aceite explícito.
        setConfirmForm((f: any) => ({ ...f, mismatch: j }));
      } else toast.error(j.error || "Erro ao confirmar.");
    } finally { setBusy(false); }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/store/admin/orders/${cancelTarget.id}/cancel`, { method: "POST", body: JSON.stringify({ reason: cancelReason }) });
      if (res.ok) { toast.success("Pedido cancelado e estoque liberado."); setCancelTarget(null); setCancelReason(""); load(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Erro ao cancelar."); }
    } finally { setBusy(false); }
  };

  const doPurge = async () => {
    if (!purgeTarget) return;
    if (!purgePassword) { toast.error("Digite a senha do Master."); return; }
    setBusy(true);
    try {
      const res = await apiFetch(`/api/store/admin/orders/${purgeTarget.id}/purge`, { method: "POST", body: JSON.stringify({ masterPassword: purgePassword }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(j.reversedAmount > 0.01 ? `Excluído — R$ ${Number(j.reversedAmount).toFixed(2)} estornado antes de apagar.` : "Pedido excluído.");
        setPurgeTarget(null); setPurgePassword(""); load();
      } else toast.error(j.error || "Erro ao excluir.");
    } finally { setBusy(false); }
  };

  const storeUrl = `${window.location.origin}/loja`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-white"><Store className="h-6 w-6 text-brand-gold" /> Pedidos da Loja</h2>
          <p className="text-sm text-gray-400">Pedidos feitos no site. Confira o comprovante, confirme e registre o recebimento no Caixa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(storeUrl); setCopied("url"); setTimeout(() => setCopied(""), 1800); }}
            className="h-auto gap-2 rounded-lg border-gray-800 bg-brand-navylight px-3 py-2 has-[>svg]:px-3 text-xs font-normal text-gray-300 transition hover:border-brand-gold hover:bg-brand-navylight hover:text-gray-300 dark:border-gray-800 dark:bg-brand-navylight dark:hover:bg-brand-navylight dark:hover:border-brand-gold">
            {copied === "url" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />} Copiar link da loja
          </Button>
          <Button asChild variant="outline" className="h-auto gap-2 rounded-lg border-gray-800 bg-brand-navylight px-3 py-2 has-[>svg]:px-3 text-xs font-normal text-gray-300 transition hover:border-brand-gold hover:bg-brand-navylight hover:text-gray-300 dark:border-gray-800 dark:bg-brand-navylight dark:hover:bg-brand-navylight dark:hover:border-brand-gold">
            <a href="/loja" target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> Abrir loja
            </a>
          </Button>
          <Button variant="outline" onClick={() => load()} aria-label="Recarregar pedidos"
            className="h-auto gap-2 rounded-lg border-gray-800 bg-brand-navylight px-3 py-2 has-[>svg]:px-3 font-normal text-gray-300 hover:bg-brand-navylight hover:text-gray-300 hover:border-brand-gold dark:border-gray-800 dark:bg-brand-navylight dark:hover:bg-brand-navylight dark:hover:border-brand-gold">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="gap-0 rounded-2xl border-gray-800 bg-[#171717] p-4 shadow-none space-y-4">
      {/* Filtros por situação */}
      <div className="flex flex-wrap gap-2">
        {[["", "Todos"], ["AWAITING_PAYMENT", "Aguardando"], ["PROOF_SENT", "Comprovante"], ["CONFIRMED", "Confirmados"], ["CANCELED", "Cancelados"]].map(([v, l]) => (
          <Button key={v} variant="outline" onClick={() => { setFilter(v); load(v); }}
            className={`h-auto rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === v ? "border-brand-gold bg-brand-gold/15 text-brand-gold hover:bg-brand-gold/15 hover:text-brand-gold dark:border-brand-gold dark:bg-brand-gold/15 dark:hover:bg-brand-gold/15" : "border-gray-700 bg-brand-navylight text-gray-400 hover:text-white hover:bg-brand-navylight dark:border-gray-700 dark:bg-brand-navylight dark:hover:bg-brand-navylight"}`}>
            {l}{v && counts[v] ? ` (${counts[v]})` : ""}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-brand-navylight py-16 text-center text-gray-500">
          <Store className="mx-auto mb-3 h-10 w-10 opacity-30" />
          {loading ? "Carregando..." : "Nenhum pedido nesta situação."}
          <div className="mt-2 text-xs">Compartilhe o link da loja para começar a receber pedidos.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 border-t border-gray-800 pt-4 lg:grid-cols-2">
          {rows.map((o) => {
            const s = ST[o.status] || ST.AWAITING_PAYMENT;
            const SIcon = s.icon;
            return (
              <Card key={o.id} className="gap-0 rounded-xl border-gray-700 bg-brand-navylight p-4 shadow-md">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-brand-gold">{o.code}</span>
                      <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${s.cls}`}>
                        <SIcon className="h-3 w-3" /> {s.label}
                      </Badge>
                      <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${o.paymentMethod === "USDT" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-violet-500/30 bg-violet-500/10 text-violet-300"}`}>
                        {o.paymentMethod === "USDT" ? <CircleDollarSign className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
                        {o.paymentMethod === "USDT" ? "USDT" : "PIX"}
                      </Badge>
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-white">{o.customerName}</div>
                    <div className="text-[11px] text-gray-500">
                      {o.customerPhone} · {o.createdAt ? format(new Date(o.createdAt), "dd/MM HH:mm") : ""}
                      {o.saleNumber ? ` · venda ${o.saleSeries}-${String(o.saleNumber).padStart(6, "0")}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-black text-white">{brl(o.totalAmount)}</div>
                    <div className={`text-[10px] font-bold ${o.salePaymentStatus === "PAID" ? "text-emerald-400" : "text-gray-500"}`}>
                      {o.salePaymentStatus === "PAID" ? "pago no caixa" : "não recebido"}
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-400">
                  {o.deliveryType === "DELIVERY" ? (
                    <>
                      <Truck className="h-3.5 w-3.5" /> 
                      <span className="truncate">
                        {o.cep ? `${o.street || o.address}, ${o.number} - ${o.neighborhood} - ${o.city}/${o.state} (${o.cep})` : o.address}
                        {o.shippingMethod ? ` [${o.shippingMethod}]` : ''}
                      </span>
                    </>
                  ) : (
                    <><Package className="h-3.5 w-3.5" /> Retirada no local</>
                  )}
                </div>

                {/* Identificação do comprador e prova de aceite (defesa em contestação) */}
                <div className="mb-3 space-y-1 rounded-lg border border-gray-800 bg-brand-navy/40 p-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <IdCard className="h-3.5 w-3.5 shrink-0 text-brand-gold" />
                    {o.customerDocument
                      ? <span className="font-mono">CPF {fmtCpf(o.customerDocument)}</span>
                      : <span className="text-amber-300">sem CPF (pedido antigo)</span>}
                    {o.customerId && (
                      <Button variant="link" onClick={() => navigate(`/customers?search=${encodeURIComponent(o.customerDocument || o.customerName)}`)}
                        className="ml-auto h-auto p-0 text-[11px] font-normal text-brand-gold">ver cliente</Button>
                    )}
                  </div>
                  {o.receivedAmountBrl != null && (
                    <div className={`flex items-center gap-1.5 ${Number(o.totalAmount) - Number(o.receivedAmountBrl) > MONEY_EPSILON ? "text-red-300" : "text-emerald-300"}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Conferido: recebido {brl(o.receivedAmountBrl)}
                        {Number(o.totalAmount) - Number(o.receivedAmountBrl) > MONEY_EPSILON
                          ? ` · FALTOU ${brl(Number(o.totalAmount) - Number(o.receivedAmountBrl))}`
                          : " · valor bateu"}
                        {o.payerName ? ` · pagou: ${o.payerName}` : ""}
                      </span>
                    </div>
                  )}
                  {o.deliveryConfirmedAt && (
                    <div className="flex items-center gap-1.5 text-emerald-300">
                      <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                      Cliente confirmou o recebimento em {format(new Date(o.deliveryConfirmedAt), "dd/MM/yyyy HH:mm")}
                    </div>
                  )}
                  {o.termsAcceptedAt ? (
                    <div className="flex items-start gap-1.5 text-gray-500">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        Termos v{o.termsVersion} aceitos em {format(new Date(o.termsAcceptedAt), "dd/MM/yyyy HH:mm")}
                        {o.clientIp ? ` · IP ${o.clientIp}` : ""}
                        {o.clientUserAgent ? ` · ${deviceOf(o.clientUserAgent)}` : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="text-gray-600">sem registro de aceite (pedido anterior a esta versão)</div>
                  )}
                </div>
                {o.notes && <div className="mb-3 rounded-lg border border-gray-800 bg-brand-navy/40 p-2 text-[11px] text-gray-400">"{o.notes}"</div>}

                {o.partsTotal > 0 && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-200">
                    <Split className="h-3.5 w-3.5 shrink-0" />
                    Pagamento em {o.partsTotal} PIX · {o.partsWithProof} de {o.partsTotal} comprovante(s) recebido(s)
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {o.paymentMethod !== "USDT" && (o.proofFileName || o.partsWithProof > 0) && (
                    <Button variant="outline" onClick={() => openProof(o)} className="h-auto gap-1.5 rounded-lg px-3 py-1.5 has-[>svg]:px-3 text-xs font-medium border-blue-500/30 bg-blue-500/10 text-blue-300 transition hover:bg-blue-500/20 hover:text-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/20">
                      <FileText className="size-3.5" /> Ver comprovante{o.partsWithProof > 1 ? "s" : ""}
                    </Button>
                  )}
                  {/* Botão de NFe (Fase 4 - Mock) */}
                  {o.status === "CONFIRMED" && o.nfeStatus !== "ISSUED" && (
                    <Button variant="outline" onClick={() => {
                      toast.success("Integração de NFe pronta! Só falta conectar à API (ex: Bling ou Focus NFe).");
                    }} className="h-auto gap-1.5 rounded-lg px-3 py-1.5 has-[>svg]:px-3 text-xs font-bold border-purple-500/30 bg-purple-500/10 text-purple-300 transition hover:bg-purple-500/20 hover:text-purple-300 dark:border-purple-500/30 dark:bg-purple-500/10 dark:hover:bg-purple-500/20">
                      <Receipt className="size-3.5" /> Emitir NF-e
                    </Button>
                  )}
                  {o.nfeStatus === "ISSUED" && (
                    <Button variant="outline" onClick={() => window.open(o.nfeUrl, "_blank")} className="h-auto gap-1.5 rounded-lg px-3 py-1.5 has-[>svg]:px-3 text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition hover:bg-emerald-500/20 hover:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20">
                      <Receipt className="size-3.5" /> NF-e Emitida
                    </Button>
                  )}
                  {o.status !== "CONFIRMED" && o.status !== "CANCELED" && (
                    <Button onClick={() => confirm(o)} disabled={busy} className="h-auto gap-1.5 rounded-lg px-3 py-1.5 has-[>svg]:px-3 text-xs font-bold bg-emerald-500/90 text-white transition hover:bg-emerald-500">
                      <CheckCircle2 className="size-3.5" /> Conferir e confirmar
                    </Button>
                  )}
                  <Button asChild variant="outline" className="h-auto gap-1.5 rounded-lg px-3 py-1.5 has-[>svg]:px-3 text-xs font-medium border-gray-700 bg-transparent text-gray-300 transition hover:border-brand-gold hover:text-brand-gold hover:bg-transparent dark:border-gray-700 dark:bg-transparent dark:hover:bg-transparent">
                    <a href={`/api/store/admin/orders/${o.id}/dossier`} target="_blank" rel="noreferrer"
                      onClick={(e) => { e.preventDefault(); baixarDossie(o); }}>
                      <FileDown className="size-3.5" /> Dossiê (PDF)
                    </a>
                  </Button>
                  {o.saleId && o.status !== "CANCELED" && (
                    <Button variant="outline" onClick={() => navigate("/cash")} className="h-auto gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border-brand-gold/40 bg-brand-gold/10 text-brand-gold transition hover:bg-brand-gold/20 hover:text-brand-gold dark:border-brand-gold/40 dark:bg-brand-gold/10 dark:hover:bg-brand-gold/20">
                      Receber no Caixa
                    </Button>
                  )}
                  {o.status !== "CANCELED" && (
                    <Button variant="outline" onClick={() => { setCancelTarget(o); setCancelReason(""); }} className="ml-auto h-auto gap-1.5 rounded-lg px-3 py-1.5 has-[>svg]:px-3 text-xs font-normal border-red-500/30 bg-transparent text-red-400 transition hover:bg-red-500/10 hover:text-red-400 dark:border-red-500/30 dark:bg-transparent dark:hover:bg-red-500/10">
                      <XCircle className="size-3.5" /> Cancelar
                    </Button>
                  )}
                  {o.status === "CANCELED" && (
                    <Button variant="outline" onClick={() => { setPurgeTarget(o); setPurgePassword(""); }} className="ml-auto h-auto gap-1.5 rounded-lg px-3 py-1.5 has-[>svg]:px-3 text-xs font-normal border-red-500/30 bg-transparent text-red-400 transition hover:bg-red-500/10 hover:text-red-400 dark:border-red-500/30 dark:bg-transparent dark:hover:bg-red-500/10">
                      <XCircle className="size-3.5" /> Excluir (Master)
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </Card>

      {/* Comprovante */}
      <Modal isOpen={!!proof} onClose={() => setProof(null)} title={`Comprovante — ${proof?.order?.code || ""}`}>
        {proof && (
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-800 bg-[#171717] p-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Cliente</span><span className="font-medium text-white">{proof.order.customerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Valor do pedido</span><span className="font-bold text-brand-gold">{brl(proof.order.totalAmount)}</span></div>
              {proof.partSeq != null && (
                <div className="flex justify-between"><span className="text-gray-400">Vendo</span><span className="font-medium text-white">{proof.partSeq}ª parte · {brl(proof.partAmount)}</span></div>
              )}
            </div>

            {/* Pedido pago em partes: alterna entre os comprovantes */}
            {proof.parts?.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs text-gray-400">
                  Pago em {proof.parts.length} PIX · {proof.parts.filter((p: any) => p.hasProof).length} comprovante(s) recebido(s)
                </div>
                <div className="flex flex-wrap gap-2">
                  {proof.parts.map((p: any) => (
                    <Button key={p.id} variant="outline" disabled={!p.hasProof}
                      onClick={() => openPartProof(proof.order, p, proof.parts)}
                      className={`h-auto rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-100 ${
                        p.seq === proof.partSeq ? "border-brand-gold bg-brand-gold text-brand-navydark hover:bg-brand-gold hover:text-brand-navydark dark:border-brand-gold dark:bg-brand-gold dark:hover:bg-brand-gold"
                        : p.hasProof ? "border-gray-700 bg-[#171717] text-gray-300 hover:bg-[#171717] hover:text-gray-300 hover:border-brand-gold dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-[#171717]"
                        : "border-gray-800 bg-[#171717] text-gray-600 hover:bg-[#171717] hover:text-gray-600 dark:border-gray-800 dark:bg-[#171717] dark:hover:bg-[#171717]"}`}>
                      {p.seq}ª · {brl(p.amount)} {p.hasProof ? "" : "(sem comprovante)"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-[55vh] overflow-auto rounded-lg border border-gray-800 bg-white">
              {proof.type?.includes("pdf")
                ? <iframe title="comprovante" src={`data:application/pdf;base64,${proof.data}`} className="h-[55vh] w-full" />
                : <img alt="Comprovante" src={`data:${proof.type};base64,${proof.data}`} className="w-full" />}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProof(null)}
                className="rounded-lg border-gray-700 px-4 py-2 text-sm font-normal text-gray-300 bg-transparent hover:bg-transparent hover:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-transparent">Fechar</Button>
              {proof.order.status !== "CONFIRMED" && (
                <Button onClick={() => confirm(proof.order)} disabled={busy}
                  className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-500">Confirmar pagamento</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Conferência do dinheiro antes de confirmar */}
      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title={`Conferir pagamento — ${confirmTarget?.code || ""}`}>
        {confirmTarget && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-800 bg-[#171717] p-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Cliente</span><span className="font-medium text-white">{confirmTarget.customerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Valor do pedido</span><span className="font-bold text-brand-gold">{brl(confirmTarget.totalAmount)}</span></div>
              {confirmTarget.partsTotal > 0 && (
                <div className="flex justify-between"><span className="text-gray-400">Pago em</span><span className="text-white">{confirmTarget.partsTotal} PIX</span></div>
              )}
            </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">{confirmTarget.paymentMethod === "USDT" ? "Qual valor equivalente em R$ foi recebido? *" : "Quanto caiu na conta PIX? *"}</label>
              <input type="number" step="0.01" min="0" value={confirmForm.receivedAmount}
                onChange={(e) => setConfirmForm({ ...confirmForm, receivedAmount: e.target.value, force: false, mismatch: null })}
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 font-mono text-white outline-none focus:border-brand-gold" />
              <p className="mt-1 text-[11px] text-gray-500">Já vem com o valor do pedido em Real. Só mude se o valor recebido foi diferente.</p>
            </div>

            <div className={`rounded-lg border p-2.5 text-[11px] ${confirmTarget.payerIsBuyer === false ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-gray-800 bg-brand-navy/40 text-gray-400"}`}>
              {confirmTarget.paymentMethod === "USDT"
                ? <>Pagamento em <b>USDT</b> combinado pelo WhatsApp. Confirme a rede, o endereço da carteira e o valor efetivamente recebido antes de liberar.</>
                : confirmTarget.payerIsBuyer === false
                ? <>No pedido, o cliente declarou que <b>quem paga é {confirmTarget.payerDeclaredName}</b> (CPF {fmtCpf(confirmTarget.payerDeclaredCpf)}) — terceiro autorizado. O comprovante deve vir nesse nome.</>
                : <>No pedido, o cliente declarou que <b>ele mesmo</b> ({confirmTarget.customerName}) faria o pagamento.</>}
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">{confirmTarget.paymentMethod === "USDT" ? "Responsável pelo pagamento" : "Titular que pagou (como aparece no comprovante)"}</label>
              <input value={confirmForm.payerName} onChange={(e) => setConfirmForm({ ...confirmForm, payerName: e.target.value })}
                placeholder={confirmTarget.payerIsBuyer === false ? confirmTarget.payerDeclaredName : confirmTarget.customerName}
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold" />
              {(() => {
                const digitado = String(confirmForm.payerName || "").trim();
                if (!digitado) return <p className="mt-1 text-[11px] text-gray-500">Compare com o nome esperado acima. Deixe vazio se não souber.</p>;
                const esperado = String(confirmTarget.payerIsBuyer === false ? confirmTarget.payerDeclaredName : confirmTarget.customerName || "");
                const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
                const bate = norm(digitado) === norm(esperado);
                return bate
                  ? <p className="mt-1 text-[11px] text-emerald-300">Confere com quem o cliente declarou.</p>
                  : <p className="mt-1 text-[11px] text-amber-300">Nome diferente do declarado ({esperado || "—"}). Vale confirmar com o cliente antes de liberar.</p>;
              })()}
            </div>

            {confirmForm.mismatch && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div className="text-sm text-red-200">
                    <div className="font-bold">Faltou dinheiro: {brl(confirmForm.mismatch.missing)}</div>
                    <div className="text-xs text-red-200/80">Recebido {brl(confirmForm.mismatch.received)} de {brl(confirmForm.mismatch.total)}.</div>
                  </div>
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-red-100">
                  <input type="checkbox" checked={!!confirmForm.force} onChange={(e) => setConfirmForm({ ...confirmForm, force: e.target.checked })} className="accent-red-400" />
                  Confirmar mesmo assim (a diferença fica registrada no pedido)
                </label>
              </div>
            )}

            <p className="text-[11px] text-gray-500">
              Lembre: o recebimento em si continua sendo lançado no Caixa (venda {confirmTarget.saleSeries}-{confirmTarget.saleNumber}).
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmTarget(null)}
                className="rounded-lg border-gray-700 px-4 py-2 text-sm font-normal text-gray-300 bg-transparent hover:bg-transparent hover:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-transparent">Cancelar</Button>
              <Button onClick={doConfirm} disabled={busy || (confirmForm.mismatch && !confirmForm.force)}
                className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-500">
                {busy ? "Confirmando..." : "Confirmar pagamento"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancelar */}
      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar pedido">
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Cancelar o pedido <b className="font-mono text-brand-gold">{cancelTarget.code}</b> de {cancelTarget.customerName}?
              O estoque reservado volta a ficar disponível e a venda é cancelada.
            </p>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Motivo</label>
              <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex.: cliente desistiu, pagamento não caiu"
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelTarget(null)}
                className="rounded-lg border-gray-700 px-4 py-2 text-sm font-normal text-gray-300 bg-transparent hover:bg-transparent hover:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-transparent">Voltar</Button>
              <Button onClick={doCancel} disabled={busy}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500">Cancelar pedido</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Excluir por completo (Master) */}
      <Modal isOpen={!!purgeTarget} onClose={() => { setPurgeTarget(null); setPurgePassword(""); }} title="Excluir pedido definitivamente">
        {purgeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Apaga por completo o pedido <b className="font-mono text-brand-gold">{purgeTarget.code}</b> e a venda ligada a ele.
              Se ainda sobrou algum lançamento sem estornar numa conta financeira, ele é estornado automaticamente antes de apagar.
              <b className="text-red-400"> Não tem como desfazer.</b> Use só pra pedido cancelado que ficou preso sem nenhuma ação possível.
            </p>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Senha do Master (obrigatória)</label>
              <input type="password" value={purgePassword} onChange={(e) => setPurgePassword(e.target.value)} placeholder="Senha de login do usuário Master"
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2 text-white outline-none focus:border-brand-gold" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setPurgeTarget(null); setPurgePassword(""); }}
                className="rounded-lg border-gray-700 px-4 py-2 text-sm font-normal text-gray-300 bg-transparent hover:bg-transparent hover:text-gray-300 dark:bg-transparent dark:border-gray-700 dark:hover:bg-transparent">Voltar</Button>
              <Button onClick={doPurge} disabled={busy}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500">Excluir definitivamente</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
