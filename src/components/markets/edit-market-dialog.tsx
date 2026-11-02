"use client";

import { useId, useState } from "react";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { marketsApi, type MarketEdit } from "@/lib/api/endpoints";
import type { AdminMarket } from "@/lib/api/types";
import { formatOdds, parsePercent, parseTokens, tokensToInput } from "@/lib/format";

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} inputMode="decimal" onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EditMarketDialog({ market, onClose, onDone }: { market: AdminMarket; onClose: () => void; onDone: () => void }) {
  const [margin, setMargin] = useState(String(market.marginBps / 100));
  const [minStake, setMinStake] = useState(tokensToInput(market.minStake));
  const [maxStake, setMaxStake] = useState(tokensToInput(market.maxStake));
  const [maxLiability, setMaxLiability] = useState(tokensToInput(market.maxLiability));
  const [delay, setDelay] = useState(String(market.betDelayMs / 1000));
  const [odds, setOdds] = useState(() => Object.fromEntries(market.selections.map((s) => [s.id, formatOdds(s.odds)])));

  const marginBps = parsePercent(margin);
  const min = parseTokens(minStake);
  const max = parseTokens(maxStake);
  const liability = parseTokens(maxLiability);
  const delayMs = Number(delay) * 1000;
  const parsedOdds = Object.entries(odds).map(([id, v]) => [id, parseTokens(v)] as const);
  const oddsOk = market.autoManaged || parsedOdds.every(([, o]) => o !== null && o >= 101 && o <= 10_000);
  const ready = marginBps !== null && marginBps <= 3000 && min !== null && min > 0 && max !== null && max >= min && liability !== null && liability > 0 && Number.isInteger(delayMs) && delayMs >= 0 && delayMs <= 15_000 && oddsOk;

  return (
    <ReasonDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Edit ${market.name}`}
      description="Applies to new bets straight away. Bets already placed keep their price."
      confirmLabel="Save changes"
      success="Market updated"
      ready={ready}
      onConfirm={(reason) => {
        const body: MarketEdit & { odds?: Record<string, number> } = { marginBps: marginBps ?? 0, minStake: min ?? 0, maxStake: max ?? 0, maxLiability: liability ?? 0, betDelayMs: delayMs, reason };
        if (!market.autoManaged) body.odds = Object.fromEntries(parsedOdds.map(([id, o]) => [id, o ?? 0]));
        return marketsApi.edit(market.id, body);
      }}
      onDone={onDone}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Margin (%)" value={margin} onChange={setMargin} />
        <Field label="Bet delay (seconds)" value={delay} onChange={setDelay} />
        <Field label="Min stake (tokens)" value={minStake} onChange={setMinStake} />
        <Field label="Max stake (tokens)" value={maxStake} onChange={setMaxStake} />
      </div>
      <Field label="Max liability (tokens)" value={maxLiability} onChange={setMaxLiability} hint="Worst-case house loss before new bets are refused." />
      {!market.autoManaged && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Odds (decimal)</legend>
          {market.selections.map((s) => (
            <Field key={s.id} label={s.name} value={odds[s.id] ?? ""} onChange={(v) => setOdds((o) => ({ ...o, [s.id]: v }))} />
          ))}
        </fieldset>
      )}
    </ReasonDialog>
  );
}
