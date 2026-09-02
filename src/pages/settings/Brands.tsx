import React, { useEffect, useState } from 'react';
import { Loader2, Upload, Tags, Link as LinkIcon } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { toast } from '../../components/Toast';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

type BrandRow = { id: string | null; name: string; logoUrl: string | null; sortOrder: number; visible: boolean };

export function Brands() {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/settings/brands');
      if (res.ok) { const j = await res.json(); setRows(j.data || []); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const uploadLogo = async (name: string, file: File | undefined) => {
    if (!file) return;
    setUploadingName(name);
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await apiFetch(`/api/settings/brands/${encodeURIComponent(name)}/logo`, { method: 'POST', body: form });
      if (res.ok) { toast.success('Logo enviado.'); load(); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || 'Erro ao enviar logo.'); }
    } finally { setUploadingName(null); }
  };

  const updateRow = async (name: string, patch: { sortOrder?: number; visible?: boolean; logoUrl?: string }) => {
    setRows((prev) => prev.map((r) => r.name === name ? { ...r, ...patch } : r));
    const res = await apiFetch(`/api/settings/brands/${encodeURIComponent(name)}`, { method: 'PUT', body: JSON.stringify(patch) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error || 'Erro ao salvar.'); load(); }
  };

  const useLink = (name: string) => {
    const url = (urlDrafts[name] || '').trim();
    if (!url) return;
    updateRow(name, { logoUrl: url });
    setUrlDrafts((prev) => ({ ...prev, [name]: '' }));
  };

  if (loading) return <div className="p-8 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
          <Tags className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Marcas</h2>
          <p className="text-gray-400 text-sm">Logo de cada marca pra seção "Marcas" da home da loja. Marca sem logo não aparece pros clientes.</p>
        </div>
      </div>

      <Card className="rounded-2xl border-gray-800 bg-brand-navylight p-5 shadow-md">
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-600">Nenhuma marca encontrada — cadastre o campo Marca em algum produto primeiro.</div>
          )}
          {rows.map((r) => (
            <Card key={r.name} className="flex-row flex-wrap items-center gap-3 rounded-xl border-gray-800 bg-[#171717] p-3 shadow-none">
              <div className="w-12 h-12 rounded-lg bg-brand-navylight border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                {r.logoUrl ? <img src={r.logoUrl} alt={r.name} className="w-full h-full object-contain" /> : <span className="text-[9px] text-gray-600 text-center px-1">Sem logo</span>}
              </div>
              <span className="font-medium text-white flex-1 min-w-[120px]">{r.name}</span>
              <Button asChild size="sm" className="h-auto cursor-pointer rounded-lg bg-brand-gold px-3 py-1.5 has-[>svg]:px-3 text-xs font-bold text-brand-navydark hover:bg-brand-goldhover">
                <label>
                  {uploadingName === r.name ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {uploadingName === r.name ? 'Enviando...' : (r.logoUrl ? 'Trocar logo' : 'Enviar logo')}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingName != null && uploadingName !== r.name}
                    onChange={(e) => { uploadLogo(r.name, e.target.files?.[0]); e.target.value = ''; }} />
                </label>
              </Button>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">Ordem</label>
                <input type="number" min="0" value={r.sortOrder} onChange={(e) => updateRow(r.name, { sortOrder: parseInt(e.target.value, 10) || 0 })}
                  className="w-16 bg-brand-navylight border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-brand-gold" />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                <input type="checkbox" checked={r.visible} onChange={(e) => updateRow(r.name, { visible: e.target.checked })} />
                Visível na loja
              </label>
              <div className="flex w-full basis-full items-center gap-1.5 sm:w-auto sm:basis-auto sm:flex-1 sm:min-w-[220px]">
                <LinkIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                <input type="text" value={urlDrafts[r.name] || ''} onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [r.name]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); useLink(r.name); } }}
                  placeholder="Ou cole o link do logo (https://...)"
                  className="min-w-0 flex-1 bg-brand-navylight border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-brand-gold" />
                <Button type="button" variant="outline" onClick={() => useLink(r.name)} disabled={!(urlDrafts[r.name] || '').trim()}
                  className="h-auto shrink-0 rounded-lg border-gray-700 bg-transparent px-2.5 py-1.5 shadow-none text-xs font-semibold text-gray-300 hover:border-brand-gold hover:bg-transparent hover:text-brand-gold dark:border-gray-700 dark:bg-transparent dark:hover:bg-transparent disabled:opacity-40">
                  Usar link
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
