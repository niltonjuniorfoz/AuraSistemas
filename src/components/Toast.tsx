import React, { useSyncExternalStore } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";
export interface ToastItem { id: number; type: ToastType; message: string }

// Store simples (module-level) para disparar toasts de qualquer lugar do app.
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() { listeners.forEach((l) => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return items; }

function remove(id: number) { items = items.filter((i) => i.id !== id); emit(); }
function add(type: ToastType, message: string) {
  const id = nextId++;
  items = [...items, { id, type, message }];
  emit();
  window.setTimeout(() => remove(id), 4000);
}

export const toast = {
  success: (message: string) => add("success", message),
  error: (message: string) => add("error", message),
  info: (message: string) => add("info", message),
};

const STYLE: Record<ToastType, { border: string; bg: string; icon: any; iconColor: string }> = {
  success: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", icon: CheckCircle2, iconColor: "text-emerald-400" },
  error: { border: "border-red-500/40", bg: "bg-red-500/10", icon: XCircle, iconColor: "text-red-400" },
  info: { border: "border-brand-gold/40", bg: "bg-brand-gold/10", icon: Info, iconColor: "text-brand-gold" },
};

export function ToastHost() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (list.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,22rem)] pointer-events-none">
      {list.map((tItem) => {
        const st = STYLE[tItem.type];
        const Icon = st.icon;
        return (
          <div key={tItem.id} className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${st.border} ${st.bg} bg-brand-navydark/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/40 animate-[toastIn_0.2s_ease-out]`}>
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${st.iconColor}`} />
            <span className="text-sm text-gray-100 flex-1 leading-snug">{tItem.message}</span>
            <button onClick={() => remove(tItem.id)} className="text-gray-500 hover:text-white transition shrink-0"><X className="w-4 h-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
