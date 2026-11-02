import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "good" | "warn" | "bad" | "muted" | "live";

const TONES: Record<string, Tone> = {
  active: "good",
  suspended: "bad",
  self_excluded: "warn",
  OPEN: "good",
  SUSPENDED: "warn",
  CLOSED: "muted",
  SETTLED: "muted",
  PENDING: "muted",
  VOID: "muted",
  LIVE: "live",
  TOSS: "live",
  INNINGS_BREAK: "live",
  RAIN_DELAY: "warn",
  UPCOMING: "muted",
  COMPLETED: "muted",
  ABANDONED: "warn",
  NO_RESULT: "muted",
  ACCEPTED: "good",
  PENDING_DELAY: "warn",
  REJECTED: "muted",
  WON: "good",
  LOST: "muted",
  CASHED_OUT: "muted",
  clean: "good",
  mismatches: "bad",
  failed: "bad",
  running: "live",
  scheduled: "muted",
  paused: "warn",
  finished: "muted",
};

const CLASS: Record<Tone, string> = {
  good: "border-up/30 bg-up/10 text-up",
  warn: "border-chart-4/40 bg-chart-4/10 text-foreground",
  bad: "border-down/30 bg-down/10 text-down",
  live: "border-live/40 bg-live/10 text-live",
  muted: "border-border bg-muted text-muted-foreground",
};

/** Colour is never the only signal: the label always names the state. */
export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <Badge variant="outline" data-status={status} className={cn("whitespace-nowrap", CLASS[TONES[status] ?? "muted"], className)}>
      {label ?? humanize(status)}
    </Badge>
  );
}
