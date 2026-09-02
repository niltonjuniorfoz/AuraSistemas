import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, UserPlus, X } from "lucide-react";
import { formatCpf, isValidCpf, onlyDigits } from "../../../lib/cpf";
import { storeApiFetch } from "../../../lib/storeApi";
import { useCustomerAuthStore } from "../../../stores/customerAuth";

const inputCls = "h-10 w-full rounded-sm border border-stone-300 bg-white px-3 text-sm outline-none focus:border-amber-600";
const labelCls = "mb-1 block text-xs font-medium text-stone-500";
const btnCls = "h-10 w-full rounded-sm bg-stone-900 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-50";

type Country = "BR" | "AR" | "PY" | "OTHER";

function PasswordField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} required minLength={6}
          className={`${inputCls} pr-9`} />
        <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// Modelo clássico de mercado: dois painéis sempre visíveis, login à esquerda e criar conta à
// direita (sem etapa escondida) — no checkout (drawer estreito) empilha em 1 coluna via
// `md:grid-cols-2`; na tela solo /loja/conta fica lado a lado de verdade.
export function AccountAuth({ onSuccess, title }: { onSuccess?: () => void; title?: string }) {
  const { t } = useTranslation();
  const setAuth = useCustomerAuthStore((s) => s.setAuth);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [forgotSent, setForgotSent] = useState<string | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regCountry, setRegCountry] = useState<Country>("BR");
  const [regDocument, setRegDocument] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regMarketingOptIn, setRegMarketingOptIn] = useState(false);
  const [regAcceptedTerms, setRegAcceptedTerms] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  const [termsOpen, setTermsOpen] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [termsLoading, setTermsLoading] = useState(false);
  const [canAcceptTerms, setCanAcceptTerms] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);

  async function openTerms() {
    setTermsOpen(true);
    if (termsText) return;
    setTermsLoading(true);
    try {
      const res = await fetch("/api/store/config");
      const data = await res.json();
      setTermsText(String(data?.termsText || ""));
    } catch { /* modal mostra vazio, não trava o cadastro */ }
    finally { setTermsLoading(false); }
  }

  // Só libera o checkbox depois que o texto foi rolado até o fim — se o conteúdo já coube sem
  // precisar rolar (tela muito alta, texto curto), libera direto, senão ninguém conseguiria marcar.
  useEffect(() => {
    if (!termsOpen || termsLoading) return;
    const el = termsScrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) setCanAcceptTerms(true);
  }, [termsOpen, termsLoading, termsText]);

  function handleTermsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setCanAcceptTerms(true);
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(""); setLoginLoading(true);
    try {
      const res = await storeApiFetch("/api/store/account/login", { method: "POST", body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || t("account.erroGenerico")); return; }
      setAuth(data.token, data.customer);
      onSuccess?.();
    } catch { setLoginError(t("account.erroGenerico")); }
    finally { setLoginLoading(false); }
  }

  async function requestReset() {
    if (!loginEmail) { setLoginError(t("account.informeEmailPrimeiro")); return; }
    setLoginError(""); setLoginLoading(true);
    try {
      const res = await storeApiFetch("/api/store/account/forgot-password", { method: "POST", body: JSON.stringify({ email: loginEmail }) });
      const data = await res.json();
      setForgotSent(data.message || t("account.resetEnviado"));
    } catch { setLoginError(t("account.erroGenerico")); }
    finally { setLoginLoading(false); }
  }

  const docLabel = regCountry === "BR" ? t("account.cpfLabel")
    : regCountry === "AR" ? t("account.documentoAR")
    : regCountry === "PY" ? t("account.documentoPY")
    : t("account.documentoOutro");

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    if (regFirstName.trim().length < 2 || regLastName.trim().length < 2) { setRegError(t("account.erroNomeCompleto")); return; }
    if (onlyDigits(regPhone).length < 10) { setRegError(t("account.erroTelefone")); return; }
    if (regCountry === "BR" ? !isValidCpf(regDocument) : regDocument.trim().length < 4) { setRegError(t("account.erroDocumento")); return; }
    if (!regAcceptedTerms) { setRegError(t("account.erroAceiteTermos")); return; }
    setRegLoading(true);
    try {
      const res = await storeApiFetch("/api/store/account/register", {
        method: "POST",
        body: JSON.stringify({
          name: `${regFirstName.trim()} ${regLastName.trim()}`,
          email: regEmail,
          phone: onlyDigits(regPhone),
          document: regCountry === "BR" ? onlyDigits(regDocument) : regDocument.trim(),
          country: regCountry,
          password: regPassword,
          marketingOptIn: regMarketingOptIn,
          acceptedTerms: regAcceptedTerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.error || t("account.erroGenerico")); return; }
      setAuth(data.token, data.customer);
      onSuccess?.();
    } catch { setRegError(t("account.erroGenerico")); }
    finally { setRegLoading(false); }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {title && <h3 className="text-base font-bold text-stone-900 md:col-span-2">{title}</h3>}

      <div className="rounded-sm border border-stone-200 bg-white p-5">
        <h4 className="text-sm font-bold text-stone-900">{t("account.acesseSuaConta")}</h4>
        <p className="mb-3 text-xs text-stone-500">{t("account.informeSeusDados")}</p>
        {loginError && <p className="mb-3 rounded-sm border border-red-300 bg-red-50 p-2 text-[12px] text-red-600">{loginError}</p>}
        <form onSubmit={submitLogin} className="space-y-3">
          <div>
            <label className={labelCls}>{t("account.emailLabel")}</label>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className={inputCls} />
          </div>
          <PasswordField value={loginPassword} onChange={setLoginPassword} label={t("account.senhaLabel")} />
          {forgotSent ? (
            <p className="text-[12px] text-stone-500">{forgotSent}</p>
          ) : (
            <button type="button" onClick={requestReset} className="text-[12px] font-semibold text-amber-700 hover:underline">{t("account.esqueciSenha")}</button>
          )}
          <button disabled={loginLoading} className={btnCls}>{loginLoading ? t("account.entrando") : t("account.acessarConta")}</button>
        </form>
      </div>

      <div className="rounded-sm border border-stone-200 bg-stone-50 p-5">
        {!showRegister ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-4 text-center">
            <UserPlus className="h-8 w-8 text-amber-600" />
            <h4 className="text-sm font-bold text-stone-900">{t("account.novoPorAqui")}</h4>
            <p className="text-xs text-stone-500">{t("account.novoPorAquiDesc")}</p>
            <button type="button" onClick={() => setShowRegister(true)}
              className="mt-2 h-10 w-full rounded-sm border-2 border-stone-900 text-sm font-bold text-stone-900 transition hover:bg-stone-900 hover:text-white">
              {t("account.criarConta")}
            </button>
          </div>
        ) : (
          <>
            <h4 className="text-sm font-bold text-stone-900">{t("account.criarConta")}</h4>
            {regError && <p className="my-2 rounded-sm border border-red-300 bg-red-50 p-2 text-[12px] text-red-600">{regError}</p>}
            <form onSubmit={submitRegister} className="mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("account.nomeLabel")}</label>
                  <input value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("account.sobrenomeLabel")}</label>
                  <input value={regLastName} onChange={(e) => setRegLastName(e.target.value)} required className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("account.paisLabel")}</label>
                <select value={regCountry} onChange={(e) => { setRegCountry(e.target.value as Country); setRegDocument(""); }} className={inputCls}>
                  <option value="AR">{t("account.paisArgentina")}</option>
                  <option value="BR">{t("account.paisBrasil")}</option>
                  <option value="PY">{t("account.paisParaguai")}</option>
                  <option value="OTHER">{t("account.paisOutro")}</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{docLabel}</label>
                <input value={regDocument}
                  onChange={(e) => setRegDocument(regCountry === "BR" ? formatCpf(e.target.value) : e.target.value)}
                  placeholder={regCountry === "BR" ? "000.000.000-00" : undefined}
                  inputMode={regCountry === "BR" ? "numeric" : "text"} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t("account.emailLabel")}</label>
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t("account.whatsappLabel")}</label>
                <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="(00) 00000-0000" required className={inputCls} />
              </div>
              <PasswordField value={regPassword} onChange={setRegPassword} label={t("account.criarSenhaLabel")} />

              <label className="flex items-start gap-2 text-xs text-stone-600">
                <input type="checkbox" checked={regMarketingOptIn} onChange={(e) => setRegMarketingOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
                {t("account.aceitoMarketing")}
              </label>
              <label className={`flex items-start gap-2 text-xs ${canAcceptTerms ? "text-stone-600" : "text-stone-400"}`}>
                <input type="checkbox" checked={regAcceptedTerms} disabled={!canAcceptTerms}
                  onChange={(e) => setRegAcceptedTerms(e.target.checked)} required
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600 disabled:cursor-not-allowed" />
                <span>
                  {t("account.aceitoTermosPrefixo")}{" "}
                  <button type="button" onClick={openTerms} className="font-semibold text-stone-900 underline">{t("account.termosELink")}</button>
                  {!canAcceptTerms && <span className="mt-0.5 block text-[11px] text-amber-700">{t("account.leiaTermosAte")}</span>}
                </span>
              </label>

              <button disabled={regLoading} className={btnCls}>{regLoading ? t("account.criando") : t("account.criarConta")}</button>
            </form>
          </>
        )}
      </div>

      {termsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4" onClick={() => setTermsOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-sm bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <h3 className="text-lg font-bold text-stone-900">{t("account.termosTitulo")}</h3>
              <button onClick={() => setTermsOpen(false)} className="rounded-sm p-2 text-stone-400 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <div ref={termsScrollRef} onScroll={handleTermsScroll} className="flex-1 overflow-y-auto p-4">
              {termsLoading
                ? <p className="text-sm text-stone-500">…</p>
                : <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">{termsText}</p>}
            </div>
            <div className="border-t border-stone-200 p-3 text-center">
              {canAcceptTerms ? (
                <p className="text-[11px] font-semibold text-emerald-700">{t("account.termosLidoCompleto")}</p>
              ) : (
                <p className="text-[11px] text-stone-500">{t("account.leiaTermosAte")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
