"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/common/data-table";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, ListSkeleton, LoadMore, PageTitle } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounced } from "@/hooks/use-debounced";
import { usePaged } from "@/hooks/use-paged";
import { ledgerApi } from "@/lib/api/endpoints";
import type { LedgerRow } from "@/lib/api/types";
import { formatDateTime, formatTokens, humanize, LEDGER_LABEL } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { ReconciliationPanel } from "./reconciliation-panel";

const TYPES = Object.entries(LEDGER_LABEL).map(([value, label]) => ({ value, label }));
const FILTERS = [
  { key: "account", label: "Account", placeholder: "house, bonus_pool, user:<id>" },
  { key: "userId", label: "User id", placeholder: "24-character id" },
  { key: "txnId", label: "Transaction id", placeholder: "Both legs of one posting" },
  { key: "refId", label: "Reference id", placeholder: "A bet id, for example" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function LedgerSearch() {
  const [filters, setFilters] = useState<Record<FilterKey, string>>({ account: "", userId: "", txnId: "", refId: "" });
  const [type, setType] = useState("");
  const settled = useDebounced(filters);
  const query = { ...settled, type };
  const list = usePaged(qk.ledger(query), (cursor) => ledgerApi.search({ ...query, cursor, limit: 50 }));

  const columns: Array<Column<LedgerRow>> = [
    { header: "When", cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.createdAt)}</span> },
    { header: "Type", cell: (e) => LEDGER_LABEL[e.type] ?? humanize(e.type) },
    { header: "Account", cell: (e) => <code className="text-xs">{e.account}</code> },
    { header: "Counterparty", cell: (e) => <code className="text-xs">{e.counterparty}</code> },
    { header: "Debit", align: "right", cell: (e) => (e.direction === "debit" ? formatTokens(e.amount) : "") },
    { header: "Credit", align: "right", cell: (e) => (e.direction === "credit" ? formatTokens(e.amount) : "") },
    { header: "Balance after", align: "right", cell: (e) => (e.balanceAfter === null ? "—" : formatTokens(e.balanceAfter)) },
    {
      header: "Transaction",
      cell: (e) => (
        <Button variant="link" size="xs" className="h-auto p-0 font-mono" title="Show both legs of this posting" onClick={() => setFilters((f) => ({ ...f, txnId: e.txnId }))}>
          {e.txnId.slice(0, 8)}
        </Button>
      ),
    },
  ];

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {FILTERS.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={`ledger-${f.key}`} className="text-xs text-muted-foreground">{f.label}</Label>
            <Input id={`ledger-${f.key}`} value={filters[f.key]} placeholder={f.placeholder} onChange={(e) => setFilters((all) => ({ ...all, [f.key]: e.target.value.trim() }))} />
          </div>
        ))}
        <SelectField label="Type" value={type} onChange={setType} options={TYPES} anyLabel="Any type" />
      </div>
      {list.isPending ? (
        <ListSkeleton rows={8} />
      ) : list.error ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No entries match" />
      ) : (
        <>
          <DataTable caption="Ledger entries" rows={list.items} columns={columns} rowKey={(e) => e.id} />
          <LoadMore hasNext={list.hasNextPage} loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} />
        </>
      )}
    </div>
  );
}

export function LedgerView() {
  return (
    <>
      <PageTitle hint="Append-only double entry. Every posting has one debit and one credit.">Ledger &amp; reconciliation</PageTitle>
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>
        <TabsContent value="search"><LedgerSearch /></TabsContent>
        <TabsContent value="reconciliation"><ReconciliationPanel /></TabsContent>
      </Tabs>
    </>
  );
}
