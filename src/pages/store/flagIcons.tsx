// Bandeiras desenhadas em SVG em vez de emoji — emoji de bandeira não
// renderiza no Windows/Chrome (cai pro código de 2 letras "BR"/"PY" em vez
// da imagem), então usamos vetor próprio pra garantir que sempre aparece.
import React from "react";

export function BrazilFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 21" preserveAspectRatio="xMidYMid slice" className={className} aria-label="Brasil">
      <rect width="30" height="21" rx="2" fill="#009739" />
      <polygon points="15,2.5 27.5,10.5 15,18.5 2.5,10.5" fill="#FEDD00" />
      <circle cx="15" cy="10.5" r="5" fill="#012169" />
      <path d="M 10.2 8.8 A 5.4 5.4 0 0 1 19.8 12.2" stroke="#fff" strokeWidth="0.9" fill="none" />
    </svg>
  );
}

export function ParaguayFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 21" preserveAspectRatio="xMidYMid slice" className={className} aria-label="Paraguai">
      <rect width="30" height="7" fill="#D52B1E" />
      <rect y="7" width="30" height="7" fill="#fff" />
      <rect y="14" width="30" height="7" fill="#0038A8" />
      <circle cx="15" cy="10.5" r="3.1" fill="#fff" stroke="#D5B72B" strokeWidth="0.4" />
    </svg>
  );
}

export function UsaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 21" preserveAspectRatio="xMidYMid slice" className={className} aria-label="Estados Unidos">
      <rect width="30" height="21" fill="#B22234" />
      {[1.6, 4.8, 8, 11.2, 14.4, 17.6].map((y) => (
        <rect key={y} y={y} width="30" height="1.6" fill="#fff" />
      ))}
      <rect width="13" height="11.2" fill="#3C3B6E" />
    </svg>
  );
}

// Mapa moeda/idioma -> bandeira, pra trocar emoji (nao renderiza no
// Windows/Chrome, so no Apple) por SVG em qualquer lugar que precisar.
const FLAG_BY_CODE: Record<string, React.ComponentType<{ className?: string }>> = {
  BRL: BrazilFlag, pt: BrazilFlag,
  PYG: ParaguayFlag, es: ParaguayFlag,
  USD: UsaFlag, en: UsaFlag,
};

export function CodeFlag({ code, className }: { code: string; className?: string }) {
  const Flag = FLAG_BY_CODE[code];
  return Flag ? <Flag className={className} /> : null;
}
