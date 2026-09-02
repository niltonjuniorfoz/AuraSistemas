// Compartilhado entre cliente (loja) e servidor — antes cada lado tinha sua
// própria cópia de arredondamento/total/formatação em Real, podendo divergir.

export const round2 = (n: number) => Math.round(n * 100) / 100;

// Tolerância única pra "valor bate" em toda checagem de pagamento (Caixa,
// confirmação de pedido da loja etc.) — antes cada lado tinha seu próprio
// número (0.01 aqui, 0.009 ali) e o mesmo centavo de diferença passava
// silenciosamente num fluxo e era bloqueado no outro.
export const MONEY_EPSILON = 0.009;

export function calcOrderTotal(subtotal: number, discount: number, shippingFee: number) {
  return Math.max(0, round2(subtotal - discount + shippingFee));
}

export function formatBrl(v: any) {
  return `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Aceita valor colado em qualquer formato comum (BR "6.728,40", US "6,728.40",
// ou digitado solto "10,50"/"10.50") e devolve o número. Regra: quando os dois
// separadores aparecem, o que vier por último é o decimal (o outro é milhar).
export function parseMoneyInput(raw: string): number {
  let s = String(raw ?? "").trim();
  if (!s) return NaN;
  s = s.replace(/[^\d.,-]/g, "");
  if (!s) return NaN;
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  if (!s) return NaN;

  const commaCount = (s.match(/,/g) || []).length;
  const dotCount = (s.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    s = lastComma > lastDot ? s.split(".").join("").replace(",", ".") : s.split(",").join("");
  } else if (commaCount > 1) {
    s = s.split(",").join("");
  } else if (dotCount > 1) {
    s = s.split(".").join("");
  } else if (commaCount === 1) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return neg ? -n : n;
}
