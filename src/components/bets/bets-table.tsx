"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { DataTable, type Column } from "@/components/common/data-table";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { betsApi } from "@/lib/api/endpoints";
import type { AdminBet } from "@/lib/api/types";
import { formatDateTime, formatOdds, formatTokens } from "@/lib/format";

const OPEN = new Set(["PENDING_DELAY", "ACCEPTED"]);

function Selection({ bet }: { bet: AdminBet }) {
  const leg = bet.legs[0];
  if (bet.kind === "ACCA") return <p className="font-medium">{bet.legs.length}-leg accumulator</p>;
  return (
    <div className="min-w-48">
      <p className="font-medium">
        {leg?.selectionName}
        {leg?.line ? ` ${leg.line}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        {leg?.marketName} · {leg?.matchTitle}
        {leg?.inPlay ? " · in-play" : ""}
      </p>
    </div>
  );
}

export function BetsTable({ bets, caption, hideUser }: { bets: AdminBet[]; caption: string; hideUser?: boolean }) {
  const qc = useQueryClient();
  const [voiding, setVoiding] = useState<AdminBet | null>(null);

  const columns: Array<Column<AdminBet>> = [
    { header: "Placed", cell: (b) => <span className="whitespace-nowrap">{formatDateTime(b.placedAt)}</span> },
    ...(hideUser
      ? []
      : [{ header: "User", cell: (b: AdminBet) => <Link href={`/users/${b.userId}`} className="underline-offset-2 hover:underline">{b.user?.name ?? "Unknown"}</Link> }]),
    { header: "Selection", cell: (b) => <Selection bet={b} /> },
    { header: "Stake", align: "right", cell: (b) => formatTokens(b.stake) },
    { header: "Odds", align: "right", cell: (b) => formatOdds(b.odds) },
    { header: "To return", align: "right", cell: (b) => formatTokens(b.potentialReturn) },
    { header: "Paid", align: "right", cell: (b) => (OPEN.has(b.status) ? "—" : formatTokens(b.payout)) },
    { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
    {
      header: "Action",
      cell: (b) =>
        OPEN.has(b.status) ? (
          <Button variant="outline" size="xs" onClick={() => setVoiding(b)}>
            Void
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable caption={caption} rows={bets} columns={columns} rowKey={(b) => b.id} />
      {voiding && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setVoiding(null)}
          title="Void this bet?"
          description={`Returns the ${formatTokens(voiding.stake)} token stake to ${voiding.user?.name ?? "the player"} and removes it from the book. Settled bets are corrected by resettling the market instead.`}
          confirmLabel="Void bet"
          destructive
          success="Bet voided"
          onConfirm={(reason) => betsApi.voidBet(voiding.id, reason)}
          onDone={() => {
            void qc.invalidateQueries({ queryKey: ["bets"] });
            void qc.invalidateQueries({ queryKey: ["users"] });
            void qc.invalidateQueries({ queryKey: ["risk"] });
          }}
        />
      )}
    </>
  );
}
