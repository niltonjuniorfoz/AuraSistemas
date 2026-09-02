import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '../stores/authStore';
import { useAdminTranslation } from '../lib/i18n';
import { apiFetch } from '../lib/api';
import { Users, Package, FileText, Settings, LogOut, Tags, Menu, X, ChevronLeft, ChevronRight, ShoppingCart, Wallet, PackageSearch, Truck, Shield, LayoutGrid, List, ArrowRightLeft, LayoutDashboard, HandCoins, Receipt, Keyboard as KeyboardIcon, PiggyBank, UserRound, Store, Brain, ShoppingBag, PackageCheck, Bell, LineChart } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GlobalCalculator } from './GlobalCalculator';
import { CommandPalette, CommandTrigger } from './CommandPalette';
import { ThemeCustomizer } from './ThemeCustomizer';
import { NotificationBell } from './NotificationBell';
import { CashRegisterBadge } from './CashRegisterBadge';
import { HeaderClock } from './HeaderClock';
import { useThemeStore } from '../stores/themeStore';
import { APP_VERSION } from '../lib/version';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const POS_LAYOUT_MODE_KEY = 'origin:pos:layout-mode';
type PosLayoutMode = 'classic' | 'catalog';
const getStoredPosLayoutMode = (): PosLayoutMode => {
  if (typeof window === 'undefined') return 'classic';
  return window.localStorage.getItem(POS_LAYOUT_MODE_KEY) === 'catalog' ? 'catalog' : 'classic';
};

export function Layout() {
  const { user, logout } = useAuthStore();
  const { t } = useAdminTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = String(user?.role || '').toLowerCase();
  const userName = String((user as any)?.username || '').toLowerCase();
  const userEmail = String(user?.email || '').toLowerCase();
  const isMasterUser = userRole === 'master' || userName === 'master' || userEmail === 'master@origin.local';

  const {
    mode: themeMode, colorPreset, density, layout, container, direction,
    sidebarCollapsed, toggleSidebarCollapsed,
  } = useThemeStore();
  const isMini = layout === 'mini';
  const collapsed = isMini || sidebarCollapsed;

  // "system" segue o SO em tempo real (troca de tema do Windows/macOS
  // durante o uso já reflete aqui, sem precisar recarregar a página).
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const resolvedTheme = themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [backupNotice, setBackupNotice] = useState<{ status: 'SUCCESS' | 'FAILED'; text: string } | null>(null);
  const [posLayoutMode, setPosLayoutMode] = useState<PosLayoutMode>(() => getStoredPosLayoutMode());
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;
    if (!isDesktop) return;

    setShowFullscreenHint(true);
    const timer = window.setTimeout(() => setShowFullscreenHint(false), 6000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;
    const allowedRole = ['admin', 'master'].includes(userRole);
    if (!isDesktop || !allowedRole) return;

    const startTimer = window.setTimeout(async () => {
      try {
        const res = await apiFetch('/api/settings/backup-status');
        const json = await res.json().catch(() => ({}));
        const backup = json.backup || {};
        const lastRunTime = backup.lastRunAt ? new Date(backup.lastRunAt).getTime() : 0;
        const recent = lastRunTime > 0 && Date.now() - lastRunTime < 5 * 60 * 1000;
        if (!res.ok || !recent || !['SUCCESS', 'FAILED'].includes(backup.lastRunStatus)) return;

        const label = new Date(backup.lastRunAt).toLocaleString('pt-BR');
        setBackupNotice({
          status: backup.lastRunStatus,
          text: backup.lastRunStatus === 'SUCCESS'
            ? `Backup feito em ${label}.`
            : `Backup falhou em ${label}.`,
        });
      } catch {
        return;
      }
    }, 6500);

    return () => window.clearTimeout(startTimer);
  }, [userRole]);

  useEffect(() => {
    if (!backupNotice) return;
    const timer = window.setTimeout(() => setBackupNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [backupNotice]);



  // Abrir menu lateral no celular com gesto da esquerda para a direita.
  // Observação: em navegador comum, o gesto extremo da borda ainda pode ser interceptado pelo Safari/Chrome.
  // Dentro do app instalado na tela inicial funciona de forma mais natural.
  useEffect(() => {
    const isTouch = window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;
    if (!isTouch) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (isMobileMenuOpen) return;
      const touch = event.touches[0];
      if (!touch) return;
      // Começa um pouco mais para dentro para evitar o gesto nativo do navegador de voltar página.
      if (touch.clientX >= 44 && touch.clientX <= 180) {
        swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      const start = swipeStartRef.current;
      if (!start || isMobileMenuOpen) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (dx > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start || isMobileMenuOpen) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = Math.abs(touch.clientY - start.y);
      if (dx > 58 && dx > dy * 1.25) {
        setIsMobileMenuOpen(true);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on desktop/resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Permite que componentes fixos/absolutos do conteúdo reajam ao menu mobile aberto.
  useEffect(() => {
    document.body.classList.toggle('origin-mobile-sidebar-open', isMobileMenuOpen);
    return () => document.body.classList.remove('origin-mobile-sidebar-open');
  }, [isMobileMenuOpen]);

  const togglePosLayoutMode = () => {
    const nextMode: PosLayoutMode = posLayoutMode === 'catalog' ? 'classic' : 'catalog';
    setPosLayoutMode(nextMode);
    window.localStorage.setItem(POS_LAYOUT_MODE_KEY, nextMode);
    window.dispatchEvent(new CustomEvent('origin:pos-layout-change', { detail: nextMode }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups = [
    {
      label: t('menu.operation') || 'Operação',
      items: [
        { name: 'Painel', path: '/painel', icon: LayoutDashboard },
        { name: t('menu.pos'), path: '/pos', icon: ShoppingCart },
        { name: t('menu.cash'), path: '/cash', icon: Wallet },
        { name: 'Financeiro', path: '/finance', icon: PiggyBank },
        { name: 'Pessoal', path: '/personal', icon: UserRound },
        { name: 'Contas a Receber', path: '/receivables', icon: HandCoins },
        { name: 'Separação', path: '/separation', icon: PackageCheck },
        { name: 'Entregas', path: '/delivery', icon: Truck },
        { name: t('menu.sales'), path: '/sales', icon: FileText },
      ]
    },
    {
      label: t('menu.registries') || 'Cadastros',
      items: [
        { name: t('menu.products'), path: '/products', icon: Package },
        { name: t('menu.groups'), path: '/groups', icon: Tags },
        { name: t('menu.customers'), path: '/customers', icon: Users },
      ]
    },
    {
      label: t('menu.purchases_label') || 'Compras / Entrada',
      items: [
        { name: t('menu.suppliers'), path: '/suppliers', icon: Truck },
        { name: t('menu.purchases'), path: '/purchases', icon: PackageSearch },
        { name: 'Contas a Pagar', path: '/payables', icon: Receipt },
        { name: 'Transferências', path: '/transfers', icon: ArrowRightLeft },
      ]
    },
    {
      label: 'Loja Online',
      items: [
        { name: 'Análises', path: '/analytics', icon: LineChart },
        { name: 'Pedidos da Loja', path: '/store-orders', icon: ShoppingBag },
        { name: 'Carrinhos Abandonados', path: '/abandoned-carts', icon: ShoppingCart },
        { name: 'Config. da Loja', path: '/store-settings', icon: Store },
      ]
    },
    {
      label: t('menu.reports_label') || 'Relatórios',
      items: [
        { name: t('menu.reports'), path: '/reports', icon: FileText },
        { name: 'Inteligência', path: '/intelligence', icon: Brain },
        { name: 'Notificações', path: '/notifications', icon: Bell }
      ]
    },
    {
      label: t('menu.admin_label') || 'Administração',
      items: [
        { name: t('menu.users'), path: '/users', icon: Users },
        ...((userRole === 'admin' || isMasterUser) ? [{ name: t('menu.settings'), path: '/settings', icon: Settings }] : []),
        ...(isMasterUser ? [{ name: 'Painel Master', path: '/master', icon: Shield }] : []),
      ]
    }
  ];

  // Helper to find the current active item name
  const allItems = navGroups.flatMap(g => g.items);
  const currentRouteName = allItems.find(i => location.pathname === i.path || (i.path !== '/' && location.pathname.startsWith(i.path)))?.name || 'OMEGA PY';

  return (
    <div
      data-theme={resolvedTheme}
      data-color-preset={colorPreset}
      data-density={density}
      data-layout={layout}
      data-container={container}
      dir={direction}
      className="h-dvh min-h-dvh bg-background flex flex-col md:flex-row overflow-hidden"
    >
      {showFullscreenHint && (
        <div className="origin-toast fixed left-1/2 top-4 z-[70] hidden w-[min(92vw,25rem)] -translate-x-1/2 md:flex items-start gap-3 rounded-xl border border-brand-gold/30 bg-brand-navydark/95 px-4 py-3 text-sm text-gray-100 shadow-2xl shadow-black/30">
          <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-gold" />
          <div>
            <div className="font-semibold text-brand-gold">Modo tela cheia</div>
            <div className="text-gray-300">Para trabalhar em tela cheia, pressione <strong>F11</strong>. Para sair, pressione <strong>F11</strong> novamente.</div>
          </div>
        </div>
      )}
      {!showFullscreenHint && backupNotice && (
        <div className={cn(
          "origin-toast fixed left-1/2 top-4 z-[70] hidden w-[min(92vw,25rem)] -translate-x-1/2 md:flex items-start gap-3 rounded-xl bg-brand-navydark/95 px-4 py-3 text-sm text-gray-100 shadow-2xl shadow-black/30",
          backupNotice.status === 'SUCCESS' ? "border border-green-500/30" : "border border-red-500/30"
        )}>
          <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", backupNotice.status === 'SUCCESS' ? "bg-green-400" : "bg-red-400")} />
          <div>
            <div className={cn("font-semibold", backupNotice.status === 'SUCCESS' ? "text-green-300" : "text-red-300")}>
              {backupNotice.status === 'SUCCESS' ? 'Backup concluido' : 'Backup nao realizado'}
            </div>
            <div className="text-gray-300">{backupNotice.text}</div>
          </div>
        </div>
      )}
      
      {/* Mobile Header Overlay & Drawer Background */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-brand-navydark/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-background border-r border-sidebar-border flex flex-col shrink-0 z-50 transition-all duration-300",
          "fixed inset-y-0 left-0 transform md:sticky md:top-0 md:transform-none h-dvh max-h-dvh",
          isMini ? "group/sidebar md:w-20 md:hover:w-60" : (collapsed ? "md:w-20" : "md:w-60"),
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-[var(--density-header-h)] flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          <div className={cn("text-brand-gold font-bold tracking-widest flex items-baseline overflow-hidden", collapsed ? (isMini ? "md:hidden md:group-hover/sidebar:flex" : "md:hidden") : "")}>
            OMEGA<span className="text-red-500">PY</span>
          </div>
          {collapsed && (
            <div className={cn("hidden md:flex mx-auto w-full justify-center", isMini && "md:group-hover/sidebar:hidden")}>
              <img src="/icons/omegapy-logo.png?v=274" alt="OMEGA PY" className="h-8 w-8 rounded-sm object-contain" />
            </div>
          )}
          
          <button 
            className="mobile-menu-button md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* overflow-y-auto: a lista cresceu (Pessoal, Pedidos da Loja) e não pode cortar itens */}
        <nav className="min-h-0 flex-1 py-3 flex flex-col gap-3 px-2 overflow-y-auto overflow-x-hidden">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                  {group.label}
                </div>
              )}
              {collapsed && (
                <div className={cn("mx-auto w-8 border-t border-sidebar-border mb-1 mt-2 first:mt-0 first:border-0", isMini && "md:group-hover/sidebar:hidden")} />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[var(--density-nav-py)] text-sm transition-all",
                      isActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white",
                      collapsed ? (isMini ? "md:justify-center md:group-hover/sidebar:justify-start" : "md:justify-center") : ""
                    )}
                  >
                    {/* indicador lateral do item ativo (padrão Apex) */}
                    {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                    <Icon className={cn("shrink-0 transition-colors", collapsed ? "w-5 h-5" : "w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-gray-200")} />
                    <span className={cn("truncate", collapsed ? (isMini ? "md:hidden md:group-hover/sidebar:inline" : "md:hidden") : "")}>
                      {item.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className={cn("shrink-0 p-3 border-t border-sidebar-border text-xs overflow-hidden", collapsed ? "md:px-2 md:pb-4 md:pt-3" : "")}>
          <div className={cn("flex items-center gap-2.5", collapsed ? (isMini ? "md:hidden md:group-hover/sidebar:flex" : "md:hidden") : "")}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary ring-1 ring-primary/30">
              {String(user?.name || "?").trim().slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-200">{user?.name}</div>
              <div className="truncate text-[11px] text-primary">{user?.role}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title={collapsed ? (t('menu.logout') || 'Sair') : undefined}
            className={cn(
              "flex items-center gap-2 text-red-400 hover:text-red-300 px-2 py-1.5 rounded hover:bg-white/5 transition",
              collapsed ? "md:justify-center md:mt-0 mt-3 w-full" : "w-full mt-3"
            )}
          >
            <LogOut className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
            <span className={cn(collapsed ? (isMini ? "md:hidden md:group-hover/sidebar:inline" : "md:hidden") : "")}>{t('menu.logout') || 'Sair do sistema'}</span>
          </button>

          <div className={cn("text-gray-500 text-[10px] mt-2 px-2", collapsed ? (isMini ? "md:hidden md:group-hover/sidebar:block" : "md:hidden") : "")}>
            V. {APP_VERSION}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        <header className="app-header h-[var(--density-header-h)] border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-10 w-full">
          <div className="flex items-center gap-4">
            <button 
              className="mobile-menu-button md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-medium text-gray-200 truncate">
              {currentRouteName}
            </h1>
          </div>

          <HeaderClock />

          <div className="flex items-center gap-2">
            <CashRegisterBadge />
            <CommandTrigger />
            <GlobalCalculator />
            <ThemeCustomizer />
            <NotificationBell />
            {location.pathname.startsWith('/pos') && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('origin:pos-open-shortcuts'))}
                title="Atalhos do teclado"
                className="hidden md:flex h-9 items-center gap-2 rounded-lg border border-gray-700 bg-[#171717] px-3 text-sm text-gray-400 transition hover:border-brand-gold hover:text-brand-gold"
              >
                <KeyboardIcon className="w-4 h-4" /> Atalhos
              </button>
            )}
            {location.pathname.startsWith('/pos') && (
              <button
                type="button"
                onClick={togglePosLayoutMode}
                title={posLayoutMode === 'catalog' ? 'Voltar para o PDV clássico' : 'Usar PDV em grade'}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border transition",
                  posLayoutMode === 'catalog'
                    ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    : "border-gray-700 bg-[#171717] text-gray-400 hover:border-brand-gold hover:text-brand-gold"
                )}
              >
                {posLayoutMode === 'catalog' ? <List className="h-4.5 w-4.5" /> : <LayoutGrid className="h-4.5 w-4.5" />}
              </button>
            )}
            {!isMini && (
              <button
                className="hidden md:flex text-gray-400 hover:text-white p-1 rounded-full hover:bg-brand-navydark transition-colors"
                onClick={toggleSidebarCollapsed}
                title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
              </button>
            )}
          </div>
        </header>

        <div className={cn(
          "app-content p-3 md:p-[var(--density-content-p)] flex-1 w-full mx-auto overflow-y-auto scroll-smooth",
          container === 'boxed' && "max-w-[1400px]"
        )}>
          <Outlet />
        </div>
      </main>

      {/* Paleta de comandos global (Ctrl+K / ⌘K) */}
      <CommandPalette />
    </div>
  );
}
