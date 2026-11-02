"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/common/data-table";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, ListSkeleton, LoadMore, PageTitle } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounced } from "@/hooks/use-debounced";
import { usePaged } from "@/hooks/use-paged";
import { usersApi } from "@/lib/api/endpoints";
import type { UserRow } from "@/lib/api/types";
import { formatDate, formatTokens, relativeTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "self_excluded", label: "Self-excluded" },
];
const ROLES = [
  { value: "user", label: "Player" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

const COLUMNS: Array<Column<UserRow>> = [
  {
    header: "User",
    cell: (u) => (
      <Link href={`/users/${u.id}`} className="block min-w-44 underline-offset-2 hover:underline">
        <span className="block font-medium">{u.name}</span>
        <span className="block text-xs text-muted-foreground">{u.email}</span>
      </Link>
    ),
  },
  { header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
  { header: "Role", cell: (u) => (u.role === "user" ? "Player" : u.role) },
  { header: "Balance", align: "right", cell: (u) => formatTokens(u.balance) },
  { header: "Locked", align: "right", cell: (u) => formatTokens(u.locked) },
  { header: "Last login", cell: (u) => relativeTime(u.lastLoginAt) },
  { header: "Joined", cell: (u) => formatDate(u.createdAt) },
];

export function UsersView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const q = useDebounced(search.trim());
  const query = { q, status, role };
  const list = usePaged(qk.users(query), (cursor) => usersApi.list({ ...query, cursor, limit: 25 }));

  return (
    <>
      <PageTitle hint="Search by name, email or user id.">Users</PageTitle>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="user-search" className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
            <Input id="user-search" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or id" />
          </div>
        </div>
        <SelectField label="Status" value={status} onChange={setStatus} options={STATUSES} anyLabel="Any status" />
        <SelectField label="Role" value={role} onChange={setRole} options={ROLES} anyLabel="Any role" />
      </div>
      {list.isPending ? (
        <ListSkeleton rows={6} />
      ) : list.error ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No users match" hint="Try a different search or clear the filters." />
      ) : (
        <>
          <DataTable caption="Users" rows={list.items} columns={COLUMNS} rowKey={(u) => u.id} onRowClick={(u) => router.push(`/users/${u.id}`)} />
          <LoadMore hasNext={list.hasNextPage} loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} />
        </>
      )}
    </>
  );
}
