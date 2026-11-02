"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ErrorState, ListSkeleton, PageTitle } from "@/components/common/states";
import { StatTile } from "@/components/common/stat-tile";
import { StatusBadge } from "@/components/common/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usersApi } from "@/lib/api/endpoints";
import type { UserDetail } from "@/lib/api/types";
import { formatDate, formatTokens, relativeTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { UserActions } from "./user-actions";
import { UserTabs } from "./user-tabs";

function limitText(units: number | null): string {
  return units === null ? "None" : `${formatTokens(units)} tokens`;
}

function Limits({ detail }: { detail: UserDetail }) {
  const rp = detail.user.responsiblePlay;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border bg-card p-3 text-sm sm:grid-cols-4">
      <div><dt className="text-xs text-muted-foreground">Daily stake limit</dt><dd className="tabular">{limitText(rp.dailyStakeLimit)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Daily loss limit</dt><dd className="tabular">{limitText(rp.dailyLossLimit)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Cool-off until</dt><dd className="tabular">{rp.cooldownUntil ? formatDate(rp.cooldownUntil) : "None"}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Self-excluded until</dt><dd className="tabular">{detail.user.status === "self_excluded" && !rp.selfExcludedUntil ? "Permanent" : rp.selfExcludedUntil ? formatDate(rp.selfExcludedUntil) : "None"}</dd></div>
    </dl>
  );
}

export function UserDetailView({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.user(id), queryFn: () => usersApi.get(id) });

  return (
    <>
      <Link href="/users" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> Users
      </Link>
      {isPending ? (
        <ListSkeleton rows={4} className="h-20" />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : (
        <>
          <PageTitle hint={`${data.user.email} · joined ${formatDate(data.user.createdAt)} · last login ${relativeTime(data.user.lastLoginAt)}`} actions={<UserActions detail={data} />}>
            <span className="inline-flex items-center gap-2">
              {data.user.name}
              <StatusBadge status={data.user.status} />
              {data.user.role !== "user" && <StatusBadge status="muted" label={data.user.role} />}
            </span>
          </PageTitle>
          {data.user.statusReason && (
            <Alert className="mb-3">
              <AlertDescription>Suspended: {data.user.statusReason}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-3">
            {data.wallet ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <StatTile label="Available" value={formatTokens(data.wallet.available)} hint={`${formatTokens(data.wallet.locked)} locked in bets`} />
                <StatTile label="Lifetime staked" value={formatTokens(data.wallet.lifetimeStaked)} hint={`${formatTokens(data.wallet.lifetimeBonuses)} from bonuses`} />
                <StatTile label="Lifetime returned" value={formatTokens(data.wallet.lifetimeWon)} hint={`Net ${formatTokens(data.wallet.netPnl, { sign: true })}`} />
                <StatTile label="Bets" value={data.stats.bets.toLocaleString("en-US")} hint={`${data.stats.open} open · ${data.stats.won} won · ${data.stats.lost} lost`} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This staff account has no wallet.</p>
            )}
            <Limits detail={data} />
            <UserTabs id={id} />
          </div>
        </>
      )}
    </>
  );
}
