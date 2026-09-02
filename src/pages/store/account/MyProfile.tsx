import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { storeApiFetch } from "../../../lib/storeApi";
import { useCustomerAuthStore } from "../../../stores/customerAuth";

const inputCls = "h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600";
const labelCls = "mb-1 block text-xs font-medium text-stone-500";
const btnCls = "rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-50";

export function MyProfile() {
  const { t } = useTranslation();
  const customer = useCustomerAuthStore((s) => s.customer);
  const setAuth = useCustomerAuthStore((s) => s.setAuth);
  const token = useCustomerAuthStore((s) => s.token);
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(""); setErr("");
    try {
      const res = await storeApiFetch("/api/store/account/me", { method: "PUT", body: JSON.stringify({ name, phone, email: email || undefined }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || t("account.erroGenerico")); return; }
      setAuth(token!, data);
      setMsg(t("account.dadosSalvos"));
    } catch { setErr(t("account.erroGenerico")); }
    finally { setSaving(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true); setPwMsg(""); setPwErr("");
    try {
      const res = await storeApiFetch("/api/store/account/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (!res.ok) { setPwErr(data.error || t("account.erroGenerico")); return; }
      setCurrentPassword(""); setNewPassword("");
      setPwMsg(t("account.senhaAlterada"));
    } catch { setPwErr(t("account.erroGenerico")); }
    finally { setPwSaving(false); }
  }

  if (!customer) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="max-w-md space-y-3 rounded-sm border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-bold text-stone-900">{t("account.navDados")}</h3>
        {msg && <p className="rounded-sm border border-emerald-300 bg-emerald-50 p-2 text-[12px] text-emerald-700">{msg}</p>}
        {err && <p className="rounded-sm border border-red-300 bg-red-50 p-2 text-[12px] text-red-600">{err}</p>}
        <div>
          <label className={labelCls}>{t("account.nomeLabel")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("account.whatsappLabel")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("account.emailOpcional")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <button disabled={saving} className={btnCls}>{saving ? t("account.salvando") : t("account.salvar")}</button>
      </form>

      <form onSubmit={changePassword} className="max-w-md space-y-3 rounded-sm border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-bold text-stone-900">{t("account.trocarSenha")}</h3>
        {pwMsg && <p className="rounded-sm border border-emerald-300 bg-emerald-50 p-2 text-[12px] text-emerald-700">{pwMsg}</p>}
        {pwErr && <p className="rounded-sm border border-red-300 bg-red-50 p-2 text-[12px] text-red-600">{pwErr}</p>}
        <div>
          <label className={labelCls}>{t("account.senhaAtual")}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("account.novaSenha")}</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputCls} />
        </div>
        <button disabled={pwSaving} className={btnCls}>{pwSaving ? t("account.salvando") : t("account.trocarSenha")}</button>
      </form>
    </div>
  );
}
