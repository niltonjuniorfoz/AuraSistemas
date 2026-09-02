import React from "react";
import { ShimmerButton } from "../../components/ui/shimmer-button";

// Wrapper único pros 5 CTAs "premium" da loja (hero, card de produto, página
// de produto, "Selecionado pra você", checkout) — muda a cor/tamanho aqui e
// atualiza a loja inteira, em vez de configurar o ShimmerButton em 5 lugares.
type PremiumCtaProps = React.ComponentPropsWithoutRef<"button"> & {
  size?: "sm" | "md";
};

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "h-9 gap-1.5 px-4 text-xs",
  md: "h-11 gap-2 px-6 text-sm",
};

export const PremiumCta: React.FC<PremiumCtaProps> = ({ size = "md", className = "", children, ...props }) => {
  return (
    <ShimmerButton
      background="var(--store-accent, #C99C5A)"
      shimmerColor="#ffffff"
      shimmerDuration="2.5s"
      borderRadius="9999px"
      className={`flex w-full items-center justify-center font-bold text-[var(--store-accent-text,#1c1917)] disabled:cursor-not-allowed disabled:opacity-40 ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </ShimmerButton>
  );
};
