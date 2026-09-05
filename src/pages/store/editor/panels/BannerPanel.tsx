import React, { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useEditMode } from "../EditModeContext";
import { compressImage, BANNER_COMPRESS_OPTS } from "../../../../lib/imageUpload";
import { toast } from "../../../../components/Toast";
import { PanelShell } from "./PanelShell";

function emitFraming(index: number, item: any) {
  window.dispatchEvent(new CustomEvent("aura-banner-framing", {
    detail: {
      kind: "hero",
      index,
      posX: Number(item?.posX ?? 50),
      posY: Number(item?.posY ?? 50),
    },
  }));
}

export function BannerPanel() {
  const ctx = useEditMode();
  const nextKeyRef = useRef(0);
  const withKeys = (arr: any[]) => arr.map((b) => (b && b.__key != null ? b : { ...b, __key: nextKeyRef.current++ }));
  const [banners, setBanners] = useState<any[]>(() => withKeys(Array.isArray(ctx?.draft?.banners) ? ctx!.draft.banners : []));
  const [uploadingKey, setUploadingKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ctx?.activePanel === "banners") {
      const next = withKeys(Array.isArray(ctx?.draft?.banners) ? ctx!.draft.banners : []);
      setBanners(next);
      requestAnimationFrame(() => next.forEach((item, index) => emitFraming(index, item)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);

  if (!ctx || ctx.activePanel !== "banners") return null;

  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ banners: banners.map(({ __key, ...b }) => b) });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };

  const update = (key: number, patch: any) => setBanners((prev) => prev.map((b) => (b.__key === key ? { ...b, ...patch } : b)));
  const remove = (key: number) => setBanners((prev) => prev.filter((b) => b.__key !== key));
  const add = () => setBanners((prev) => [...prev, { url: "", link: "/loja/catalogo", title: "", subtitle: "", posX: 50, posY: 50, __key: nextKeyRef.current++ }]);

  const handleFile = async (file: File | undefined, key: number) => {
    if (!file) return;
    setUploadingKey(key);
    try { update(key, { url: await compressImage(file, BANNER_COMPRESS_OPTS) }); }
    catch (e: any) { toast.error(e.message || "Erro ao processar imagem."); }
    finally { setUploadingKey(null); }
  };

  return (
    <PanelShell title="Banners do topo (carrossel)" onClose={ctx.closePanel} onSave={save} saving={saving} wide>
      <div className="space-y-3">
        <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-[11px] leading-relaxed text-stone-600">
          <strong className="text-stone-800">Tamanho recomendado: 1600 × 600 px (aprox. 8:3).</strong>
          <br />Use os controles horizontal e vertical para escolher exatamente qual parte da arte fica visível no card.
        </div>
        {banners.map((b, i) => (
          <div key={b.__key} className="rounded-lg border border-stone-200 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-stone-400">Banner {i + 1}</span>
              <button onClick={() => remove(b.__key)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {b.url && (
              <div className="relative mb-2 aspect-[8/3] w-full overflow-hidden rounded-md bg-[#fff7f8]">
                <img src={b.url} alt="" aria-hidden="true" style={{ objectPosition: `${b.posX ?? 50}% ${b.posY ?? 50}%` }} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-xl" />
                <img src={b.url} alt={`Prévia do banner ${i + 1}`} style={{ objectPosition: `${b.posX ?? 50}% ${b.posY ?? 50}%` }} className="relative h-full w-full object-contain" />
              </div>
            )}
            <label className="mb-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-semibold hover:border-amber-500">
              {uploadingKey === b.__key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Trocar imagem
              <input type="file" accept="image/*" className="hidden" disabled={uploadingKey !== null} onChange={(e) => handleFile(e.target.files?.[0], b.__key)} />
            </label>
            <input value={b.link || ""} onChange={(e) => update(b.__key, { link: e.target.value })} placeholder="Link de destino" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <input value={b.title || ""} onChange={(e) => update(b.__key, { title: e.target.value })} placeholder="Título (opcional — some sem CTA se vazio)" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <input value={b.subtitle || ""} onChange={(e) => update(b.__key, { subtitle: e.target.value })} placeholder="Subtítulo (opcional)" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold text-stone-500">
                Enquadramento horizontal: {Math.round(Number(b.posX ?? 50))}%
                <input type="range" min="0" max="100" value={Number(b.posX ?? 50)} onChange={(e) => { const posX = Number(e.target.value); update(b.__key, { posX }); emitFraming(i, { ...b, posX }); }} className="mt-1 w-full accent-rose-400" />
              </label>
              <label className="block text-[10px] font-semibold text-stone-500">
                Enquadramento vertical: {Math.round(Number(b.posY ?? 50))}%
                <input type="range" min="0" max="100" value={Number(b.posY ?? 50)} onChange={(e) => { const posY = Number(e.target.value); update(b.__key, { posY }); emitFraming(i, { ...b, posY }); }} className="mt-1 w-full accent-rose-400" />
              </label>
            </div>
          </div>
        ))}
        <button onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2 text-sm font-semibold text-stone-500 hover:border-amber-500 hover:text-amber-600">
          <Plus className="h-4 w-4" /> Adicionar banner
        </button>
      </div>
    </PanelShell>
  );
}
