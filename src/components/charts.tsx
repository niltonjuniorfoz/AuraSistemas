import * as React from "react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Bar, BarChart,
} from "recharts";

const GOLD = "#ffd700";
const EMERALD = "#34d399";

const brl = (v: any) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (v: number) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}k`;
  return String(Math.round(n));
};
const dayLabel = (s: string) => { const p = String(s).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}` : s; };

// Tooltip no padrão do painel (escuro, borda sutil). `color`/`formatValue` deixam reaproveitar
// pra qualquer métrica (não só faturamento em R$) sem duplicar o componente.
function DarkTooltip({ active, payload, label, extraKey, color = GOLD, formatValue = brl }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-700 bg-brand-navydark/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{dayLabel(label)}</div>
      <div className="text-sm font-bold" style={{ color }}>{formatValue(payload[0].value)}</div>
      {extraKey && p?.[extraKey] != null && <div className="text-[10px] text-gray-400">{p[extraKey]} venda(s)</div>}
    </div>
  );
}

// Área de tendência por dia (gradient fill + linha de média), padrão Apex. `dataKey`/`color`/
// `formatValue`/`label` com default = comportamento antigo (faturamento em R$, dourado) —
// os outros chamadores (Personal.tsx) continuam funcionando sem mudar nada.
export function RevenueAreaChart({ data, height = 260, dataKey = "total", color = GOLD, formatValue = brl, emptyLabel = "Sem vendas no período." }: {
  data: Array<{ date: string; total: number; count: number; [key: string]: any }>; height?: number;
  dataKey?: string; color?: string; formatValue?: (v: number) => string; emptyLabel?: string;
}) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>{emptyLabel}</div>;
  }
  const avg = data.reduce((a, b) => a + (Number(b[dataKey]) || 0), 0) / data.length;
  const gid = `revFill-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="60%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.06} vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tickFormatter={compact} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<DarkTooltip extraKey="count" color={color} formatValue={formatValue} />} cursor={{ stroke: color, strokeOpacity: 0.35 }} />
        <ReferenceLine y={avg} stroke={EMERALD} strokeOpacity={0.5} strokeDasharray="5 5"
          label={{ value: `média ${compact(avg)}`, fill: EMERALD, fontSize: 10, position: "right" }} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#${gid})`}
          dot={false} activeDot={{ r: 5, fill: color, stroke: "#0a192f", strokeWidth: 2 }} animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Rosca de composição (formas de pagamento / divisão cambial). `format` muda a formatação
// dos valores (padrão: R$) — ex.: contagens usam (v) => `${v} item(s)`.
export function CompositionDonut({ items, height = 190, format = brl }: { items: Array<{ label: string; value: number; color: string }>; height?: number; format?: (v: number) => string }) {
  const total = items.reduce((a, b) => a + (Number(b.value) || 0), 0);
  if (total <= 0) return <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>Sem dados no período.</div>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div style={{ width: 168, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="88%"
              paddingAngle={2} stroke="none" animationDuration={800}>
              {items.map((it, i) => <Cell key={i} fill={it.color} />)}
            </Pie>
            <Tooltip
              content={({ active, payload }: any) => active && payload?.length ? (
                <div className="rounded-lg border border-gray-700 bg-brand-navydark/95 px-3 py-2 shadow-xl">
                  <div className="text-xs text-gray-300">{payload[0].name}</div>
                  <div className="text-sm font-bold text-brand-gold">{format(payload[0].value)}</div>
                  <div className="text-[10px] text-gray-500">{((payload[0].value / total) * 100).toFixed(1)}% do total</div>
                </div>
              ) : null}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-[140px] flex-1 space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 truncate text-gray-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: it.color }} />{it.label}
            </span>
            <span className="whitespace-nowrap font-semibold text-gray-200">{format(it.value)}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-gray-800 pt-1.5 text-xs">
          <span className="text-gray-400">Total</span>
          <span className="font-bold text-brand-gold">{format(total)}</span>
        </div>
      </div>
    </div>
  );
}

// Sparkline de câmbio (área compacta com média e tooltip) — usada no card de câmbio do Financeiro.
export function FxSparkline({ data, height = 72, digits = 2 }: { data: Array<{ day: string; rate: number }>; height?: number; digits?: number }) {
  if (!data || data.length < 2) {
    return <div className="flex items-center justify-center text-[11px] text-gray-600" style={{ height }}>sem histórico suficiente</div>;
  }
  const avg = data.reduce((a, b) => a + b.rate, 0) / data.length;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fxSpark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={({ active, payload }: any) => active && payload?.length ? (
          <div className="rounded border border-gray-700 bg-brand-navydark/95 px-2 py-1 text-[10px] text-gray-200 shadow-xl">
            {payload[0].payload.day}: <b className="text-brand-gold">{Number(payload[0].value).toLocaleString("pt-BR", { maximumFractionDigits: digits })}</b>
          </div>
        ) : null} />
        <ReferenceLine y={avg} stroke={EMERALD} strokeOpacity={0.5} strokeDasharray="3 3" />
        <Area type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={1.5} fill="url(#fxSpark)" dot={false} animationDuration={700} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Barras horizontais para rankings (top produtos).
export function RankingBars({ items, height = 200 }: { items: Array<{ label: string; value: number }>; height?: number }) {
  if (!items?.length) return <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>Sem dados.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={items} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor={GOLD} />
          </linearGradient>
        </defs>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={110} tick={{ fill: "#cbd5e1", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }}
          content={({ active, payload }: any) => active && payload?.length ? (
            <div className="rounded-lg border border-gray-700 bg-brand-navydark/95 px-3 py-2 shadow-xl">
              <div className="text-xs text-gray-300">{payload[0].payload.label}</div>
              <div className="text-sm font-bold text-brand-gold">{brl(payload[0].value)}</div>
            </div>
          ) : null} />
        <Bar dataKey="value" fill="url(#barFill)" radius={[0, 6, 6, 0]} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  );
}
