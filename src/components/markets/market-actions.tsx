"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { marketsApi } from "@/lib/api/endpoints";
import type { AdminMarket, MarketStatus } from "@/lib/api/types";
import { EditMarketDialog } from "./edit-market-dialog";
import { SettleDialog } from "./settle-dialog";

type Simple = "suspend" | "reopen" | "close" | "void";
type Dialog = Simple | "edit" | "settle" | "resettle";

/** Mirrors the backend state machine, so a menu never offers a move the server would refuse. */
export function actionsFor(status: MarketStatus): Dialog[] {
  switch (status) {
    case "PENDING":
      return ["edit", "suspend", "close", "void"];
    case "OPEN":
      return ["edit", "suspend", "close", "void"];
    case "SUSPENDED":
      return ["edit", "reopen", "close", "void"];
    case "CLOSED":
      return ["settle", "void"];
    case "SETTLED":
    case "VOID":
      return ["resettle"];
  }
}

const LABEL: Record<Dialog, string> = { edit: "Edit", suspend: "Suspend", reopen: "Reopen", close: "Close", void: "Void market", settle: "Settle", resettle: "Resettle" };

const COPY: Record<Simple, { title: string; description: string; confirm: string; success: string; destructive?: boolean }> = {
  suspend: { title: "Suspend this market?", description: "Players can't bet on it until someone reopens it. The engine won't lift a manual suspension.", confirm: "Suspend", success: "Market suspended", destructive: true },
  reopen: { title: "Reopen this market?", description: "The engine then decides: it stays suspended if the data is stale or the price is one-sided.", confirm: "Reopen", success: "Market reopened" },
  close: { title: "Close this market?", description: "No more bets. Existing bets wait for settlement. A closed market can't be reopened.", confirm: "Close market", success: "Market closed", destructive: true },
  void: { title: "Void this market?", description: "Every open bet on it is refunded in full. This moves tokens straight away.", confirm: "Void market", success: "Market voided", destructive: true },
};

export function MarketActions({ market }: { market: AdminMarket }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["matches"] });
    void qc.invalidateQueries({ queryKey: ["bets"] });
    void qc.invalidateQueries({ queryKey: ["risk"] });
  };
  const actions = actionsFor(market.status);
  const money: Dialog[] = actions.filter((a) => a === "settle" || a === "resettle" || a === "void");
  const routine = actions.filter((a) => !money.includes(a));
  const item = (a: Dialog) => (
    <DropdownMenuItem key={a} onSelect={() => setDialog(a)}>
      {LABEL[a]}
    </DropdownMenuItem>
  );
  const simple = dialog === "suspend" || dialog === "reopen" || dialog === "close" || dialog === "void" ? dialog : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${market.name}`}>
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {routine.map(item)}
          {routine.length > 0 && money.length > 0 && <DropdownMenuSeparator />}
          {money.map(item)}
        </DropdownMenuContent>
      </DropdownMenu>
      {simple && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && close()}
          title={COPY[simple].title}
          description={COPY[simple].description}
          confirmLabel={COPY[simple].confirm}
          destructive={COPY[simple].destructive}
          success={COPY[simple].success}
          onConfirm={(reason) => (simple === "void" ? marketsApi.voidMarket(market.id, reason) : marketsApi.transition(market.id, simple, reason))}
          onDone={refresh}
        />
      )}
      {dialog === "edit" && <EditMarketDialog market={market} onClose={close} onDone={refresh} />}
      {(dialog === "settle" || dialog === "resettle") && <SettleDialog market={market} mode={dialog} onClose={close} onDone={refresh} />}
    </>
  );
}
