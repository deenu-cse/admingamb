"use client";

import { useState } from "react";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { marketsApi } from "@/lib/api/endpoints";
import type { AdminMarket } from "@/lib/api/types";
import { formatTokens } from "@/lib/format";

/** Settle picks the winners; resettle reverses every payout first, so a player's balance can go down. */
export function SettleDialog({ market, mode, onClose, onDone }: { market: AdminMarket; mode: "settle" | "resettle"; onClose: () => void; onDone: () => void }) {
  const [winners, setWinners] = useState<string[]>([]);
  const [voidAll, setVoidAll] = useState(false);
  const resettle = mode === "resettle";
  const staked = market.book?.totalStake ?? 0;

  return (
    <ReasonDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={resettle ? "Resettle this market?" : "Settle this market?"}
      description={
        resettle
          ? "Reverses the previous result and pays again on the new one. Players may lose tokens they've already received."
          : `Pays out every bet on ${market.name}${staked ? ` (${formatTokens(staked)} tokens staked)` : ""}. To correct it afterwards you'd have to resettle.`
      }
      confirmLabel={resettle ? "Resettle market" : "Settle market"}
      destructive
      success={resettle ? "Market resettled" : "Market settled"}
      ready={voidAll || winners.length > 0}
      onConfirm={(reason) => {
        const body = voidAll ? { void: true, reason } : { winningSelectionIds: winners, reason };
        return resettle ? marketsApi.resettle(market.id, body) : marketsApi.settle(market.id, body);
      }}
      onDone={onDone}
    >
      <fieldset className="grid gap-1.5" disabled={voidAll}>
        <legend className="mb-1 text-sm font-medium">Winning selection</legend>
        <p className="text-xs text-muted-foreground">Pick more than one for a dead heat: each pays a share of its stake.</p>
        {market.selections.map((s) => (
          <label key={s.id} className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm has-checked:border-primary">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={winners.includes(s.id)}
              onChange={(e) => setWinners((w) => (e.target.checked ? [...w, s.id] : w.filter((x) => x !== s.id)))}
            />
            {s.name}
          </label>
        ))}
      </fieldset>
      {resettle && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={voidAll} onChange={(e) => setVoidAll(e.target.checked)} />
          Void the market instead, refunding every stake
        </label>
      )}
    </ReasonDialog>
  );
}
