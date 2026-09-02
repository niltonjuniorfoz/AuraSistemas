import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorPreset = 'gold' | 'emerald' | 'blue' | 'violet' | 'orange' | 'slate';
export type Density = 'compact' | 'comfortable' | 'spacious';
// compact/floating/topnav/hybrid ainda não têm CSS/JSX próprio — ficam "Em
// breve" no painel (ver ThemeCustomizer.tsx), mas já existem aqui pra não
// precisar mexer no formato do store quando forem implementados.
export type LayoutPreset = 'sidebar' | 'mini' | 'compact' | 'floating' | 'topnav' | 'hybrid';
export type Container = 'fluid' | 'boxed';
export type Direction = 'ltr' | 'rtl';

interface ThemeState {
  mode: ThemeMode;
  colorPreset: ColorPreset;
  density: Density;
  layout: LayoutPreset;
  container: Container;
  direction: Direction;
  sidebarCollapsed: boolean;
  setMode: (mode: ThemeMode) => void;
  setColorPreset: (preset: ColorPreset) => void;
  setDensity: (density: Density) => void;
  setLayout: (layout: LayoutPreset) => void;
  setContainer: (container: Container) => void;
  setDirection: (direction: Direction) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  reset: () => void;
}

const DEFAULTS = {
  mode: 'dark' as ThemeMode,
  colorPreset: 'orange' as ColorPreset,
  density: 'compact' as Density,
  layout: 'sidebar' as LayoutPreset,
  container: 'fluid' as Container,
  direction: 'ltr' as Direction,
  // Padrao visual oficial do Aura: barra lateral expandida. O usuario pode
  // recolher depois normalmente pelo proprio painel.
  sidebarCollapsed: false,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({ mode }),
      setColorPreset: (colorPreset) => set({ colorPreset }),
      setDensity: (density) => set({ density }),
      setLayout: (layout) => set({ layout }),
      setContainer: (container) => set({ container }),
      setDirection: (direction) => set({ direction }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'origin-admin-theme',
      version: 2,
      // Aplica o novo preset oficial uma unica vez inclusive para navegadores
      // que tinham a versao anterior persistida. Depois disso as escolhas do
      // usuario voltam a ser preservadas normalmente.
      migrate: (persisted: any, version) => version < 2 ? { ...persisted, ...DEFAULTS } : persisted,
    }
  )
);
