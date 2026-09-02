import React, { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

// Relógio/data do cabeçalho. Puramente local (sem requisição): usa o relógio
// do próprio computador, então "caiu a internet" não pode travar a hora —
// só troca pra "--:--:--" pra avisar que a hora pode estar dessincronizada
// do servidor enquanto offline.
export function HeaderClock() {
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(typeof navigator === "undefined" || navigator.onLine);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const timeStr = online ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "--:--:--";
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const openCalendar = () => {
    const el = dateInputRef.current;
    if (!el) return;
    const anyEl = el as any;
    if (typeof anyEl.showPicker === "function") anyEl.showPicker();
    else el.focus();
  };

  return (
    <div className="hidden lg:flex h-9 items-center gap-2 rounded-lg border border-gray-800 bg-[#171717] px-3 text-xs">
      <Clock className="w-3.5 h-3.5 text-gray-500" />
      <span className={`font-mono font-semibold tabular-nums ${online ? "text-gray-200" : "text-red-400"}`}>{timeStr}</span>
      <span className="text-gray-700">|</span>
      <button type="button" onClick={openCalendar} title="Abrir calendário" className="relative font-mono text-gray-400 transition hover:text-brand-gold">
        {dateStr}
        <input
          ref={dateInputRef}
          type="date"
          defaultValue={isoDate}
          onChange={() => {}}
          tabIndex={-1}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </button>
    </div>
  );
}
