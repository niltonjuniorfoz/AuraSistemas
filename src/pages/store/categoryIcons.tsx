import { Sparkles, Scissors, Palette, FlaskConical, Dumbbell, Droplets, Tag, type LucideIcon } from "lucide-react";

// Ícones permitidos pra categoria da loja — mesmo conjunto lucide simples já
// confirmado (sparkle/tesoura/frasco/gota). Chave salva em product_groups.icon.
export const ICON_OPTIONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "sparkles", label: "Perfumaria", Icon: Sparkles },
  { key: "scissors", label: "Cabelo", Icon: Scissors },
  { key: "palette", label: "Maquiagem", Icon: Palette },
  { key: "flask", label: "Farmácia", Icon: FlaskConical },
  { key: "dumbbell", label: "Performance", Icon: Dumbbell },
  { key: "droplets", label: "Pele/Corpo", Icon: Droplets },
  { key: "tag", label: "Genérico", Icon: Tag },
];

const ICON_BY_KEY: Record<string, LucideIcon> = Object.fromEntries(ICON_OPTIONS.map((o) => [o.key, o.Icon]));

// Ícone de categoria: usa o que foi escolhido no admin (product_groups.icon)
// quando existir. Categoria antiga, nunca editada, continua adivinhando por
// palavra-chave no nome — mesmo comportamento de sempre, ícone não muda sozinho.
export function categoryIcon(name: string, iconKey?: string | null) {
  if (iconKey && ICON_BY_KEY[iconKey]) return ICON_BY_KEY[iconKey];
  const n = (name || "").toLowerCase();
  if (n.includes("perfum")) return Sparkles;
  if (n.includes("cabelo") || n.includes("capilar")) return Scissors;
  if (n.includes("maquia")) return Palette;
  if (n.includes("farm") || n.includes("remédio") || n.includes("remedio") || n.includes("medic")) return FlaskConical;
  if (n.includes("emagre") || n.includes("performance") || n.includes("suplement")) return Dumbbell;
  if (n.includes("pele") || n.includes("skin") || n.includes("corpo") || n.includes("facial")) return Droplets;
  return Tag;
}
