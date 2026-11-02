"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api/endpoints";
import { formatTokens, parseTokens } from "@/lib/format";
import { qk } from "@/lib/query-keys";

/**
 * Mounted once per attempt, so the idempotency key stays the same across retries of this dialog
 * (a timed-out credit can't post twice) and a new adjustment always gets a new key.
 */
export function AdjustDialog({ userId, direction, available, onClose }: { userId: string; direction: "credit" | "debit"; available: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const amount = parseTokens(input);
  const credit = direction === "credit";
  const tooMuch = !credit && amount !== null && amount > available;
  const ready = amount !== null && amount > 0 && !tooMuch;

  return (
    <ReasonDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={credit ? "Credit tokens" : "Debit tokens"}
      description={credit ? "Adds play tokens to this wallet. Recorded in the ledger and audit log." : `Removes play tokens from this wallet. ${formatTokens(available)} available.`}
      confirmLabel={credit ? "Credit tokens" : "Debit tokens"}
      destructive={!credit}
      success={credit ? "Tokens credited" : "Tokens debited"}
      ready={ready}
      onConfirm={(reason) => usersApi.adjust(userId, direction, { amount: amount ?? 0, reason, idempotencyKey })}
      onDone={() => void qc.invalidateQueries({ queryKey: qk.user(userId) })}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="adjust-amount">Amount (tokens)</Label>
        <Input id="adjust-amount" inputMode="decimal" autoFocus value={input} onChange={(e) => setInput(e.target.value)} aria-invalid={tooMuch} aria-describedby={tooMuch ? "adjust-error" : undefined} placeholder="100" />
        {tooMuch && <p id="adjust-error" className="text-xs text-destructive">That&apos;s more than the available balance.</p>}
      </div>
    </ReasonDialog>
  );
}
