import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, LifeBuoy, Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import {
  SYSTEM_BRAND,
  buildPlatformCopyrightBase,
  buildSupportMessage,
  buildSupportWhatsAppUrl,
} from "../lib/branding";

export function Support() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Suporte | ${SYSTEM_BRAND.name}`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const supportMessage = useMemo(
    () => buildSupportMessage({ name, contact, message }),
    [name, contact, message],
  );

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({
          type: "error",
          text: data?.error || "Não foi possível enviar o chamado agora. Use o WhatsApp do suporte.",
        });
        return;
      }

      setFeedback({ type: "success", text: "Chamado enviado com sucesso. A equipe de suporte recebeu sua mensagem." });
      setMessage("");
    } catch {
      setFeedback({ type: "error", text: "Não foi possível conectar ao canal de e-mail. Use o WhatsApp do suporte." });
    } finally {
      setSending(false);
    }
  };

  const whatsappUrl = buildSupportWhatsAppUrl(supportMessage);

  return (
    <div className="min-h-screen bg-brand-navydark text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-brand-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-gold">Aura</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Suporte</div>
          </div>
        </header>

        <main className="flex flex-1 items-center py-8 sm:py-12">
          <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="relative overflow-hidden rounded-2xl border border-gray-800 bg-brand-navylight p-6 shadow-2xl sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-brand-gold" />

              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand-gold/25 bg-brand-gold/10 text-brand-gold">
                  <LifeBuoy className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Problemas para acessar?</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                    Descreva o que está acontecendo. Você pode abrir um chamado por e-mail ou enviar a mesma solicitação diretamente pelo WhatsApp.
                  </p>
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-300">Nome</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      maxLength={100}
                      placeholder="Seu nome"
                      className="block w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-300">E-mail ou telefone</span>
                    <input
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      maxLength={140}
                      placeholder="Como podemos retornar?"
                      className="block w-full rounded-lg border border-gray-700 bg-[#171717] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-300">Mensagem</span>
                  <textarea
                    required
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={2500}
                    rows={7}
                    placeholder="Explique o problema de acesso, erro apresentado ou o que você precisa resolver."
                    className="block w-full resize-y rounded-lg border border-gray-700 bg-[#171717] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                  />
                </label>

                {feedback && (
                  <div
                    className={`flex items-start gap-2 rounded-lg border p-3 text-sm leading-5 ${
                      feedback.type === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                    }`}
                  >
                    {feedback.type === "success"
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={!message.trim() || sending}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-3 text-sm font-bold text-brand-navydark transition hover:bg-brand-goldhover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    {sending ? "Enviando..." : "Enviar chamado"}
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!message.trim()}
                    onClick={(event) => {
                      if (!message.trim()) event.preventDefault();
                    }}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                      message.trim()
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                        : "cursor-not-allowed border-gray-800 bg-gray-900/40 text-gray-600"
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar pelo WhatsApp
                  </a>
                </div>
              </form>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-gray-800 bg-brand-navylight p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                  <h2 className="font-bold">WhatsApp do suporte</h2>
                </div>
                <p className="text-sm leading-6 text-gray-400">
                  Para atendimento mais rápido, fale diretamente com a equipe responsável pela plataforma.
                </p>
                <a
                  href={buildSupportWhatsAppUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/15"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chamar no WhatsApp
                </a>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-brand-navylight p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <Send className="h-5 w-5 text-brand-gold" />
                  <h2 className="font-bold">E-mail</h2>
                </div>
                <p className="break-all text-sm text-gray-300">{SYSTEM_BRAND.supportEmail}</p>
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-gray-800 bg-[#111]/60 p-3 text-xs leading-5 text-gray-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <span>
                    A referência técnica da plataforma acompanha o contato para identificar corretamente o ambiente que originou a solicitação.
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </main>

        <footer className="py-5 text-center">
          <p className="text-[10px] text-gray-500" data-platform-copyright="true">
            {buildPlatformCopyrightBase(SYSTEM_BRAND.name)}
            <span
              data-platform-reference="true"
              className="ml-1 align-baseline text-[7px] tracking-[0.08em] text-gray-600"
              title="Referência técnica da plataforma"
            >
              {SYSTEM_BRAND.platformId}
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}
