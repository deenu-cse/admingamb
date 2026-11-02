"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { SelectField } from "@/components/common/select-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { overviewApi } from "@/lib/api/endpoints";
import type { Charts } from "@/lib/api/types";
import { compactTokens, formatDay, formatTokens, humanize } from "@/lib/format";
import { qk } from "@/lib/query-keys";

const AXIS = { tick: { fill: "var(--muted-foreground)", fontSize: 11 }, stroke: "var(--border)", tickLine: false } as const;
const TOOLTIP = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" },
  labelStyle: { color: "var(--muted-foreground)" },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { fill: "var(--accent)", opacity: 0.4 },
} as const;
const PROFIT = "var(--chart-1)";
const LOSS = "var(--chart-2)";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function BetsOverTime({ rows }: { rows: Charts["betsOverTime"] }) {
  const [measure, setMeasure] = useState<"bets" | "staked">("bets");
  const total = rows.reduce((n, r) => n + r[measure], 0);
  return (
    <Card className="gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{measure === "bets" ? "Bets per day" : "Tokens staked per day"}</h2>
        {/* Two scales, so a toggle rather than a second axis. */}
        <div className="flex gap-1" role="group" aria-label="Measure">
          {(["bets", "staked"] as const).map((m) => (
            <Button key={m} size="xs" variant={measure === m ? "secondary" : "ghost"} aria-pressed={measure === m} onClick={() => setMeasure(m)}>
              {m === "bets" ? "Bets" : "Staked"}
            </Button>
          ))}
        </div>
      </div>
      {total === 0 ? (
        <EmptyState title="No bets in this period" />
      ) : (
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" {...AXIS} tickFormatter={formatDay} minTickGap={24} />
              <YAxis {...AXIS} width={44} allowDecimals={false} tickFormatter={(v: number) => (measure === "staked" ? compactTokens(v) : v.toLocaleString("en-US"))} />
              <Tooltip {...TOOLTIP} labelFormatter={(d) => formatDay(String(d))} formatter={(v) => [measure === "staked" ? `${formatTokens(Number(v))} tokens` : Number(v).toLocaleString("en-US"), measure === "staked" ? "Staked" : "Bets"]} />
              <Bar dataKey={measure} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function PnlByMarketType({ rows }: { rows: Charts["pnlByMarketType"] }) {
  const data = rows.map((r) => ({ ...r, label: humanize(r.marketType) }));
  return (
    <Card className="gap-2 p-3">
      <h2 className="text-sm font-semibold">House P&amp;L by market type</h2>
      {rows.length === 0 ? (
        <EmptyState title="No settled bets in this period" />
      ) : (
        <>
          <div style={{ height: Math.max(180, data.length * 32 + 32) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" {...AXIS} tickFormatter={compactTokens} />
                <YAxis type="category" dataKey="label" {...AXIS} width={124} interval={0} />
                <ReferenceLine x={0} stroke="var(--muted-foreground)" />
                <Tooltip {...TOOLTIP} formatter={(v) => [`${formatTokens(Number(v), { sign: true })} tokens`, "House P&L"]} />
                <Bar dataKey="pnl" radius={3} maxBarSize={16} isAnimationActive={false}>
                  {data.map((r) => (
                    <Cell key={r.marketType} fill={r.pnl >= 0 ? PROFIT : LOSS} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex gap-4 text-xs text-muted-foreground" aria-label="Legend">
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: PROFIT }} aria-hidden />House profit</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: LOSS }} aria-hidden />House loss</li>
          </ul>
        </>
      )}
    </Card>
  );
}

function ChartTable({ data }: { data: Charts }) {
  return (
    <details className="rounded-lg border bg-card px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">View as tables</summary>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        <table className="tabular w-full text-right text-xs">
          <caption className="mb-1 text-left text-muted-foreground">Bets per day</caption>
          <thead className="text-muted-foreground">
            <tr><th scope="col" className="text-left font-medium">Day</th><th scope="col" className="font-medium">Bets</th><th scope="col" className="font-medium">Staked</th></tr>
          </thead>
          <tbody>
            {data.betsOverTime.map((r) => (
              <tr key={r.date}><th scope="row" className="text-left font-normal">{formatDay(r.date)}</th><td>{r.bets}</td><td>{formatTokens(r.staked)}</td></tr>
            ))}
          </tbody>
        </table>
        <table className="tabular w-full self-start text-right text-xs">
          <caption className="mb-1 text-left text-muted-foreground">P&amp;L by market type</caption>
          <thead className="text-muted-foreground">
            <tr><th scope="col" className="text-left font-medium">Market type</th><th scope="col" className="font-medium">Bets</th><th scope="col" className="font-medium">Staked</th><th scope="col" className="font-medium">House P&amp;L</th></tr>
          </thead>
          <tbody>
            {data.pnlByMarketType.map((r) => (
              <tr key={r.marketType}><th scope="row" className="text-left font-normal">{humanize(r.marketType)}</th><td>{r.bets}</td><td>{formatTokens(r.staked)}</td><td>{formatTokens(r.pnl, { sign: true })}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function OverviewCharts() {
  const [days, setDays] = useState("30");
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.charts(Number(days)), queryFn: () => overviewApi.charts(Number(days)), refetchInterval: 60_000 });
  return (
    <section className="mt-4 grid gap-3" aria-label="Charts">
      <div className="flex justify-end">
        <SelectField label="Period" value={days} onChange={setDays} options={RANGES} />
      </div>
      {isPending ? (
        <ListSkeleton rows={1} className="h-60" />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <BetsOverTime rows={data.betsOverTime} />
            <PnlByMarketType rows={data.pnlByMarketType} />
          </div>
          <ChartTable data={data} />
        </>
      )}
    </section>
  );
}
