"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, type FieldError } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { SelectField } from "@/components/common/select-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { settingsApi } from "@/lib/api/endpoints";
import type { PlatformSettings } from "@/lib/api/types";
import { humanize, parsePercent, parseTokens, tokensToInput } from "@/lib/format";
import { qk } from "@/lib/query-keys";

const tokens = z.string().refine((v) => parseTokens(v) !== null, "Enter a token amount");
const percent = z.string().refine((v) => parsePercent(v) !== null, "Enter a percentage");
const seconds = z.string().regex(/^\d+(\.\d{1,3})?$/, "Enter seconds");

const schema = z.object({
  welcomeBonus: tokens,
  dailyBonus: tokens,
  globalMinStake: tokens,
  globalMaxStake: tokens,
  defaultMaxLiability: tokens,
  adminMaxAdjustment: tokens,
  cashoutMargin: percent,
  betDelaySec: seconds,
  reopenDelaySec: seconds,
  staleSec: seconds,
  margins: z.record(z.string(), percent),
  maintenanceEnabled: z.boolean(),
  maintenanceMessage: z.string().max(500),
  providerMode: z.enum(["live", "replay"]),
});
type Values = z.infer<typeof schema>;
type Patch = Partial<PlatformSettings>;

function toValues(s: PlatformSettings): Values {
  return {
    welcomeBonus: tokensToInput(s.welcomeBonus),
    dailyBonus: tokensToInput(s.dailyBonus),
    globalMinStake: tokensToInput(s.globalMinStake),
    globalMaxStake: tokensToInput(s.globalMaxStake),
    defaultMaxLiability: tokensToInput(s.defaultMaxLiability),
    adminMaxAdjustment: tokensToInput(s.adminMaxAdjustment),
    cashoutMargin: String(s.cashoutMarginBps / 100),
    betDelaySec: String(s.defaultBetDelayMs / 1000),
    reopenDelaySec: String(s.marketReopenDelayMs / 1000),
    staleSec: String(s.staleThresholdMs / 1000),
    margins: Object.fromEntries(Object.entries(s.defaultMarginsBps).map(([k, v]) => [k, String(v / 100)])),
    maintenanceEnabled: s.maintenance.enabled,
    maintenanceMessage: s.maintenance.message,
    providerMode: s.providerMode,
  };
}

/** Only what actually changed is sent, so the audit row shows exactly what this admin did. */
export function buildPatch(s: PlatformSettings, v: Values): Patch {
  const next: Patch = {
    welcomeBonus: parseTokens(v.welcomeBonus) ?? s.welcomeBonus,
    dailyBonus: parseTokens(v.dailyBonus) ?? s.dailyBonus,
    globalMinStake: parseTokens(v.globalMinStake) ?? s.globalMinStake,
    globalMaxStake: parseTokens(v.globalMaxStake) ?? s.globalMaxStake,
    defaultMaxLiability: parseTokens(v.defaultMaxLiability) ?? s.defaultMaxLiability,
    adminMaxAdjustment: parseTokens(v.adminMaxAdjustment) ?? s.adminMaxAdjustment,
    cashoutMarginBps: parsePercent(v.cashoutMargin) ?? s.cashoutMarginBps,
    defaultBetDelayMs: Math.round(Number(v.betDelaySec) * 1000),
    marketReopenDelayMs: Math.round(Number(v.reopenDelaySec) * 1000),
    staleThresholdMs: Math.round(Number(v.staleSec) * 1000),
    providerMode: v.providerMode,
  };
  const patch = Object.fromEntries(Object.entries(next).filter(([k, val]) => s[k as keyof PlatformSettings] !== val)) as Patch;
  const margins = Object.fromEntries(
    Object.entries(v.margins).flatMap(([k, val]) => {
      const bps = parsePercent(val);
      return bps !== null && bps !== s.defaultMarginsBps[k] ? [[k, bps]] : [];
    }),
  );
  if (Object.keys(margins).length > 0) patch.defaultMarginsBps = margins;
  if (v.maintenanceEnabled !== s.maintenance.enabled || v.maintenanceMessage.trim() !== s.maintenance.message) {
    patch.maintenance = { enabled: v.maintenanceEnabled, message: v.maintenanceMessage.trim() };
  }
  return patch;
}

function Text({ id, label, error, hint, ...input }: { id: string; label: string; error?: FieldError; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" aria-invalid={Boolean(error)} {...input} />
      {error ? <p className="text-xs text-destructive">{error.message}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const qc = useQueryClient();
  const [patch, setPatch] = useState<Patch | null>(null);
  const { register, handleSubmit, control, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(settings) });
  const field = (name: Exclude<keyof Values, "margins" | "maintenanceEnabled" | "providerMode" | "maintenanceMessage">) => ({ id: name, error: errors[name], ...register(name) });

  const submit = handleSubmit((values) => {
    const changes = buildPatch(settings, values);
    if (Object.keys(changes).length === 0) toast.info("Nothing to save");
    else setPatch(changes);
  });

  return (
    <form className="grid gap-3" onSubmit={(e) => void submit(e)} noValidate>
      <Card className="gap-3 p-4">
        <h2 className="font-semibold">Bonuses</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Welcome bonus (tokens)" {...field("welcomeBonus")} />
          <Text label="Daily bonus (tokens)" {...field("dailyBonus")} />
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <h2 className="font-semibold">Stakes and risk</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Text label="Minimum stake (tokens)" {...field("globalMinStake")} />
          <Text label="Maximum stake (tokens)" {...field("globalMaxStake")} />
          <Text label="Max liability per market (tokens)" {...field("defaultMaxLiability")} />
          <Text label="Largest admin adjustment (tokens)" {...field("adminMaxAdjustment")} />
          <Text label="Cash-out margin (%)" {...field("cashoutMargin")} />
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <h2 className="font-semibold">Timing</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Text label="In-play bet delay (seconds)" {...field("betDelaySec")} />
          <Text label="Reopen after a ball (seconds)" {...field("reopenDelaySec")} />
          <Text label="Data counts as stale after (seconds)" {...field("staleSec")} />
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <div>
          <h2 className="font-semibold">Default margins</h2>
          <p className="text-sm text-muted-foreground">Used when a market is created. Existing markets keep theirs.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Object.keys(settings.defaultMarginsBps).map((type) => (
            <Text key={type} id={`margin-${type}`} label={`${humanize(type)} (%)`} error={errors.margins?.[type] as FieldError | undefined} {...register(`margins.${type}`)} />
          ))}
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <h2 className="font-semibold">Platform</h2>
        <Controller
          name="providerMode"
          control={control}
          render={({ field: f }) => (
            <SelectField className="grid max-w-64 gap-1.5" label="Data provider" value={f.value} onChange={f.onChange} options={[{ value: "replay", label: "Replay (simulated matches)" }, { value: "live", label: "Live (CricAPI)" }]} />
          )}
        />
        <Controller
          name="maintenanceEnabled"
          control={control}
          render={({ field: f }) => (
            <div className="flex items-center gap-2">
              <Switch id="maintenance" checked={f.value} onCheckedChange={f.onChange} />
              <Label htmlFor="maintenance">Maintenance mode: players can&apos;t place bets</Label>
            </div>
          )}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="maintenance-message">Message shown to players</Label>
          <Textarea id="maintenance-message" rows={2} maxLength={500} {...register("maintenanceMessage")} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">Save settings</Button>
      </div>

      {patch && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setPatch(null)}
          title="Save these settings?"
          description={`Changing: ${Object.keys(patch).map(humanize).join(", ")}. This applies across the platform within a few seconds.`}
          confirmLabel="Save settings"
          success="Settings saved"
          onConfirm={(reason) => settingsApi.patch({ ...patch, reason })}
          onDone={() => void qc.invalidateQueries({ queryKey: qk.settings })}
        />
      )}
    </form>
  );
}
