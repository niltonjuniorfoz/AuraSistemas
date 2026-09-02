import React, { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useEditMode } from "../EditModeContext";
import { PanelShell } from "./PanelShell";
import { compressImage, BANNER_COMPRESS_OPTS } from "../../../../lib/imageUpload";
import { toast } from "../../../../components/Toast";

const FALLBACKS = [
  { url: "/banners/db-cosmetics-hero.png", link: "/loja/catalogo" },
  { url: "/banners/db-body-splash.png", link: "/loja/catalogo?busca=body%20splash" },
];

export function SideBannerPanel() {
  const ctx = useEditMode();
  const [items, setItems] = useState<any[]>(FALLBACKS);
  const [uploading, setUploading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ctx?.activePanel === "sideBanner") {
      const saved = Array.isArray(ctx?.draft?.promoBanners) ? ctx!.draft.promoBanners : [];
      setItems([0, 1].map((index) => ({ ...FALLBACKS[index], ...(saved[index] || {}) })));
    }
  }, [ctx?.activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ctx || ctx.activePanel !== "sideBanner") return null;

  const update = (index: number, patch: any) => setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  const handleFile = async (index: number, file?: File) => {
    if (!file) return;
    setUploading(index);
    try {
      update(index, { url: await compressImage(file, BANNER_COMPRESS_OPTS) });
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar a imagem.");
    } finally {
      setUploading(null);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ promoBanners: items.slice(0, 2).map((item) => ({ url: item.url || "", link: item.link || "/loja/catalogo" })) });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell title="2 banners promocionais" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
      <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-[11px] leading-relaxed text-stone-600">
        <strong className="text-stone-800">Tamanho exato recomendado: 760 × 280 px por banner.</strong><br />
        A prévia abaixo usa a mesma proporção exibida na home. Crie as duas artes nesse tamanho para ficarem alinhadas lado a lado.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-stone-200 p-2.5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-stone-400">Banner {index + 1}</div>
            <div className="mb-2 aspect-[19/7] overflow-hidden rounded-lg bg-[#fff7f8]">
              <img src={item.url} alt={`Prévia banner ${index + 1}`} className="h-full w-full object-cover" />
            </div>
            <label className="mb-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2 text-xs font-semibold text-stone-500 hover:border-rose-400 hover:text-rose-500">
              {uploading === index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Trocar imagem
              <input type="file" accept="image/*" className="hidden" disabled={uploading !== null} onChange={(event) => handleFile(index, event.target.files?.[0])} />
            </label>
            <input value={item.link || ""} onChange={(event) => update(index, { link: event.target.value })} placeholder="Link ao clicar" className="w-full rounded-lg border border-stone-300 p-2 text-xs outline-none focus:border-rose-400" />
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
