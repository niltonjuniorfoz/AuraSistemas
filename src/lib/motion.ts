// Checagem de "reduzir movimento" do sistema operacional — mesma lógica já usada em
// src/pages/Login.tsx (shouldShowMobileInstallIntro), extraída aqui pra ser reusada
// tanto pelo AnimatedNumber quanto pelo motion de entrada do Dashboard.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
