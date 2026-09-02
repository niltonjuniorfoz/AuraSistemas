import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Copy, Check, Loader2, Upload, MessageCircle, Clock, CheckCircle2, XCircle, FileText, ArrowLeft, QrCode,
  Split, AlertTriangle, KeyRound, PackageCheck,
} from "lucide-react";
import QRCode from "qrcode";
import { formatBrl } from "../../lib/money";

const statusIcons: Record<string, any> = {
  AWAITING_PAYMENT: Clock, PROOF_SENT: Clock, CONFIRMED: CheckCircle2, CANCELED: XCircle,
};
const statusClasses: Record<string, string> = {
  AWAITING_PAYMENT: "border-amber-300 bg-amber-50 text-amber-800",
  PROOF_SENT: "border-sky-300 bg-sky-50 text-sky-800",
  CONFIRMED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  CANCELED: "border-red-300 bg-red-50 text-red-700",
};

// QR do PIX gerado AQUI no navegador (a chave não passa por serviço de terceiro).
function PixQr({ payload, size = 176 }: { payload: string; size?: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!payload) { setUrl(""); return; }
    QRCode.toDataURL(payload, { width: 440, margin: 1 }).then(setUrl).catch(() => setUrl(""));
  }, [payload]);
  if (!url) return null;
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-2">
      <img alt="QR Code PIX" src={url} style={{ width: size, height: size }} />
    </div>
  );
}

function CopyButton({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch {} }}
      className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition ${done ? "bg-emerald-100 text-emerald-800" : "bg-stone-900 text-white hover:bg-amber-600"} ${className}`}>
      {done ? <><Check className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> {label}</>}
    </button>
  );
}

// Página pública de acompanhamento: PIX (QR com o valor exato + chave),
// pagamento em várias parcelas e envio do comprovante de cada uma.
export function OrderStatus() {
  const { t } = useTranslation();
  const { code } = useParams();
  // Fixo em BRL de propósito: o PIX desta loja só existe em Real (o QR/chave
  // são gerados em BRL independente da moeda que o cliente navegou a loja),
  // então mostrar em PYG/USD aqui faria a tela dizer um valor que o banco
  // não cobra — plot twist descoberto pelo ultrareview.
  const brl = formatBrl;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null); // 'full' | id da parte
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const partFileRef = useRef<HTMLInputElement>(null);
  const partTarget = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/store/orders/${encodeURIComponent(String(code))}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t("orderStatus.pedidoNaoEncontrado"));
      setOrder(j);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [code]);

  useEffect(() => { load(); }, [load]);
  // Enquanto aguarda conferência, atualiza sozinho de tempos em tempos.
  useEffect(() => {
    if (!order || order.status === "CONFIRMED" || order.status === "CANCELED") return;
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [order, load]);

  const readFile = (file: File) => new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const sendProof = async (file: File, paymentId?: string) => {
    setErr(""); setMsg("");
    if (file.size > 5 * 1024 * 1024) { setErr(t("orderStatus.arquivoMuitoGrande")); return; }
    setUploading(paymentId || "full");
    try {
      const data = await readFile(file);
      const url = paymentId
        ? `/api/store/orders/${encodeURIComponent(String(code))}/payments/${paymentId}/proof`
        : `/api/store/orders/${encodeURIComponent(String(code))}/proof`;
      const r = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, data }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t("orderStatus.falhaEnviar"));
      setMsg(paymentId
        ? (j.allSent ? t("orderStatus.todosComprovantesEnviados") : t("orderStatus.comprovanteRecebidoFaltam"))
        : t("orderStatus.comprovanteEnviado"));
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setUploading(null); }
  };

  const confirmReceived = async () => {
    setConfirmingReceipt(true); setErr(""); setMsg("");
    try {
      const r = await fetch(`/api/store/orders/${encodeURIComponent(String(code))}/received`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t("orderStatus.naoRegistrado"));
      setMsg(t("orderStatus.recebimentoConfirmadoMsg"));
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setConfirmingReceipt(false); }
  };

  const applySplit = async (parts: number) => {
    setSplitting(true); setErr(""); setMsg("");
    try {
      const r = await fetch(`/api/store/orders/${encodeURIComponent(String(code))}/split`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t("orderStatus.naoDividido"));
      setSplitOpen(false);
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setSplitting(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("orderStatus.carregandoPedido")}</div>;

  if (!order) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-stone-50 p-6 text-center">
      <XCircle className="h-10 w-10 text-red-400" />
      <p className="text-sm text-stone-500">{err || t("orderStatus.pedidoNaoEncontrado")}</p>
      <Link to="/loja" className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-500"><ArrowLeft className="h-4 w-4" /> {t("orderStatus.voltarLoja")}</Link>
    </div>
  );

  const STATUS: Record<string, { label: string; hint: string }> = {
    AWAITING_PAYMENT: { label: t("orderStatus.statusAwaiting"), hint: t("orderStatus.hintAwaiting") },
    PROOF_SENT: { label: t("orderStatus.statusProof"), hint: t("orderStatus.hintProof") },
    CONFIRMED: { label: t("orderStatus.statusConfirmed"), hint: t("orderStatus.hintConfirmed") },
    CANCELED: { label: t("orderStatus.statusCanceled"), hint: t("orderStatus.hintCanceled") },
  };
  const st = STATUS[order.status] || STATUS.AWAITING_PAYMENT;
  const StIcon = statusIcons[order.status] || statusIcons.AWAITING_PAYMENT;
  const stCls = statusClasses[order.status] || statusClasses.AWAITING_PAYMENT;
  const waMsg = encodeURIComponent(t("orderStatus.olaFizPedido", { code: order.code, total: brl(order.total) }));
  const cardCls = "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";
  const payments: any[] = order.payments || [];
  const dividido = payments.length > 0;
  const podePagar = order.status === "AWAITING_PAYMENT" || order.status === "PROOF_SENT";
  const nenhumComprovante = !payments.some((p) => p.hasProof) && !order.hasProof;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900" style={{ fontFamily: "var(--store-font-body, 'Inter'), system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/loja" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <div className="text-sm font-bold" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{order.storeName}</div>
            <div className="text-[11px] text-stone-500">{t("orderStatus.pedidoLabel")} <span className="font-mono font-bold text-amber-700">{order.code}</span></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {/* Status */}
        <div className={`rounded-2xl border p-4 ${stCls}`}>
          <div className="flex items-start gap-3">
            <StIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold">{st.label}</div>
              <div className="text-xs opacity-90">
                {dividido && order.status === "AWAITING_PAYMENT"
                  ? t("orderStatus.pagamentoEmPix", { n: payments.length, pago: brl(order.paidSent), falta: brl(order.remaining) })
                  : st.hint}
              </div>
            </div>
          </div>
        </div>

        {/* PIX não configurado: avisa em vez de sumir com a seção */}
        {podePagar && !order.pixConfigured && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold">{t("orderStatus.pixIndisponivelTitulo")}</div>
              <div className="text-xs">{t("orderStatus.pixIndisponivelDesc")}</div>
            </div>
          </div>
        )}

        {/* Pagamento único */}
        {podePagar && order.pixConfigured && !dividido && order.pixPayload && (
          <div className={cardCls}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><QrCode className="h-4 w-4 text-amber-600" /> {t("orderStatus.pagueComPix")}</h2>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <PixQr payload={order.pixPayload} />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <div className="text-[11px] text-stone-500">{t("orderStatus.valorAPagar")}</div>
                  <div className="text-2xl font-black text-amber-700">{brl(order.total)}</div>
                  <div className="mt-1 text-[11px] text-stone-500">{t("orderStatus.qrNota")}</div>
                </div>
                {order.pixKey && (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] text-stone-500"><KeyRound className="h-3.5 w-3.5" /> {t("orderStatus.chavePix")}</div>
                    <div className="break-all font-mono text-sm font-bold text-stone-800">{order.pixKey}</div>
                    <CopyButton text={order.pixKey} label={t("orderStatus.copiarChave")} className="mt-2 w-full !bg-white !text-stone-800 !ring-1 !ring-stone-300 hover:!bg-stone-100" />
                  </div>
                )}
                <div>
                  <div className="mb-1 text-[11px] text-stone-500">{t("orderStatus.pixCopiaCola")}</div>
                  <textarea readOnly value={order.pixPayload} className="h-16 w-full rounded-lg border border-stone-200 bg-stone-50 p-2 font-mono text-[10px] text-stone-500" />
                  <CopyButton text={order.pixPayload} label={t("orderStatus.copiarCodigoPix")} className="mt-2 w-full" />
                </div>
              </div>
            </div>

            {/* Dividir em vários PIX */}
            <div className="mt-4 border-t border-stone-200 pt-4">
              {!splitOpen ? (
                <button onClick={() => setSplitOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-amber-700">
                  <Split className="h-4 w-4" /> {t("orderStatus.pagarVariosPix")}
                </button>
              ) : (
                <div>
                  <div className="mb-1 text-sm font-bold">{t("orderStatus.enQuantosPix")}</div>
                  <p className="mb-3 text-xs text-stone-500">{t("orderStatus.dividirNota")}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button key={n} onClick={() => applySplit(n)} disabled={splitting}
                        className="rounded-xl border border-stone-300 px-3 py-2.5 text-center transition hover:border-amber-600 hover:bg-amber-50 disabled:opacity-50">
                        <div className="text-sm font-black">{n}×</div>
                        <div className="text-[10px] text-stone-500">{t("orderStatus.de")} {brl(Math.floor((order.total * 100) / n) / 100)}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSplitOpen(false)} className="mt-2 w-full text-xs text-stone-500 hover:underline">{t("orderStatus.cancelar")}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pagamento dividido */}
        {podePagar && order.pixConfigured && dividido && (
          <div className={cardCls}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Split className="h-4 w-4 text-amber-600" /> {t("orderStatus.pagamentoEmNPix", { n: payments.length })}</h2>
              <span className="text-xs font-semibold text-stone-500">{brl(order.paidSent)} {t("orderStatus.de")} {brl(order.total)}</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (order.paidSent / order.total) * 100)}%` }} />
            </div>

            {order.pixKey && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <KeyRound className="h-4 w-4 shrink-0 text-stone-400" />
                <span className="min-w-0 break-all font-mono text-sm font-bold text-stone-800">{order.pixKey}</span>
                <CopyButton text={order.pixKey} label={t("orderStatus.copiarChave")} className="ml-auto !bg-white !text-stone-800 !ring-1 !ring-stone-300 px-3 hover:!bg-stone-100" />
              </div>
            )}

            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className={`rounded-2xl border p-4 ${p.hasProof ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${p.hasProof ? "bg-emerald-500 text-white" : "bg-stone-900 text-white"}`}>
                        {p.hasProof ? <Check className="h-4 w-4" /> : p.seq}
                      </span>
                      <div>
                        <div className="text-sm font-bold">{p.seq}º {t("orderStatus.pagamento")}</div>
                        <div className="text-lg font-black text-amber-700">{brl(p.amount)}</div>
                      </div>
                    </div>
                    {p.hasProof && <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">{t("orderStatus.comprovanteEnviadoBadge")}</span>}
                  </div>

                  {!p.hasProof && p.pixPayload && (
                    <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <PixQr payload={p.pixPayload} size={132} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <CopyButton text={p.pixPayload} label={`${t("orderStatus.copiarCodigoPix")} — ${brl(p.amount)}`} className="w-full" />
                        <button onClick={() => { partTarget.current = p.id; partFileRef.current?.click(); }} disabled={uploading != null}
                          className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-amber-700 disabled:opacity-50">
                          {uploading === p.id ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("orderStatus.enviando")}</> : <><FileText className="h-4 w-4" /> {t("orderStatus.enviarComprovanteDeste")}</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {nenhumComprovante && (
              <button onClick={() => applySplit(1)} disabled={splitting} className="mt-3 w-full text-xs text-stone-500 hover:underline disabled:opacity-50">
                {t("orderStatus.voltarPixUnico")}
              </button>
            )}
          </div>
        )}

        {/* Comprovante (pagamento único) */}
        {order.status !== "CANCELED" && !dividido && (
          <div className={cardCls}>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold"><Upload className="h-4 w-4 text-amber-600" /> {t("orderStatus.comprovantePagamento")}</h2>
            <p className="mb-3 text-xs text-stone-500">
              {order.hasProof ? t("orderStatus.comprovanteJaRecebido") : t("orderStatus.comprovanteAposPagar")}
            </p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) sendProof(f); e.currentTarget.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading != null}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-amber-700 disabled:opacity-50">
              {uploading === "full" ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("orderStatus.enviando")}</> : <><FileText className="h-4 w-4" /> {order.hasProof ? t("orderStatus.enviarOutroComprovante") : t("orderStatus.escolherComprovante")}</>}
            </button>
          </div>
        )}

        {/* input compartilhado dos comprovantes por parcela */}
        <input ref={partFileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f && partTarget.current) sendProof(f, partTarget.current); e.currentTarget.value = ""; }} />

        {/* Confirmação de recebimento — prova de entrega, com data, IP e aparelho */}
        {order.status === "CONFIRMED" && (
          <div className={cardCls}>
            {order.deliveryConfirmedAt ? (
              <div className="flex items-center gap-3">
                <PackageCheck className="h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <div className="text-sm font-bold text-emerald-800">{t("orderStatus.recebimentoConfirmado")}</div>
                  <div className="text-xs text-stone-500">
                    {t("orderStatus.vocêConfirmouEm", { data: new Date(order.deliveryConfirmedAt).toLocaleString("pt-BR") })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mb-1 flex items-center gap-2 text-sm font-bold"><PackageCheck className="h-4 w-4 text-amber-600" /> {t("orderStatus.jaRecebeuPedido")}</h2>
                <p className="mb-3 text-xs text-stone-500">
                  {order.deliveryType === "DELIVERY" ? t("orderStatus.quandoChegar") : t("orderStatus.quandoRetirar")}{t("orderStatus.confirmeAqui")}
                </p>
                <button onClick={confirmReceived} disabled={confirmingReceipt}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                  {confirmingReceipt ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("orderStatus.registrando")}</> : <><Check className="h-4 w-4" /> {t("orderStatus.confirmarRecebimento")}</>}
                </button>
              </>
            )}
          </div>
        )}

        {msg && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}
        {err && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-600">{err}</div>}

        {/* Resumo */}
        <div className={cardCls}>
          <h2 className="mb-3 text-sm font-bold">{t("orderStatus.resumoPedido")}</h2>
          <div className="space-y-1.5 text-sm">
            {(order.items || []).map((i: any, idx: number) => (
              <div key={idx} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-stone-500">{i.quantity}× {i.name}</span>
                <span className="shrink-0 font-medium">{brl(i.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="my-3 border-t border-stone-200" />
          <div className="space-y-1 text-sm">
            {(order.discount > 0 || order.shippingFee > 0) && (
              <div className="flex justify-between text-stone-500"><span>{t("orderStatus.subtotal")}</span><span>{brl(order.subtotal)}</span></div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between font-medium text-emerald-700"><span>{t("orderStatus.cupomLabel", { code: order.couponCode })}</span><span>−{brl(order.discount)}</span></div>
            )}
            {order.shippingFee > 0 && (
              <div className="flex justify-between text-stone-500"><span>{t("orderStatus.freteLabel")}{order.shippingZone ? ` (${order.shippingZone})` : ""}</span><span>+{brl(order.shippingFee)}</span></div>
            )}
            {order.shippingFee === 0 && order.shippingZone && (
              <div className="flex justify-between text-stone-500"><span>{t("orderStatus.freteLabel")} ({order.shippingZone})</span><span>{t("orderStatus.gratis")}</span></div>
            )}
            <div className="flex justify-between pt-1">
              <span className="font-medium">{t("orderStatus.total")}</span>
              <span className="text-lg font-black text-amber-700">{brl(order.total)}</span>
            </div>
          </div>
          <div className="mt-3 space-y-0.5 text-[11px] text-stone-500">
            <div>{t("orderStatus.cliente")}: {order.customerName}</div>
            <div>{order.deliveryType === "DELIVERY" ? `${t("orderStatus.entregaLabel")}: ${order.address}` : t("orderStatus.retiradaLocal")}</div>
          </div>
        </div>

        {order.whatsapp && (
          <a href={`https://wa.me/${String(order.whatsapp).replace(/\D/g, "")}?text=${waMsg}`} target="_blank" rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">
            <MessageCircle className="h-4 w-4" /> {t("orderStatus.falarSobrePedido")}
          </a>
        )}

        <p className="pb-6 text-center text-[11px] text-stone-400">
          {t("orderStatus.guardeCodigoPrefixo")} <span className="font-mono font-bold text-amber-700">{order.code}</span> {t("orderStatus.guardeCodigoSufixo")}
        </p>
      </main>
    </div>
  );
}
