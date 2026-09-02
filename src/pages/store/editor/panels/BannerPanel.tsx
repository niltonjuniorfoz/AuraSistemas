import React, { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useEditMode } from "../EditModeContext";
import { compressImage, BANNER_COMPRESS_OPTS } from "../../../../lib/imageUpload";
import { toast } from "../../../../components/Toast";
import { PanelShell } from "./PanelShell";

// Banners do carrossel do topo da home. Cada item é {url, link, title, subtitle, posX} —
// url vem de upload real (compressImage converte pra base64 já comprimido
// no navegador, ver src/lib/imageUpload.ts).
export function BannerPanel() {
  const ctx = useEditMode();
  // Cada linha ganha uma chave interna (__key) só pra rastreamento durante a
  // edição — não faz parte do formato salvo (removida em `save`). Ela existe
  // porque `handleFile` é assíncrona: se ela precisasse achar a linha de
  // volta pelo ÍNDICE depois do `await compressImage`, remover uma linha de
  // índice menor enquanto outro upload está em andamento faria o upload
  // "pousar" na linha errada quando terminasse (o índice original passaria a
  // apontar pra outro banner). Com uma chave estável por linha, `update`
  // sempre acha a linha certa não importa quantas outras foram
  // adicionadas/removidas nesse meio tempo.
  const nextKeyRef = useRef(0);
  const withKeys = (arr: any[]) => arr.map((b) => (b && b.__key != null ? b : { ...b, __key: nextKeyRef.current++ }));
  const [banners, setBanners] = useState<any[]>(() => withKeys(Array.isArray(ctx?.draft?.banners) ? ctx!.draft.banners : []));
  const [uploadingKey, setUploadingKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Resincroniza `banners` com o draft toda vez que ESTE painel abre — o
  // componente fica montado o tempo todo (só retorna null quando inativo),
  // então sem isso edições descartadas (fechar sem salvar) continuavam
  // aparecendo se o painel fosse reaberto depois. Dispara só na transição
  // pra activePanel === "banners" (não a cada render com o painel já
  // aberto), senão um re-render por outro motivo enquanto o usuário edita
  // apagaria o trabalho em andamento.
  useEffect(() => {
    if (ctx?.activePanel === "banners") {
      setBanners(withKeys(Array.isArray(ctx?.draft?.banners) ? ctx!.draft.banners : []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activePanel]);
  if (!ctx || ctx.activePanel !== "banners") return null;

  // Só fecha o painel se o patchDraft realmente salvou — se falhar (patchDraft
  // já mostrou o toast de erro), mantém o painel aberto com as edições feitas
  // pra não perder o trabalho do usuário sem chance de tentar de novo.
  const save = async () => {
    setSaving(true);
    try {
      const ok = await ctx.patchDraft({ banners: banners.map(({ __key, ...b }) => b) });
      if (ok) ctx.closePanel();
    } finally {
      setSaving(false);
    }
  };
  // Formas funcionais de setState (prev => ...) em vez de fechar sobre a
  // variável `banners` do render em que a função foi criada — `handleFile` é
  // assíncrona e só chama `update()` depois do `await compressImage(file)`
  // resolver, então se `update`/`remove`/`add` lessem `banners` direto do
  // closure, qualquer edição feita por outra chamada enquanto o upload está
  // em andamento seria sobrescrita (a chamada tardia recalcularia `next` a
  // partir de um `banners` desatualizado e reverteria a edição concorrente).
  // Usando a forma funcional, cada atualização parte sempre do estado mais
  // recente no momento em que roda de fato, não de uma foto antiga.
  // `update`/`handleFile` identificam a linha por `__key` (estável), não por
  // índice — ver comentário acima de `nextKeyRef`.
  const update = (key: number, patch: any) => setBanners((prev) => prev.map((b) => (b.__key === key ? { ...b, ...patch } : b)));
  const remove = (key: number) => setBanners((prev) => prev.filter((b) => b.__key !== key));
  const add = () => setBanners((prev) => [...prev, { url: "", link: "/loja/catalogo", title: "", subtitle: "", posX: 50, __key: nextKeyRef.current++ }]);
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
          <br />A loja mantém a arte inteira, sem cortar, e preenche a sobra de proporção com a própria imagem desfocada.
        </div>
        {banners.map((b, i) => (
          <div key={b.__key} className="rounded-lg border border-stone-200 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-stone-400">Banner {i + 1}</span>
              <button onClick={() => remove(b.__key)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {b.url && (
              <div className="relative mb-2 aspect-[8/3] w-full overflow-hidden rounded-md bg-[#fff7f8]">
                <img src={b.url} alt="" aria-hidden="true" style={{ objectPosition: `${b.posX ?? 50}% 50%` }} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-xl" />
                <img src={b.url} alt={`Prévia do banner ${i + 1}`} style={{ objectPosition: `${b.posX ?? 50}% 50%` }} className="relative h-full w-full object-contain" />
              </div>
            )}
            <label className="mb-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-semibold hover:border-amber-500">
              {uploadingKey === b.__key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Trocar imagem
              <input type="file" accept="image/*" className="hidden" disabled={uploadingKey !== null} onChange={(e) => handleFile(e.target.files?.[0], b.__key)} />
            </label>
            <input value={b.link || ""} onChange={(e) => update(b.__key, { link: e.target.value })} placeholder="Link de destino" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <input value={b.title || ""} onChange={(e) => update(b.__key, { title: e.target.value })} placeholder="Título (opcional — some sem CTA se vazio)" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <input value={b.subtitle || ""} onChange={(e) => update(b.__key, { subtitle: e.target.value })} placeholder="Subtítulo (opcional)" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <label className="block text-[10px] font-semibold text-stone-500">
              Enquadramento horizontal: {Math.round(Number(b.posX ?? 50))}%
              <input type="range" min="0" max="100" value={Number(b.posX ?? 50)} onChange={(e) => update(b.__key, { posX: Number(e.target.value) })} className="mt-1 w-full accent-rose-400" />
            </label>
          </div>
        ))}
        <button onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2 text-sm font-semibold text-stone-500 hover:border-amber-500 hover:text-amber-600">
          <Plus className="h-4 w-4" /> Adicionar banner
        </button>
      </div>
    </PanelShell>
  );
}
