import {
  Bath,
  Brush,
  Dumbbell,
  Droplets,
  FlaskConical,
  Gem,
  Gift,
  Palette,
  Scissors,
  Sparkles,
  SprayCan,
  Star,
  Tag,
  Waves,
  type LucideIcon,
} from "lucide-react";

// Ícones permitidos pra categoria da loja — mesmo conjunto lucide simples já
// confirmado (sparkle/tesoura/frasco/gota). Chave salva em product_groups.icon.
export const ICON_OPTIONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "makeup", label: "Maquiagem", Icon: Brush },
  { key: "skincare", label: "Skincare", Icon: Sparkles },
  { key: "hair", label: "Cabelos", Icon: Waves },
  { key: "bath", label: "Corpo e Banho", Icon: Bath },
  { key: "perfume", label: "Perfumes", Icon: SprayCan },
  { key: "gift", label: "Kits e Presentes", Icon: Gift },
  { key: "accessories", label: "Acessórios", Icon: Gem },
  { key: "launch", label: "Lançamentos", Icon: Star },
  { key: "sparkles", label: "Brilho/Beleza", Icon: Sparkles },
  { key: "scissors", label: "Tesoura/Cabelo", Icon: Scissors },
  { key: "palette", label: "Paleta", Icon: Palette },
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
  if (n.includes("lançamento") || n.includes("lancamento") || n.includes("novidade")) return Star;
  if (n.includes("kit") || n.includes("presente")) return Gift;
  if (n.includes("acessório") || n.includes("acessorio")) return Gem;
  if (n.includes("perfum")) return SprayCan;
  if (n.includes("cabelo") || n.includes("capilar")) return Waves;
  if (n.includes("maquia")) return Brush;
  if (n.includes("banho") || n.includes("corpo")) return Bath;
  if (n.includes("skin") || n.includes("pele") || n.includes("facial")) return Sparkles;
  if (n.includes("farm") || n.includes("remédio") || n.includes("remedio") || n.includes("medic")) return FlaskConical;
  if (n.includes("emagre") || n.includes("performance") || n.includes("suplement")) return Dumbbell;
  return Tag;
}
