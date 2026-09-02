import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { storeApiFetch } from "../../../lib/storeApi";

const inputCls = "h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600";
const labelCls = "mb-1 block text-xs font-medium text-stone-500";
const emptyForm = { label: "Casa", cep: "", street: "", number: "", neighborhood: "", city: "", state: "", isDefault: false };

export function MyAddresses() {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<any[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = () => storeApiFetch("/api/store/account/addresses").then((r) => r.json()).then(setAddresses).catch(() => setAddresses([]));
  useEffect(() => { load(); }, []);

  function startNew() { setForm(emptyForm); setEditingId(null); setShowForm(true); setErr(""); }
  function startEdit(a: any) { setForm(a); setEditingId(a.id); setShowForm(true); setErr(""); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr("");
    try {
      const path = editingId ? `/api/store/account/addresses/${editingId}` : "/api/store/account/addresses";
      const res = await storeApiFetch(path, { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || t("account.erroGenerico")); return; }
      setShowForm(false);
      load();
    } catch { setErr(t("account.erroGenerico")); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    await storeApiFetch(`/api/store/account/addresses/${id}`, { method: "DELETE" });
    load();
  }

  if (!addresses) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="space-y-4">
      {!showForm && (
        <button onClick={startNew} className="flex items-center gap-1.5 rounded-sm border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-stone-500">
          <Plus className="h-4 w-4" /> {t("account.novoEndereco")}
        </button>
      )}

      {showForm && (
        <form onSubmit={submit} className="max-w-md space-y-3 rounded-sm border border-stone-200 bg-white p-5">
          {err && <p className="rounded-sm border border-red-300 bg-red-50 p-2 text-[12px] text-red-600">{err}</p>}
          <div>
            <label className={labelCls}>{t("account.apelidoEndereco")}</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Casa, Trabalho..." required className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>CEP</label>
              <input value={form.cep || ""} onChange={(e) => setForm({ ...form, cep: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("account.numero")}</label>
              <input value={form.number || ""} onChange={(e) => setForm({ ...form, number: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("checkout.enderecoLabel")}</label>
            <input value={form.street || ""} onChange={(e) => setForm({ ...form, street: e.target.value })} required className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("account.bairro")}</label>
              <input value={form.neighborhood || ""} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("account.cidade")}</label>
              <input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
            {t("account.enderecoPadrao")}
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:border-stone-500">{t("checkout.voltarBtn")}</button>
            <button disabled={saving} className="rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50">{saving ? t("account.salvando") : t("account.salvar")}</button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showForm && (
        <div className="rounded-sm border border-stone-200 bg-white p-10 text-center">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-stone-300" />
          <p className="text-sm text-stone-500">{t("account.semEnderecos")}</p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-sm border border-stone-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-bold text-stone-900">{a.label}</span>
              {a.isDefault && <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{t("account.padrao")}</span>}
            </div>
            <p className="text-xs text-stone-500">{[a.street, a.number, a.neighborhood, a.city, a.state].filter(Boolean).join(", ") || "—"}</p>
            <div className="mt-2 flex gap-1">
              <button onClick={() => startEdit(a)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(a.id)} className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
