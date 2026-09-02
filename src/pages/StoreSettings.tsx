import React, { useEffect, useMemo, useState } from "react";
import { Store, TicketPercent, Truck, Plus, Trash2, Pencil, Save, X, ExternalLink, Loader2, AlertTriangle, ShieldCheck, Palette } from "lucide-react";
import { Link } from "react-router";
import { apiFetch } from "../lib/api";
import { toast } from "../components/Toast";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const brl = (v: any) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const emptyCoupon = { id: "", code: "", type: "PERCENT", value: "", minOrderBrl: "", maxUses: "", validFrom: "", validUntil: "", isActive: true };
const emptyZone = { id: "", name: "", feeBrl: "", sortOrder: "0", isActive: true };

// Admin da loja online: cupons e frete por região. A vitrine (hero/banners/
// destaques/tema) foi absorvida pelo editor visual (/store-settings/editor,
// clique-pra-editar direto na loja) — só "config" continua aqui porque os
// campos de Termos do pedido (termsText/termsVersion) moram no mesmo objeto
// e ainda são editados nesta tela.
export function StoreSettings() {
  const [tab, setTab] = useState<"cupons" | "frete" | "termos">("cupons");

  const [config, setConfig] = useState({ heroTitle: "", heroSubtitle: "", announcement: "", featuredProductIds: [] as string[], termsText: "", termsVersion: "1", banners: [] as any[], quickLinks: [] as any[], vitrines: [] as any[] });
  const [savingCfg, setSavingCfg] = useState(false);

  // -------- Cupons --------
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState<any>(null); // null = fechado
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [disableCoupon, setDisableCoupon] = useState<any>(null);

  // -------- Frete --------
  const [zones, setZones] = useState<any[]>([]);
  const [zoneForm, setZoneForm] = useState<any>(null);
  const [savingZone, setSavingZone] = useState(false);
  const [disableZone, setDisableZone] = useState<any>(null);

  // Sem chave PIX cadastrada a loja não gera QR nenhum — avisa em vez de falhar calado.
  const [pixEnabled, setPixEnabled] = useState(true);
  const [pixTest, setPixTest] = useState<any>(null);
  const [pixQr, setPixQr] = useState("");

  const testarPix = async () => {
    setPixQr("");
    const r = await apiFetch("/api/store/admin/pix-test");
    const j = await r.json().catch(() => ({}));
    setPixTest(j);
    setPixEnabled(!!j.configured);
    if (j.payload) {
      const QRCode = (await import("qrcode")).default;
      QRCode.toDataURL(j.payload, { width: 420, margin: 1 }).then(setPixQr).catch(() => setPixQr(""));
    }
  };

  useEffect(() => { testarPix(); }, []);

  const load = async () => {
    const [c, cp, z] = await Promise.all([
      apiFetch("/api/store/admin/config"),
      apiFetch("/api/store/admin/coupons"),
      apiFetch("/api/store/admin/shipping-zones"),
    ]);
    if (c.ok) {
      const j = await c.json();
      setConfig({ ...j, banners: j.banners || [], quickLinks: j.quickLinks || [], vitrines: j.vitrines || [] });
    }
    if (cp.ok) { const j = await cp.json(); setCoupons(j.data || []); }
    if (z.ok) { const j = await z.json(); setZones(j.data || []); }
  };
  useEffect(() => { load(); }, []);

  // Só salva os Termos do pedido agora (a vitrine foi pro editor visual), mas
  // o PUT /admin/config não é um PATCH — ele reconstrói o objeto inteiro a
  // partir do body, zerando qualquer campo omitido. `config` aqui foi
  // carregado uma vez no mount e nunca mais atualizado; se o editor visual
  // publicar mudanças (hero/banners/vitrines/tema) numa outra aba enquanto
  // esta ficar aberta, mandar esse `config` velho de volta apagaria tudo que
  // acabou de ser publicado. Pra reduzir a janela dessa corrida, busca o
  // config publicado de novo bem na hora de salvar e usa ELE como base,
  // sobrepondo só os campos que esta aba realmente edita (termsText — a
  // versão o próprio servidor recalcula comparando com o texto atual).
  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      const r0 = await apiFetch("/api/store/admin/config");
      if (!r0.ok) throw new Error("Não foi possível confirmar os dados atuais da loja antes de salvar.");
      const fresh = await r0.json();
      const merged = {
        ...fresh,
        banners: fresh.banners || [],
        quickLinks: fresh.quickLinks || [],
        vitrines: fresh.vitrines || [],
        termsText: config.termsText,
        termsVersion: config.termsVersion,
      };
      const r = await apiFetch("/api/store/admin/config", { method: "PUT", body: JSON.stringify(merged) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || "Erro ao salvar."); }
      setConfig(merged);
      toast.success("Termos salvos.");
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingCfg(false); }
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCoupon(true);
    try {
      const url = couponForm.id ? `/api/store/admin/coupons/${couponForm.id}` : "/api/store/admin/coupons";
      const r = await apiFetch(url, { method: couponForm.id ? "PUT" : "POST", body: JSON.stringify(couponForm) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Erro ao salvar cupom.");
      toast.success("Cupom salvo.");
      setCouponForm(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingCoupon(false); }
  };

  const saveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingZone(true);
    try {
      const url = zoneForm.id ? `/api/store/admin/shipping-zones/${zoneForm.id}` : "/api/store/admin/shipping-zones";
      const r = await apiFetch(url, { method: zoneForm.id ? "PUT" : "POST", body: JSON.stringify(zoneForm) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Erro ao salvar região.");
      toast.success("Região salva.");
      setZoneForm(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingZone(false); }
  };

  const couponStatus = (c: any) => {
    if (!c.isActive) return ["Inativo", "border-gray-700 text-gray-500"];
    const now = new Date();
    if (c.validUntil && now > new Date(c.validUntil)) return ["Expirado", "border-red-400/40 text-red-300"];
    if (c.maxUses != null && Number(c.usedCount) >= Number(c.maxUses)) return ["Esgotado", "border-amber-400/40 text-amber-300"];
    return ["Ativo", "border-emerald-500/40 text-emerald-300"];
  };

  const inputCls = "w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold";
  const labelCls = "block text-xs text-gray-400 mb-1";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Store className="w-6 h-6 text-brand-gold" /> Configurações da Loja</h1>
          <p className="text-gray-400 text-sm">Cupons de desconto, frete por região e termos do pedido — sem mexer em código.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Vitrine (hero/banners/destaques/tema) saiu daqui e virou o editor
              visual — clique-pra-editar direto na loja publicada. */}
          <Button asChild variant="outline" className="gap-1.5 rounded-lg px-3 has-[>svg]:px-3 border-brand-gold/40 dark:border-brand-gold/40 bg-transparent dark:bg-transparent text-brand-gold font-normal hover:bg-brand-gold/10 hover:text-brand-gold dark:hover:bg-brand-gold/10">
            <Link to="/store-settings/editor">
              <Palette className="size-4" /> Editor visual da loja
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5 rounded-lg px-3 has-[>svg]:px-3 border-brand-gold/40 dark:border-brand-gold/40 bg-transparent dark:bg-transparent text-brand-gold font-normal hover:bg-brand-gold/10 hover:text-brand-gold dark:hover:bg-brand-gold/10">
            <a href="/loja" target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Abrir a loja
            </a>
          </Button>
        </div>
      </div>

      {/* Estado do PIX: sem chave a loja não gera QR nenhum. Com chave, mostra
          exatamente o que o cliente vê (QR de teste de R$ 10). */}
      {!pixEnabled ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-amber-200">Chave PIX não cadastrada — a loja não consegue cobrar</div>
            <div className="text-xs text-amber-100/80">
              Vá em Configurações › PIX / Cobrança QR Code e escreva a chave (e-mail, CPF/CNPJ ou telefone) no campo de texto.
              Não é preciso enviar imagem de QR Code: o sistema gera o QR de cada pedido sozinho, já com o valor.
            </div>
          </div>
          <Button asChild variant="default" className="h-auto rounded-lg px-3 py-2 text-xs font-bold bg-amber-400 text-brand-navydark hover:bg-amber-300">
            <a href="/settings">Cadastrar chave PIX</a>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex flex-wrap items-start gap-4">
            {pixQr && <img src={pixQr} alt="QR de teste" className="h-28 w-28 rounded-lg bg-white p-1.5" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-emerald-300">PIX ativo — é assim que o cliente vê</div>
              <div className="mt-1 space-y-0.5 text-xs text-gray-300">
                <div>Chave: <span className="font-mono text-white">{pixTest?.pixKey}</span></div>
                <div>Aparece como: <span className="text-white">{pixTest?.storeName}</span>{pixTest?.city ? ` · ${pixTest.city}` : " · cidade não cadastrada"}</div>
                <div className="text-gray-500">QR de teste no valor de R$ 10,00 (não cobra nada — é só demonstração).</div>
              </div>
              {(!pixTest?.city || pixTest?.storeName === "Loja") && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                  Preencha nome fantasia e cidade em Configurações › Empresa: é esse nome que o cliente vê no app do banco na hora de pagar.
                </div>
              )}
            </div>
            <Button variant="outline" onClick={testarPix} className="h-auto rounded-lg px-3 py-2 text-xs border-gray-700 text-gray-300 bg-transparent dark:bg-transparent dark:border-gray-700 font-normal hover:border-brand-gold hover:bg-transparent hover:text-gray-300 dark:hover:bg-transparent dark:hover:border-brand-gold">Testar de novo</Button>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2">
        {([["cupons", "Cupons", TicketPercent], ["frete", "Frete por região", Truck], ["termos", "Termos do pedido", ShieldCheck]] as any[]).map(([key, label, Icon]) => (
          <Button key={key} variant="outline" onClick={() => setTab(key)}
            className={`gap-1.5 rounded-lg has-[>svg]:px-4 text-sm font-bold ${tab === key ? "border-brand-gold bg-brand-gold text-brand-navydark hover:bg-brand-gold hover:text-brand-navydark dark:border-brand-gold dark:bg-brand-gold dark:hover:bg-brand-gold" : "border-gray-800 bg-brand-navylight text-gray-400 hover:bg-brand-navylight hover:text-white dark:border-gray-800 dark:bg-brand-navylight dark:hover:bg-brand-navylight"}`}>
            <Icon className="size-4" /> {label}
          </Button>
        ))}
      </div>

      {/* ---------- TERMOS ---------- */}
      {tab === "termos" && (
        <Card className="gap-0 rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Termos que o cliente aceita no checkout</h3>
              <p className="text-xs text-gray-500">
                O cliente marca o aceite pra finalizar. Gravamos no pedido o texto exato, a data, o IP e o aparelho —
                é isso que sustenta uma contestação depois.
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 rounded border-gray-700 px-2 py-1 text-[10px] font-bold text-gray-400">versão {config.termsVersion}</Badge>
          </div>
          <textarea value={config.termsText} onChange={(e) => setConfig({ ...config, termsText: e.target.value })}
            className={`${inputCls} h-64 resize-none font-mono text-xs leading-relaxed`} maxLength={20000} />
          <p className="text-[11px] text-gray-600">
            Ao mudar o texto, a versão sobe sozinha. Pedidos antigos continuam guardando a versão que aquele cliente aceitou.
          </p>
          <Button variant="default" size="default" onClick={saveConfig} disabled={savingCfg} className="gap-1.5 rounded-lg has-[>svg]:px-4 bg-brand-gold text-brand-navydark hover:bg-brand-goldhover font-bold">
            {savingCfg ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar termos
          </Button>
        </Card>
      )}

      {/* ---------- CUPONS ---------- */}
      {tab === "cupons" && (
        <Card className="gap-0 rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Cupons de desconto</h3>
            <Button variant="default" size="default" onClick={() => setCouponForm({ ...emptyCoupon })} className="gap-1.5 rounded-lg bg-brand-gold text-brand-navydark hover:bg-brand-goldhover font-bold"><Plus className="size-4" /> Novo cupom</Button>
          </div>
          {coupons.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">Nenhum cupom ainda. Crie o primeiro — ex.: BEMVINDA10 (10%).</div>
          ) : (
            <div className="space-y-2">
              {coupons.map((c) => {
                const [st, cls] = couponStatus(c);
                return (
                  <Card key={c.id} className="flex-row flex-wrap items-center gap-3 rounded-xl border-gray-800 bg-[#171717] p-3 shadow-none">
                    <span className="font-mono text-sm font-black text-brand-gold">{c.code}</span>
                    <span className="text-sm text-white">{c.type === "PERCENT" ? `${Number(c.value)}% OFF` : `${brl(c.value)} OFF`}</span>
                    {c.minOrderBrl != null && <span className="text-xs text-gray-500">mín. {brl(c.minOrderBrl)}</span>}
                    <span className="text-xs text-gray-500">{c.usedCount} uso(s){c.maxUses != null ? ` / ${c.maxUses}` : ""}</span>
                    {c.validUntil && <span className="text-xs text-gray-500">até {new Date(c.validUntil).toLocaleDateString("pt-BR")}</span>}
                    <Badge variant="outline" className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{st}</Badge>
                    <div className="ml-auto flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar cupom" onClick={() => setCouponForm({
                        id: c.id, code: c.code, type: c.type, value: String(Number(c.value)),
                        minOrderBrl: c.minOrderBrl != null ? String(Number(c.minOrderBrl)) : "",
                        maxUses: c.maxUses != null ? String(c.maxUses) : "",
                        validFrom: c.validFrom ? String(c.validFrom).slice(0, 10) : "",
                        validUntil: c.validUntil ? String(c.validUntil).slice(0, 10) : "",
                        isActive: c.isActive,
                      })} className="rounded text-gray-400 hover:text-brand-gold hover:bg-brand-navydark dark:hover:bg-brand-navydark"><Pencil className="size-4" /></Button>
                      {c.isActive && <Button variant="ghost" size="icon-sm" aria-label="Desativar cupom" onClick={() => setDisableCoupon(c)} className="rounded text-red-400 hover:bg-red-400/10 hover:text-red-400 dark:hover:bg-red-400/10"><Trash2 className="size-4" /></Button>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ---------- FRETE ---------- */}
      {tab === "frete" && (
        <Card className="gap-0 rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Frete por região</h3>
            <Button variant="default" size="default" onClick={() => setZoneForm({ ...emptyZone })} className="gap-1.5 rounded-lg bg-brand-gold text-brand-navydark hover:bg-brand-goldhover font-bold"><Plus className="size-4" /> Nova região</Button>
          </div>
          <p className="mb-4 text-xs text-gray-500">No checkout com entrega, o cliente escolhe a região e a taxa soma no pedido. Sem região cadastrada, a entrega segue combinada por WhatsApp (sem taxa automática).</p>
          {zones.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">Nenhuma região ainda. Ex.: "Centro — R$ 10,00".</div>
          ) : (
            <div className="space-y-2">
              {zones.map((z) => (
                <Card key={z.id} className="flex-row items-center gap-3 rounded-xl border-gray-800 bg-[#171717] p-3 shadow-none">
                  <span className="text-sm font-semibold text-white">{z.name}</span>
                  <span className="text-sm text-brand-gold font-mono">{Number(z.feeBrl) === 0 ? "grátis" : brl(z.feeBrl)}</span>
                  {!z.isActive && <Badge variant="outline" className="rounded border-gray-700 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">Inativa</Badge>}
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="Editar região" onClick={() => setZoneForm({ id: z.id, name: z.name, feeBrl: String(Number(z.feeBrl)), sortOrder: String(z.sortOrder), isActive: z.isActive })}
                      className="rounded text-gray-400 hover:text-brand-gold hover:bg-brand-navydark dark:hover:bg-brand-navydark"><Pencil className="size-4" /></Button>
                    {z.isActive && <Button variant="ghost" size="icon-sm" aria-label="Desativar região" onClick={() => setDisableZone(z)} className="rounded text-red-400 hover:bg-red-400/10 hover:text-red-400 dark:hover:bg-red-400/10"><Trash2 className="size-4" /></Button>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modal cupom */}
      {couponForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setCouponForm(null)}>
          <form onSubmit={saveCoupon} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl border border-gray-800 bg-brand-navylight p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><TicketPercent className="w-5 h-5 text-brand-gold" /> {couponForm.id ? "Editar cupom" : "Novo cupom"}</h3>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => setCouponForm(null)} className="size-auto p-1.5 text-gray-400 hover:text-white hover:bg-transparent dark:hover:bg-transparent"><X className="size-4" /></Button>
            </div>
            <div>
              <label className={labelCls}>Código *</label>
              <input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="BEMVINDA10" required className={`${inputCls} font-mono uppercase`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo</label>
                <select value={couponForm.type} onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })} className={inputCls}>
                  <option value="PERCENT">% de desconto</option>
                  <option value="FIXED">R$ fixo de desconto</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{couponForm.type === "PERCENT" ? "Percentual (%)" : "Valor (R$)"} *</label>
                <input type="number" step="0.01" min="0.01" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Pedido mínimo (R$)</label>
                <input type="number" step="0.01" min="0" value={couponForm.minOrderBrl} onChange={(e) => setCouponForm({ ...couponForm, minOrderBrl: e.target.value })} placeholder="sem mínimo" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Limite de usos</label>
                <input type="number" min="1" value={couponForm.maxUses} onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })} placeholder="ilimitado" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Vale a partir de</label>
                <input type="date" value={couponForm.validFrom} onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Vale até</label>
                <input type="date" value={couponForm.validUntil} onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })} className={inputCls} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={couponForm.isActive} onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })} className="accent-[#ffd700]" /> Cupom ativo
            </label>
            <Button type="submit" variant="default" disabled={savingCoupon} className="h-auto w-full py-2.5 rounded-lg text-sm font-bold bg-brand-gold text-brand-navydark hover:bg-brand-goldhover">
              {savingCoupon ? "Salvando..." : "Salvar cupom"}
            </Button>
          </form>
        </div>
      )}

      {/* Modal região */}
      {zoneForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setZoneForm(null)}>
          <form onSubmit={saveZone} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-2xl border border-gray-800 bg-brand-navylight p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><Truck className="w-5 h-5 text-brand-gold" /> {zoneForm.id ? "Editar região" : "Nova região"}</h3>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => setZoneForm(null)} className="size-auto p-1.5 text-gray-400 hover:text-white hover:bg-transparent dark:hover:bg-transparent"><X className="size-4" /></Button>
            </div>
            <div>
              <label className={labelCls}>Cidade / bairro *</label>
              <input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="Ex.: Centro" required className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Taxa (R$) *</label>
                <input type="number" step="0.01" min="0" value={zoneForm.feeBrl} onChange={(e) => setZoneForm({ ...zoneForm, feeBrl: e.target.value })} placeholder="0 = grátis" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ordem na lista</label>
                <input type="number" value={zoneForm.sortOrder} onChange={(e) => setZoneForm({ ...zoneForm, sortOrder: e.target.value })} className={inputCls} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={zoneForm.isActive} onChange={(e) => setZoneForm({ ...zoneForm, isActive: e.target.checked })} className="accent-[#ffd700]" /> Região ativa
            </label>
            <Button type="submit" variant="default" disabled={savingZone} className="h-auto w-full py-2.5 rounded-lg text-sm font-bold bg-brand-gold text-brand-navydark hover:bg-brand-goldhover">
              {savingZone ? "Salvando..." : "Salvar região"}
            </Button>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={!!disableCoupon}
        title="Desativar cupom"
        message={`Desativar o cupom ${disableCoupon?.code}? Ele para de funcionar na hora (o histórico fica).`}
        confirmText="Desativar"
        onConfirm={async () => {
          const r = await apiFetch(`/api/store/admin/coupons/${disableCoupon.id}`, { method: "DELETE" });
          if (r.ok) { toast.success("Cupom desativado."); load(); } else toast.error("Erro ao desativar.");
          setDisableCoupon(null);
        }}
        onClose={() => setDisableCoupon(null)}
      />
      <ConfirmModal
        isOpen={!!disableZone}
        title="Desativar região"
        message={`Desativar "${disableZone?.name}"? Ela some do checkout na hora.`}
        confirmText="Desativar"
        onConfirm={async () => {
          const r = await apiFetch(`/api/store/admin/shipping-zones/${disableZone.id}`, { method: "DELETE" });
          if (r.ok) { toast.success("Região desativada."); load(); } else toast.error("Erro ao desativar.");
          setDisableZone(null);
        }}
        onClose={() => setDisableZone(null)}
      />
    </div>
  );
}
