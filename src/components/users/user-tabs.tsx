"use client";

import { useQuery } from "@tanstack/react-query";
import { BetsTable } from "@/components/bets/bets-table";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState, ErrorState, ListSkeleton, LoadMore } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaged } from "@/hooks/use-paged";
import { betsApi, usersApi } from "@/lib/api/endpoints";
import type { AuditRow, SessionRow, UserTransaction } from "@/lib/api/types";
import { formatDateTime, formatTokens, humanize, LEDGER_LABEL, relativeTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";

const LEDGER: Array<Column<UserTransaction>> = [
  { header: "When", cell: (t) => <span className="whitespace-nowrap">{formatDateTime(t.createdAt)}</span> },
  { header: "Type", cell: (t) => LEDGER_LABEL[t.type] ?? humanize(t.type) },
  { header: "Bucket", cell: (t) => humanize(t.bucket) },
  { header: "Amount", align: "right", cell: (t) => formatTokens(t.signedAmount, { sign: true }) },
  { header: "Balance after", align: "right", cell: (t) => (t.balanceAfter === null ? "—" : formatTokens(t.balanceAfter)) },
];

function LedgerTab({ id }: { id: string }) {
  const list = usePaged(qk.userLedger(id), (cursor) => usersApi.ledger(id, { cursor, limit: 25 }));
  if (list.isPending) return <ListSkeleton rows={5} />;
  if (list.error) return <ErrorState error={list.error} retry={() => void list.refetch()} />;
  if (list.items.length === 0) return <EmptyState title="No ledger entries" />;
  return (
    <>
      <DataTable caption="Ledger entries" rows={list.items} columns={LEDGER} rowKey={(t) => t.id} />
      <LoadMore hasNext={list.hasNextPage} loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} />
    </>
  );
}

function BetsTab({ id }: { id: string }) {
  const list = usePaged(qk.userBets(id), (cursor) => betsApi.list({ userId: id, cursor, limit: 25 }));
  if (list.isPending) return <ListSkeleton rows={5} />;
  if (list.error) return <ErrorState error={list.error} retry={() => void list.refetch()} />;
  if (list.items.length === 0) return <EmptyState title="No bets yet" />;
  return (
    <>
      <BetsTable bets={list.items} caption="Bets by this user" hideUser />
      <LoadMore hasNext={list.hasNextPage} loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} />
    </>
  );
}

const SESSIONS: Array<Column<SessionRow>> = [
  { header: "App", cell: (s) => humanize(s.realm) },
  { header: "State", cell: (s) => <StatusBadge status={s.revokedAt ? "CLOSED" : "active"} label={s.revokedAt ? `Ended: ${humanize(s.revokeReason ?? "logout")}` : "Active"} /> },
  { header: "Last used", cell: (s) => relativeTime(s.lastUsedAt) },
  { header: "Started", cell: (s) => <span className="whitespace-nowrap">{formatDateTime(s.createdAt)}</span> },
  { header: "IP", cell: (s) => s.ip ?? "—" },
  { header: "Device", cell: (s) => <span className="block max-w-72 truncate" title={s.userAgent ?? undefined}>{s.userAgent ?? "—"}</span> },
];

function SessionsTab({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.userSessions(id), queryFn: () => usersApi.sessions(id) });
  if (isPending) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState error={error} retry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState title="No sessions" />;
  return <DataTable caption="Sessions" rows={data} columns={SESSIONS} rowKey={(s) => s.id} />;
}

const AUDIT: Array<Column<AuditRow>> = [
  { header: "When", cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.createdAt)}</span> },
  { header: "Action", cell: (a) => <code className="text-xs">{a.action}</code> },
  { header: "By", cell: (a) => a.actorRole },
  { header: "Reason", cell: (a) => a.reason ?? "—" },
];

function AuditTab({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.userAudit(id), queryFn: () => usersApi.audit(id) });
  if (isPending) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState error={error} retry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState title="No admin actions on this user" />;
  return <DataTable caption="Audit entries for this user" rows={data} columns={AUDIT} rowKey={(a) => a.id} />;
}

export function UserTabs({ id }: { id: string }) {
  return (
    <Tabs defaultValue="ledger">
      <TabsList>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="bets">Bets</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="audit">Audit</TabsTrigger>
      </TabsList>
      <TabsContent value="ledger"><LedgerTab id={id} /></TabsContent>
      <TabsContent value="bets"><BetsTab id={id} /></TabsContent>
      <TabsContent value="sessions"><SessionsTab id={id} /></TabsContent>
      <TabsContent value="audit"><AuditTab id={id} /></TabsContent>
    </Tabs>
  );
}
