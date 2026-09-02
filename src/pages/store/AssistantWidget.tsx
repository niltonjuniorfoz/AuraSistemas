import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Send, MessageCircle, RotateCcw } from "lucide-react";
import i18nInstance from "./i18n";

type ChatMsg = { role: "user" | "model"; text: string };

// Widget de chat com IA — substitui o antigo botão flutuante que só linkava
// pro WhatsApp. Fechado: bolha de saudação + botão redondo verde (mesmo
// visual de sempre). Aberto: painel de chat que chama a IA de verdade; o
// WhatsApp real continua existindo só como link de rodapé, sem mostrar o
// número em texto (só no href).
export function AssistantWidget({ wa }: { wa: string | null }) {
  const { t } = useTranslation();
  const [greetingOpen, setGreetingOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  if (!wa) return null;

  const openPanel = () => { setPanelOpen(true); setGreetingOpen(false); };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const nextMessages: ChatMsg[] = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/store/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: nextMessages.slice(0, -1), lang: i18nInstance.language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.code === "AI_RATE_LIMIT" ? t("assistant.erroLimite") : t("assistant.erroGenerico"));
        return;
      }
      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch {
      setError(t("assistant.erroGenerico"));
    } finally {
      setSending(false);
    }
  };

  const quickQuestions = [
    t("assistant.perguntaProdutos"),
    t("assistant.perguntaPagamento"),
    t("assistant.perguntaPedido"),
    t("assistant.perguntaCategorias"),
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5 sm:bottom-6 sm:right-6">
      {panelOpen && (
        <div className="flex h-[70vh] max-h-[520px] w-[92vw] max-w-[360px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 bg-[#075E54] px-4 py-3 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15"><MessageCircle className="h-4 w-4" /></span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-bold">{t("assistant.titulo")}</div>
                <div className="flex items-center gap-1 text-[11px] text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t("assistant.titulo")}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => { setMessages([]); setError(null); }} aria-label={t("assistant.reiniciar")} title={t("assistant.reiniciar")}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setPanelOpen(false)} aria-label={t("whatsapp.fechar", "Fechar")} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto bg-[#e5ddd5] p-3">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-stone-800 shadow-sm">
              {t("assistant.saudacaoInicial")}
            </div>
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.role === "user" ? "ml-auto rounded-br-sm bg-[#dcf8c6] text-stone-800" : "rounded-tl-sm bg-white text-stone-800"}`}>
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-stone-400 shadow-sm">{t("assistant.digitando")}</div>
            )}
            {error && (
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm">{error}</div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                {quickQuestions.map((q) => (
                  <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-[#25D366] bg-white px-3 py-1.5 text-left text-xs font-medium text-[#075E54] transition hover:bg-[#25D366]/10">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 bg-white p-2.5">
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("assistant.placeholder")}
                className="h-10 flex-1 rounded-full border border-stone-200 bg-stone-100 px-4 text-sm outline-none focus:border-[#25D366]" />
              <button type="submit" disabled={sending || !input.trim()} aria-label="Enviar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
            <a href={wa} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[#075E54] hover:underline">
              <MessageCircle className="h-3.5 w-3.5" /> {t("assistant.falarWhatsapp")}
            </a>
          </div>
        </div>
      )}

      {!panelOpen && (
        <>
          {greetingOpen && (
            <div role="button" tabIndex={0} onClick={openPanel} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openPanel(); }}
              className="relative max-w-[220px] cursor-pointer rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm text-stone-700 shadow-lg">
              <button type="button" onClick={(e) => { e.stopPropagation(); setGreetingOpen(false); }} aria-label={t("whatsapp.fechar", "Fechar")}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-stone-600 shadow-sm transition hover:bg-stone-300">
                <X className="h-3 w-3" />
              </button>
              {t("whatsapp.saudacao")}
            </div>
          )}
          <button type="button" onClick={openPanel} aria-label={t("assistant.titulo")}
            className="flex h-14 w-14 shrink-0 items-center justify-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#20bd5a]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
