"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, BookText, Dices, Gauge, LayoutDashboard, LogOut, Menu, ScrollText, Settings, ShieldAlert, Swords, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useMe } from "@/hooks/use-auth";
import { onSessionLost } from "@/lib/api/client";
import { settingsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query-keys";
import { adminSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { useConnection, type ConnectionState } from "@/stores/connection";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/matches", label: "Matches & markets", icon: Swords },
  { href: "/risk", label: "Risk", icon: ShieldAlert },
  { href: "/bets", label: "Bets monitor", icon: Dices },
  { href: "/ledger", label: "Ledger", icon: BookText },
  { href: "/audit", label: "Audit log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/system", label: "System health", icon: Activity },
];

const CONNECTION: Record<ConnectionState, { label: string; dot: string }> = {
  connecting: { label: "Connecting…", dot: "bg-muted-foreground" },
  connected: { label: "Live", dot: "bg-up" },
  reconnecting: { label: "Reconnecting…", dot: "bg-chart-4" },
  offline: { label: "Offline", dot: "bg-down" },
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", active && "bg-accent font-medium text-foreground")}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { data: me } = useMe();
  const logout = useLogout();
  const state = useConnection((s) => s.state);
  const c = CONNECTION[state];
  return (
    <div className="mt-auto grid gap-2 border-t pt-3">
      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground" role="status">
        <span className={cn("size-2 rounded-full", c.dot)} aria-hidden />
        {c.label}
      </p>
      {me ? (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{me.name}</p>
            <p className="truncate text-xs text-muted-foreground">{me.role}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" disabled={logout.isPending} onClick={() => logout.mutate()}>
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <Skeleton className="h-9 w-full" />
      )}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-1 font-bold">
      <Gauge className="size-5 text-primary" aria-hidden />
      Gamb Admin
    </Link>
  );
}

function MaintenanceBanner() {
  const { data } = useQuery({ queryKey: qk.settings, queryFn: settingsApi.get, staleTime: 30_000 });
  if (!data?.maintenance.enabled) return null;
  return (
    <p role="status" className="border-b border-chart-4/40 bg-chart-4/10 px-4 py-2 text-sm">
      Maintenance mode is on: players can&apos;t place bets.
    </p>
  );
}

/** Keeps the staff socket up and sends a dead session back to login. */
function useSessionGuard() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me, isSuccess } = useMe();
  useEffect(() => onSessionLost(() => router.replace("/login")), [router]);
  useEffect(() => {
    if (isSuccess && me === null) router.replace("/login");
  }, [isSuccess, me, router]);
  useEffect(() => {
    if (!me) return;
    const socket = adminSocket();
    // The server only drops a socket like this when this admin's session was ended.
    const onDrop = (reason: string) => {
      if (reason === "io server disconnect") void qc.invalidateQueries({ queryKey: qk.me });
    };
    socket.on("disconnect", onDrop);
    return () => void socket.off("disconnect", onDrop);
  }, [me, qc]);
}

export function Shell({ children }: { children: ReactNode }) {
  useSessionGuard();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-4 border-r bg-card p-3 lg:flex">
        <Brand />
        <NavLinks />
        <SidebarFooter />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-card px-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col gap-4 p-3">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Brand />
              <NavLinks onNavigate={() => setOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
          <Brand />
        </header>
        <MaintenanceBanner />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
