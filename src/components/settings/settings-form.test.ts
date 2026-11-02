import { describe, expect, it } from "vitest";
import type { PlatformSettings } from "@/lib/api/types";
import { buildPatch } from "./settings-form";

const settings = {
  welcomeBonus: 100_000,
  dailyBonus: 10_000,
  defaultMarginsBps: { MATCH_WINNER: 500, TOSS_WINNER: 500 },
  defaultBetDelayMs: 4000,
  marketReopenDelayMs: 3000,
  globalMinStake: 1000,
  globalMaxStake: 5_000_000,
  defaultMaxLiability: 50_000_000,
  cashoutMarginBps: 500,
  adminMaxAdjustment: 10_000_000,
  staleThresholdMs: 30_000,
  marketTypesEnabled: [],
  maintenance: { enabled: false, message: "" },
  providerMode: "replay",
  version: 1,
  updatedAt: "2026-10-31T00:00:00Z",
} satisfies PlatformSettings;

const values = {
  welcomeBonus: "1000",
  dailyBonus: "100",
  globalMinStake: "10",
  globalMaxStake: "50000",
  defaultMaxLiability: "500000",
  adminMaxAdjustment: "100000",
  cashoutMargin: "5",
  betDelaySec: "4",
  reopenDelaySec: "3",
  staleSec: "30",
  margins: { MATCH_WINNER: "5", TOSS_WINNER: "5" },
  maintenanceEnabled: false,
  maintenanceMessage: "",
  providerMode: "replay" as const,
};

describe("buildPatch", () => {
  it("is empty when nothing changed", () => {
    expect(buildPatch(settings, values)).toEqual({});
  });

  it("sends only the changed fields, in minor units", () => {
    expect(buildPatch(settings, { ...values, welcomeBonus: "750.50", betDelaySec: "2.5" })).toEqual({ welcomeBonus: 75_050, defaultBetDelayMs: 2500 });
  });

  it("sends only the margins that moved", () => {
    expect(buildPatch(settings, { ...values, margins: { MATCH_WINNER: "6.25", TOSS_WINNER: "5" } })).toEqual({ defaultMarginsBps: { MATCH_WINNER: 625 } });
  });

  it("sends maintenance as one object", () => {
    expect(buildPatch(settings, { ...values, maintenanceEnabled: true, maintenanceMessage: " Back soon " })).toEqual({ maintenance: { enabled: true, message: "Back soon" } });
  });
});
