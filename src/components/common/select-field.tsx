"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ANY = "__any";

/** Labelled select. `anyLabel` adds an "everything" option that maps to an empty value. */
export function SelectField({ label, value, onChange, options, anyLabel, className }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; anyLabel?: string; className?: string }) {
  const id = useId();
  return (
    <div className={className ?? "grid gap-1.5"}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? "" : v)}>
        <SelectTrigger id={id} className="w-full min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anyLabel && <SelectItem value={ANY}>{anyLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
