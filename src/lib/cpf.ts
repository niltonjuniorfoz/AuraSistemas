// Validação de CPF pelos dígitos verificadores. Usada no checkout da loja
// (navegador) e revalidada no servidor — CPF inventado não passa.

export const onlyDigits = (v: any) => String(v || "").replace(/\D/g, "");

export function isValidCpf(value: any): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  // 000.000.000-00, 111... etc. passam na conta dos dígitos, mas não existem.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (upTo: number) => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) sum += Number(cpf[i]) * (upTo + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function formatCpf(value: any): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Nome completo = pelo menos dois nomes com 2+ letras (evita "Joao" ou "J S").
export function isFullName(value: any): boolean {
  const parts = String(value || "").trim().split(/\s+/).filter((p) => p.length >= 2);
  return parts.length >= 2;
}
