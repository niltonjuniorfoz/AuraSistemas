import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { storeApiFetch } from "../../../lib/storeApi";
import { useCustomerAuthStore } from "../../../stores/customerAuth";

const inputCls = "h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600";
const labelCls = "mb-1 block text-xs font-medium text-stone-500";

// Página que o link do e-mail de "esqueci minha senha" abre — ver POST /forgot-password
// em customerAuth.ts (token de curta duração, kind:'password-reset').
export function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const setAuth = useCustomerAuthStore((s) => s.setAuth);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await storeApiFetch("/api/store/account/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("account.erroGenerico")); return; }
      const me = await storeApiFetch("/api/store/account/me", { headers: { Authorization: `Bearer ${data.token}` } }).then((r) => r.json());
      setAuth(data.token, me);
      setDone(true);
      setTimeout(() => navigate("/loja/conta/pedidos"), 1500);
    } catch { setError(t("account.erroGenerico")); }
    finally { setLoading(false); }
  }

  if (!token) return <div className="mx-auto max-w-sm px-4 py-16 text-center text-sm text-stone-500">{t("account.linkInvalido")}</div>;

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="mb-4 text-lg font-bold text-stone-900">{t("account.redefinirSenhaTitulo")}</h1>
      {done ? (
        <p className="rounded-sm border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{t("account.senhaAlterada")}</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="rounded-sm border border-red-300 bg-red-50 p-2 text-[12px] text-red-600">{error}</p>}
          <div>
            <label className={labelCls}>{t("account.novaSenha")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputCls} />
          </div>
          <button disabled={loading} className="h-10 w-full rounded-sm bg-stone-900 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50">
            {loading ? t("account.salvando") : t("account.salvar")}
          </button>
        </form>
      )}
    </div>
  );
}
