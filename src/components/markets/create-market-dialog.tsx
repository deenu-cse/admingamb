"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { marketsApi } from "@/lib/api/endpoints";
import { parseTokens } from "@/lib/format";
import { qk } from "@/lib/query-keys";

interface Row {
  key: number;
  name: string;
  odds: string;
}

/** Custom markets are priced by hand and start suspended, so nothing is on sale until an admin reopens it. */
export function CreateMarketDialog({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [inPlay, setInPlay] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ key: 1, name: "", odds: "" }, { key: 2, name: "", odds: "" }]);
  const parsed = rows.map((r) => ({ name: r.name.trim(), odds: parseTokens(r.odds) }));
  const ready = name.trim().length >= 3 && parsed.length >= 2 && parsed.every((r) => r.name.length > 0 && r.odds !== null && r.odds >= 101 && r.odds <= 10_000);
  const patch = (key: number, change: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));

  return (
    <ReasonDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="New custom market"
      description="It starts suspended. Check it, then reopen it to put it on sale. You settle it by hand."
      confirmLabel="Create market"
      success="Market created"
      ready={ready}
      onConfirm={(reason) => marketsApi.create(matchId, { name: name.trim(), inPlay, selections: parsed.map((r) => ({ name: r.name, odds: r.odds ?? 0 })), reason })}
      onDone={() => void qc.invalidateQueries({ queryKey: qk.markets(matchId) })}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="market-name">Market name</Label>
        <Input id="market-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Switch id="market-inplay" checked={inPlay} onCheckedChange={setInPlay} />
        <Label htmlFor="market-inplay">Offer in-play</Label>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Selections and decimal odds</legend>
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2">
            <Input aria-label={`Selection ${i + 1} name`} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} maxLength={60} placeholder="Name" />
            <Input aria-label={`Selection ${i + 1} odds`} value={r.odds} onChange={(e) => patch(r.key, { odds: e.target.value })} inputMode="decimal" placeholder="1.90" />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove selection ${i + 1}`} disabled={rows.length <= 2} onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={rows.length >= 20} onClick={() => setRows((all) => [...all, { key: Math.max(...all.map((r) => r.key)) + 1, name: "", odds: "" }])}>
          <Plus className="size-3.5" aria-hidden /> Add selection
        </Button>
      </fieldset>
    </ReasonDialog>
  );
}
