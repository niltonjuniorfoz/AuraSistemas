import React from 'react';
import { Palette, Sun, Moon, Monitor, RotateCcw } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive, ToggleGroup as ToggleGroupPrimitive, Switch as SwitchPrimitive } from 'radix-ui';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from './ui/sheet';
import { cn } from '../lib/utils';
import { useThemeStore, type ColorPreset, type LayoutPreset } from '../stores/themeStore';

const COLOR_PRESETS: { value: ColorPreset; label: string; swatch: string }[] = [
  { value: 'gold', label: 'Dourado', swatch: '#ffd700' },
  { value: 'emerald', label: 'Esmeralda', swatch: '#10b981' },
  { value: 'blue', label: 'Azul', swatch: '#3b82f6' },
  { value: 'violet', label: 'Violeta', swatch: '#8b5cf6' },
  { value: 'orange', label: 'Laranja', swatch: '#f97316' },
  { value: 'slate', label: 'Slate', swatch: '#64748b' },
];

// compact/floating/topnav/hybrid ainda não têm CSS/JSX próprio (ver plano) -
// aparecem desabilitados aqui, mesmo padrão do "Light Mode (Em breve)" que
// já existia em settings/System.tsx antes desse painel existir de verdade.
const LAYOUTS: { value: LayoutPreset; label: string; soon?: boolean }[] = [
  { value: 'sidebar', label: 'Barra lateral' },
  { value: 'mini', label: 'Mini' },
  { value: 'compact', label: 'Compacto', soon: true },
  { value: 'floating', label: 'Flutuante', soon: true },
  { value: 'topnav', label: 'Navegação superior', soon: true },
  { value: 'hybrid', label: 'Híbrido', soon: true },
];

const RADIO_ITEM = "flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-3 text-xs text-muted-foreground transition hover:border-primary/40 data-[state=checked]:border-primary data-[state=checked]:text-foreground data-[state=checked]:[&_svg]:text-primary";
const TOGGLE_ITEM = "rounded-lg border border-border bg-card px-2 py-2 text-xs text-muted-foreground transition hover:border-primary/40 data-[state=on]:border-primary data-[state=on]:text-primary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

export function ThemeCustomizer() {
  const {
    mode, colorPreset, density, layout, container, direction,
    setMode, setColorPreset, setDensity, setLayout, setContainer, setDirection, reset,
  } = useThemeStore();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          title="Personalizar"
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-brand-navydark hover:text-white md:flex"
        >
          <Palette className="h-[18px] w-[18px]" />
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col border-border p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Personalizar</SheetTitle>
          <SheetDescription>Ajuste a aparência do painel administrativo.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <Section title="Tema">
            <RadioGroupPrimitive.Root
              value={mode}
              onValueChange={(v) => v && setMode(v as typeof mode)}
              className="grid grid-cols-3 gap-2"
            >
              {([
                { value: 'light', label: 'Claro', icon: Sun },
                { value: 'dark', label: 'Escuro', icon: Moon },
                { value: 'system', label: 'Sistema', icon: Monitor },
              ] as const).map(({ value, label, icon: Icon }) => (
                <RadioGroupPrimitive.Item key={value} value={value} className={RADIO_ITEM}>
                  <Icon className="h-4 w-4" />
                  {label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>
          </Section>

          <Section title="Cor">
            <RadioGroupPrimitive.Root
              value={colorPreset}
              onValueChange={(v) => v && setColorPreset(v as ColorPreset)}
              className="grid grid-cols-3 gap-2"
            >
              {COLOR_PRESETS.map(({ value, label, swatch }) => (
                <RadioGroupPrimitive.Item key={value} value={value} className={RADIO_ITEM}>
                  <span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: swatch }} />
                  {label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>
          </Section>

          <Section title="Densidade">
            <ToggleGroupPrimitive.Root
              type="single"
              value={density}
              onValueChange={(v) => v && setDensity(v as typeof density)}
              className="grid grid-cols-3 gap-2"
            >
              {([
                { value: 'compact', label: 'Compacta' },
                { value: 'comfortable', label: 'Confortável' },
                { value: 'spacious', label: 'Espaçosa' },
              ] as const).map(({ value, label }) => (
                <ToggleGroupPrimitive.Item key={value} value={value} className={TOGGLE_ITEM}>
                  {label}
                </ToggleGroupPrimitive.Item>
              ))}
            </ToggleGroupPrimitive.Root>
          </Section>

          <Section title="Layout">
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map(({ value, label, soon }) => (
                <button
                  key={value}
                  type="button"
                  disabled={soon}
                  onClick={() => setLayout(value)}
                  className={cn(
                    "relative rounded-lg border px-3 py-2.5 text-left text-xs transition",
                    soon
                      ? "cursor-not-allowed border-border/60 bg-card/50 text-muted-foreground/50"
                      : layout === value
                        ? "border-primary bg-card text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {label}
                  {soon && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                      Em breve
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Container">
            <ToggleGroupPrimitive.Root
              type="single"
              value={container}
              onValueChange={(v) => v && setContainer(v as typeof container)}
              className="grid grid-cols-2 gap-2"
            >
              <ToggleGroupPrimitive.Item value="fluid" className={TOGGLE_ITEM}>Fluido</ToggleGroupPrimitive.Item>
              <ToggleGroupPrimitive.Item value="boxed" className={TOGGLE_ITEM}>Boxed</ToggleGroupPrimitive.Item>
            </ToggleGroupPrimitive.Root>
          </Section>

          <Section title="Direção">
            <label className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
              <span>
                <span className="block text-sm text-foreground">RTL</span>
                <span className="block text-[11px] text-muted-foreground">Texto da direita pra esquerda</span>
              </span>
              <SwitchPrimitive.Root
                checked={direction === 'rtl'}
                onCheckedChange={(checked) => setDirection(checked ? 'rtl' : 'ltr')}
                className="relative h-5 w-9 shrink-0 rounded-full bg-muted transition data-[state=checked]:bg-primary"
              >
                <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[18px]" />
              </SwitchPrimitive.Root>
            </label>
          </Section>
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
