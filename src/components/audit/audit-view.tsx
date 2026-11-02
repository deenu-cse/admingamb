"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type Column } from "@/components/common/data-table";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, ListSkeleton, LoadMore, PageTitle } from "@/components/common/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounced } from "@/hooks/use-debounced";
import { usePaged } from "@/hooks/use-paged";
import { auditApi } from "@/lib/api/endpoints";
import type { AuditRow } from "@/lib/api/types";
import { formatDateTime, humanize } from "@/lib/format";
import { qk } from "@/lib/query-keys";

function Change({ row }: { row: AuditRow }) {
  if (row.before === null && row.after === null) return <span className="text-muted-foreground">—</span>;
  return (
    <details className="min-w-40">
      <summary className="cursor-pointer text-xs text-muted-foreground">View change</summary>
      <div className="mt-1 grid gap-1 text-xs">
        {row.before !== null && <pre className="max-w-96 overflow-x-auto rounded bg-muted p-2">{JSON.stringify(row.before, null, 2)}</pre>}
        {row.after !== null && <pre className="max-w-96 overflow-x-auto rounded bg-muted p-2">{JSON.stringify(row.after, null, 2)}</pre>}
      </div>
    </details>
  );
}

const COLUMNS: Array<Column<AuditRow>> = [
  { header: "When", cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.createdAt)}</span> },
  { header: "Who", cell: (a) => (a.actorId ? (a.actor?.name ?? "Unknown") : "System") },
  { header: "Action", cell: (a) => <code className="text-xs">{a.action}</code> },
  { header: "Target", cell: (a) => <span className="text-xs">{humanize(a.targetType ?? "")}{a.targetId ? <code className="ml-1">{a.targetId.slice(-8)}</code> : null}</span> },
  { header: "Reason", cell: (a) => <span className="block max-w-72">{a.reason ?? "—"}</span> },
  { header: "Change", cell: (a) => <Change row={a} /> },
  { header: "IP", cell: (a) => a.ip ?? "—" },
];

export function AuditView() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetIdInput, setTargetIdInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const targetId = useDebounced(targetIdInput.trim());
  // A date input is a whole day, so "to" has to reach the end of it.
  const query = { action, targetType, targetId, from, to: to && `${to}T23:59:59.999Z` };
  const list = usePaged(qk.audit(query), (cursor) => auditApi.search({ ...query, cursor, limit: 50 }));
  const { data: filters } = useQuery({ queryKey: qk.auditFilters, queryFn: auditApi.filters });

  return (
    <>
      <PageTitle hint="Every admin action, newest first. This log can't be edited.">Audit log</PageTitle>
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField label="Action" value={action} onChange={setAction} anyLabel="Any action" options={(filters?.actions ?? []).map((a) => ({ value: a, label: a }))} />
        <SelectField label="Target type" value={targetType} onChange={setTargetType} anyLabel="Any target" options={(filters?.targetTypes ?? []).map((t) => ({ value: t, label: humanize(t) }))} />
        <div className="grid gap-1.5">
          <Label htmlFor="audit-target" className="text-xs text-muted-foreground">Target id</Label>
          <Input id="audit-target" value={targetIdInput} onChange={(e) => setTargetIdInput(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="audit-from" className="text-xs text-muted-foreground">From</Label>
          <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="audit-to" className="text-xs text-muted-foreground">To</Label>
          <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {list.isPending ? (
        <ListSkeleton rows={8} />
      ) : list.error ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState title="Nothing logged here" hint="Try wider filters." />
      ) : (
        <>
          <DataTable caption="Audit log" rows={list.items} columns={COLUMNS} rowKey={(a) => a.id} />
          <LoadMore hasNext={list.hasNextPage} loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} />
        </>
      )}
    </>
  );
}
