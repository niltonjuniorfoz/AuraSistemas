import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Copy, Percent, Plus, Save, TicketPercent, Trash2, Users, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

type Coupon = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string | number;
  minOrderBrl?: string | number | null;
  maxUses?: number | null;
  usedCount?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
  firstPurchaseOnly?: boolean;
  perCustomerLimit?: number | null;
};

type FormState = {
  id?: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  minOrderBrl: string;
  maxUses: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  firstPurchaseOnly: boolean;
  perCustomerLimit: string;
};

const emptyForm = (): FormState => ({
  code: '', type: 'PERCENT', value: '5', minOrderBrl: '', maxUses: '', validFrom: '', validUntil: '',
  isActive: true, firstPurchaseOnly: false, perCustomerLimit: '',
});

function inputDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export function StoreCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/store-coupons');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os cupons.');
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar cupons.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);
  const totalUses = useMemo(() => rows.reduce((sum, row) => sum + Number(row.usedCount || 0), 0), [rows]);

  const openEdit = (coupon: Coupon) => setForm({
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value ?? ''),
    minOrderBrl: coupon.minOrderBrl == null ? '' : String(coupon.minOrderBrl),
    maxUses: coupon.maxUses == null ? '' : String(coupon.maxUses),
    validFrom: inputDate(coupon.validFrom),
    validUntil: inputDate(coupon.validUntil),
    isActive: coupon.isActive !== false,
    firstPurchaseOnly: !!coupon.firstPurchaseOnly,
    perCustomerLimit: coupon.perCustomerLimit == null ? '' : String(coupon.perCustomerLimit),
  });

  const save = async () => {
    if (!form || saving) return;
    setError(''); setSaving(true);
    try {
      const res = await apiFetch(form.id ? `/api/store-coupons/${form.id}` : '/api/store-coupons', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar o cupom.');
      setForm(null);
      await load();
    } catch (e: any) { setError(e.message || 'Erro ao salvar cupom.'); }
    finally { setSaving(false); }
  };

  const disable = async (coupon: Coupon) => {
    if (!window.confirm(`Desativar o cupom ${coupon.code}? O histórico de pedidos será mantido.`)) return;
    const res = await apiFetch(`/api/store-coupons/${coupon.id}`, { method: 'DELETE' });
    if (res.ok) load(); else setError((await res.json().catch(() => ({}))).error || 'Erro ao desativar cupom.');
  };

  const copy = async (code: string) => {
    await navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code); window.setTimeout(() => setCopied(''), 1200);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white"><TicketPercent className="h-6 w-6 text-primary" /> Cupons da Loja</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-400">Crie códigos de desconto com regras claras. O sistema valida o cupom novamente no fechamento do pedido para impedir uso fora das condições.</p>
        </div>
        <Button onClick={() => setForm(emptyForm())}><Plus className="h-4 w-4" /> Novo cupom</Button>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-0"><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Cupons ativos</div><div className="mt-1 text-2xl font-bold text-white">{activeCount}</div></CardContent></Card>
        <Card className="py-0"><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Usos registrados</div><div className="mt-1 text-2xl font-bold text-white">{totalUses}</div></CardContent></Card>
        <Card className="border-primary/25 bg-primary/5 py-0"><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-primary">Primeira compra</div><div className="mt-1 text-sm font-semibold text-white">PRIMEIRA5OFF</div><div className="mt-1 text-xs text-gray-400">5% · primeira compra · 1 uso por cliente</div></CardContent></Card>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {loading ? <div className="p-10 text-center text-sm text-gray-500">Carregando cupons...</div> : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">Nenhum cupom criado.</div>
          ) : (
            <div className="divide-y divide-gray-800/70">
              {rows.map((coupon) => {
                const valueLabel = coupon.type === 'PERCENT' ? `${Number(coupon.value)}%` : `R$ ${Number(coupon.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                return (
                  <div key={coupon.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => copy(coupon.code)} className="inline-flex items-center gap-1.5 font-mono text-base font-bold text-white hover:text-primary">
                          {coupon.code} <Copy className="h-3.5 w-3.5" />
                        </button>
                        <Badge variant={coupon.isActive ? 'success' : 'secondary'}>{coupon.isActive ? 'Ativo' : 'Inativo'}</Badge>
                        <Badge variant="outline">{valueLabel}</Badge>
                        {copied === coupon.code && <span className="text-xs text-emerald-400">copiado</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        {coupon.firstPurchaseOnly && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Somente primeira compra</span>}
                        {coupon.perCustomerLimit && <span>Máx. {coupon.perCustomerLimit}x por cliente</span>}
                        {coupon.minOrderBrl && <span>Pedido mínimo R$ {Number(coupon.minOrderBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                        <span>Uso global: {coupon.usedCount || 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ' / ilimitado'}</span>
                        {(coupon.validFrom || coupon.validUntil) && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {coupon.validFrom ? inputDate(coupon.validFrom) : 'agora'} → {coupon.validUntil ? inputDate(coupon.validUntil) : 'sem prazo'}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => openEdit(coupon)}>Editar</Button>
                      {coupon.isActive && <Button variant="ghost" onClick={() => disable(coupon)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /> Desativar</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5 py-0"><CardContent className="p-4 text-sm text-gray-300">
        <div className="font-semibold text-blue-300">Como funcionam as regras</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3 text-xs text-gray-400">
          <div><b className="text-gray-200">Primeira compra:</b> só aceita se o cliente ainda não tiver pedido anterior válido.</div>
          <div><b className="text-gray-200">Limite por cliente:</b> controla quantas vezes a mesma conta pode usar o código.</div>
          <div><b className="text-gray-200">Limite global:</b> encerra o cupom quando o total de usos atingir a quantidade definida.</div>
        </div>
      </CardContent></Card>

      {form && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setForm(null); }}>
          <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-[#111] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-[#111]/95 px-5 py-4 backdrop-blur">
              <div><h2 className="text-lg font-semibold text-white">{form.id ? 'Editar cupom' : 'Novo cupom'}</h2><p className="text-xs text-gray-500">Configure o desconto e quem pode usar.</p></div>
              <button onClick={() => !saving && setForm(null)} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_160px_160px]">
                <label className="space-y-1.5"><span className="text-xs font-semibold text-gray-300">Código *</span><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="EX: PRIMEIRA5OFF" className="h-11 w-full rounded-lg border border-gray-700 bg-[#080808] px-3 font-mono text-sm uppercase text-white outline-none focus:border-primary" /></label>
                <label className="space-y-1.5"><span className="text-xs font-semibold text-gray-300">Tipo</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="h-11 w-full rounded-lg border border-gray-700 bg-[#080808] px-3 text-sm text-white"><option value="PERCENT">Percentual (%)</option><option value="FIXED">Valor fixo (R$)</option></select></label>
                <label className="space-y-1.5"><span className="text-xs font-semibold text-gray-300">Desconto *</span><div className="relative"><input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="h-11 w-full rounded-lg border border-gray-700 bg-[#080808] px-3 pr-9 text-sm text-white outline-none focus:border-primary" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{form.type === 'PERCENT' ? '%' : 'R$'}</span></div></label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5"><span className="text-xs font-semibold text-gray-300">Pedido mínimo (R$)</span><input type="number" min="0" value={form.minOrderBrl} onChange={(e) => setForm({ ...form, minOrderBrl: e.target.value })} placeholder="Sem mínimo" className="h-11 w-full rounded-lg border border-gray-700 bg-[#080808] px-3 text-sm text-white" /></label>
                <label className="space-y-1.5"><span className="text-xs font-semibold text-gray-300">Limite total de usos</span><input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Ilimitado" className="h-11 w-full rounded-lg border border-gray-700 bg-[#080808] px-3 text-sm text-white" /></label>
                <label className="space-y-1.5"><span className="text-xs font-semibold text-gray-300">Começa em</span><input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="h-11 w-full rounded-lg border border-gray-700 bg-[#080808] px-3 text-sm text-white" /></label>
                <label className="space-y-1.5"><span className="text-xs font-semibold text-gray-300">Termina em</span><input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="h-11 w-full rounded-lg border border-gray-700 bg-[#080808] px-3 text-sm text-white" /></label>
              </div>

              <div className="rounded-xl border border-gray-800 bg-[#171717] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Users className="h-4 w-4 text-primary" /> Regras por cliente</div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-white/[0.03]"><input type="checkbox" checked={form.firstPurchaseOnly} onChange={(e) => setForm({ ...form, firstPurchaseOnly: e.target.checked, perCustomerLimit: e.target.checked && !form.perCustomerLimit ? '1' : form.perCustomerLimit })} className="mt-1 h-4 w-4 accent-[var(--primary)]" /><span><span className="block text-sm text-gray-200">Somente primeira compra</span><span className="text-xs text-gray-500">Bloqueia o cupom se essa conta já tiver feito outro pedido válido.</span></span></label>
                <label className="mt-2 grid gap-1.5 sm:grid-cols-[1fr_150px] sm:items-center"><span><span className="block text-sm text-gray-200">Usos máximos por cliente</span><span className="text-xs text-gray-500">Deixe vazio para não limitar individualmente.</span></span><input type="number" min="1" value={form.perCustomerLimit} onChange={(e) => setForm({ ...form, perCustomerLimit: e.target.value })} placeholder="Ilimitado" className="h-10 rounded-lg border border-gray-700 bg-[#080808] px-3 text-sm text-white" /></label>
              </div>

              <label className="flex items-center gap-3"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /><span className="text-sm text-gray-200">Cupom ativo e disponível na loja</span></label>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-4"><Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancelar</Button><Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar cupom'}</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
