import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatTile({ label, value, hint, tone, className }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "up" | "down"; className?: string }) {
  return (
    <Card className={cn("gap-1 p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("tabular truncate text-xl font-bold", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
