import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Wallet } from "lucide-react";
import { apiFetch } from "../lib/api";

// Antes o único jeito de saber se um caixa tinha ficado aberto (por
// esquecimento, ou por 2 abas abrindo caixas diferentes) era entrar na
// própria página Caixa. Esse badge no cabeçalho fica visível em qualquer
// tela do ERP — mesmo padrão de polling silencioso do NotificationBell.
export function CashRegisterBadge() {
  const navigate = useNavigate();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const load = async () => {
    try {
      const res = await apiFetch("/api/cash/registers/current");
      if (res.ok) {
        const data = await res.json();
        setOpenedAt(data?.openedAt || null);
      }
    } catch {
      // silencioso — sem permissão de caixa (ex.: perfil sem acesso) não deve quebrar o cabeçalho
    } finally {
      setChecked(true);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!checked || !openedAt) return null;

  return (
    <button
      onClick={() => navigate("/cash")}
      title={`Caixa aberto desde ${new Date(openedAt).toLocaleString("pt-BR")}`}
      className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      <Wallet className="w-3.5 h-3.5" />
      Caixa aberto
    </button>
  );
}
