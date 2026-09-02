import React from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Package, User, MapPin, Heart, LogOut } from "lucide-react";
import { useCustomerAuthStore } from "../../../stores/customerAuth";
import { AccountAuth } from "./AccountAuth";

// Casca de "Minha Conta": nav lateral + conteúdo. Se não estiver logado, mostra o
// AccountAuth em vez da nav — mesma tela serve pra "Entrar" e pra qualquer sub-rota protegida.
export function AccountLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const customer = useCustomerAuthStore((s) => s.customer);
  const logout = useCustomerAuthStore((s) => s.logout);

  if (!customer) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <AccountAuth title={t("account.entrarTitulo")} />
      </div>
    );
  }

  const links = [
    { to: "/loja/conta/pedidos", label: t("account.navPedidos"), icon: Package },
    { to: "/loja/conta/dados", label: t("account.navDados"), icon: User },
    { to: "/loja/conta/enderecos", label: t("account.navEnderecos"), icon: MapPin },
    { to: "/loja/conta/favoritos", label: t("account.navFavoritos"), icon: Heart },
  ];

  return (
    <div className="mx-auto w-[95%] md:w-[90%] max-w-[1100px] px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-56 shrink-0">
          <p className="mb-3 truncate text-sm text-stone-500">{t("account.ola", { name: customer.name.split(" ")[0] })}</p>
          <nav className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
            {links.map((l) => {
              const active = location.pathname === l.to;
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to}
                  className={`flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                  <Icon className="h-4 w-4" /> {l.label}
                </Link>
              );
            })}
            <button onClick={logout} className="flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 md:mt-3">
              <LogOut className="h-4 w-4" /> {t("account.sair")}
            </button>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          {location.pathname === "/loja/conta" ? <Navigate to="/loja/conta/pedidos" replace /> : <Outlet />}
        </div>
      </div>
    </div>
  );
}
