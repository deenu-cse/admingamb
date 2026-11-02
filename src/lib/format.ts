export const UNITS_PER_TOKEN = 100;

/** Integer minor units → "1,234.50". Never parses through floats for arithmetic. */
export function formatTokens(units: number, opts: { sign?: boolean } = {}): string {
  const neg = units < 0;
  const abs = Math.abs(units);
  const whole = Math.floor(abs / UNITS_PER_TOKEN);
  const cents = abs % UNITS_PER_TOKEN;
  const body = `${whole.toLocaleString("en-US")}${cents ? `.${String(cents).padStart(2, "0")}` : ""}`;
  const sign = neg ? "−" : opts.sign && units > 0 ? "+" : "";
  return `${sign}${body}`;
}

/** Short whole-token label for a chart axis: 1,200 → "1.2k". Display only. */
export function compactTokens(units: number): string {
  const whole = Math.round(Math.abs(units) / UNITS_PER_TOKEN);
  const sign = units < 0 ? "−" : "";
  if (whole >= 1_000_000) return `${sign}${(whole / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (whole >= 1_000) return `${sign}${(whole / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${sign}${whole}`;
}

/** "12.5" or "12" (tokens, as typed by an admin) → integer minor units. null if invalid. */
export function parseTokens(input: string): number | null {
  const t = input.trim().replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{0,2})?$/.test(t)) return null;
  const [w = "0", f = ""] = t.split(".");
  return Number(w) * UNITS_PER_TOKEN + Number(f.padEnd(2, "0"));
}

/** Integer minor units → what goes back in a form field ("12.5" stays exact). */
export function tokensToInput(units: number): string {
  const cents = units % UNITS_PER_TOKEN;
  return `${Math.floor(units / UNITS_PER_TOKEN)}${cents ? `.${String(cents).padStart(2, "0").replace(/0$/, "")}` : ""}`;
}

export function formatOdds(odds: number): string {
  return (odds / 100).toFixed(2);
}

/** Basis points → "5%" or "5.25%". */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

/** "5.25" (percent, as typed) → integer basis points. null if invalid. */
export function parsePercent(input: string): number | null {
  const t = input.trim();
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(t)) return null;
  const [w = "0", f = ""] = t.split(".");
  return Number(w) * 100 + Number(f.padEnd(2, "0"));
}

export function formatDateTime(iso: string | number): string {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** A UTC day key from the API ("2026-10-31") as a short axis label. Stays in UTC so the day never shifts. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function relativeTime(iso: string | number | null, now = Date.now()): string {
  if (iso === null) return "never";
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
}

export function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "MATCH_WINNER" → "Match winner". */
export function humanize(code: string): string {
  const s = code.replace(/[_.]/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const LEDGER_LABEL: Record<string, string> = {
  WELCOME_BONUS: "Welcome bonus",
  DAILY_BONUS: "Daily bonus",
  ADMIN_CREDIT: "Admin credit",
  ADMIN_DEBIT: "Admin debit",
  BET_STAKE: "Stake locked",
  BET_REFUND: "Stake returned",
  BET_STAKE_CAPTURE: "Stake captured",
  BET_PAYOUT: "Winnings",
  CASHOUT: "Cash out",
  BET_RESETTLE_REVERSAL: "Resettlement correction",
};
