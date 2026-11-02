import { AlertTriangle, Inbox, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";

export function EmptyState({ title, hint, icon: Icon = Inbox, action }: { title: string; hint?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
      <AlertTriangle className="size-7 text-destructive" aria-hidden />
      <p className="text-sm">{errorMessage(error)}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 3, className = "h-12" }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`w-full ${className}`} />
      ))}
    </div>
  );
}

export function PageTitle({ children, hint, actions }: { children: ReactNode; hint?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight">{children}</h1>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadMore({ hasNext, loading, onClick }: { hasNext: boolean; loading: boolean; onClick: () => void }) {
  if (!hasNext) return null;
  return (
    <div className="flex justify-center pt-3">
      <Button variant="outline" size="sm" disabled={loading} onClick={onClick}>
        {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        Load more
      </Button>
    </div>
  );
}
