// Filtros de período (dateFrom/dateTo) chegam do front como string "YYYY-MM-DD" — o dia
// já calculado no fuso do negócio. O bug recorrente era `new Date(\`${d}T00:00:00\`)`: sem
// sufixo de fuso, o JS interpreta como hora LOCAL DO PROCESSO Node, não do negócio. Em produção
// (Render roda em UTC) isso desloca o corte do dia perto da virada. Ancorar em UTC explícito
// (`Z`) torna o corte determinístico, o mesmo em qualquer servidor, sempre o dia informado.
export function dayStartUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function dayEndUtc(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}
