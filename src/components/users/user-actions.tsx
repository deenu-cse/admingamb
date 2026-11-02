"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMe } from "@/hooks/use-auth";
import { usersApi } from "@/lib/api/endpoints";
import type { UserDetail } from "@/lib/api/types";
import { qk } from "@/lib/query-keys";
import { AdjustDialog } from "./adjust-dialog";

type Action = "suspend" | "unsuspend" | "force-logout" | "reset-limits";

const COPY: Record<Action, { title: string; description: string; confirm: string; success: string; destructive?: boolean }> = {
  suspend: { title: "Suspend this account?", description: "They're signed out everywhere at once and can't sign in or bet. Open bets stay in play and settle normally.", confirm: "Suspend", success: "Account suspended", destructive: true },
  unsuspend: { title: "Lift the suspension?", description: "The account returns to the state it was in before, including any self-exclusion.", confirm: "Lift suspension", success: "Suspension lifted" },
  "force-logout": { title: "Sign them out everywhere?", description: "Every session ends now. They can sign straight back in.", confirm: "Sign out everywhere", success: "All sessions ended", destructive: true },
  "reset-limits": { title: "Reset their limits?", description: "Clears the daily stake and loss limits and any pending increase. A cool-off or self-exclusion they chose stays in place.", confirm: "Reset limits", success: "Limits reset" },
};

export function UserActions({ detail }: { detail: UserDetail }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [action, setAction] = useState<Action | null>(null);
  const [adjust, setAdjust] = useState<"credit" | "debit" | null>(null);
  const { user, wallet } = detail;

  // The API enforces both of these; hiding the buttons just avoids a guaranteed refusal.
  if (!me || me.id === user.id || (user.role !== "user" && me.role !== "superadmin")) return null;

  const copy = action ? COPY[action] : null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions <ChevronDown className="size-3.5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {wallet && <DropdownMenuItem onSelect={() => setAdjust("credit")}>Credit tokens</DropdownMenuItem>}
          {wallet && <DropdownMenuItem onSelect={() => setAdjust("debit")}>Debit tokens</DropdownMenuItem>}
          {user.status === "suspended" ? (
            <DropdownMenuItem onSelect={() => setAction("unsuspend")}>Lift suspension</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setAction("suspend")}>Suspend</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setAction("force-logout")}>Force logout</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction("reset-limits")}>Reset limits</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {copy && action && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setAction(null)}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirm}
          destructive={copy.destructive}
          success={copy.success}
          onConfirm={(reason) => usersApi.action(user.id, action, reason)}
          onDone={() => void qc.invalidateQueries({ queryKey: qk.user(user.id) })}
        />
      )}
      {adjust && wallet && <AdjustDialog userId={user.id} direction={adjust} available={wallet.available} onClose={() => setAdjust(null)} />}
    </>
  );
}
