import { describe, expect, it } from "vitest";
import { compactTokens, formatBps, formatDay, formatOdds, formatTokens, parsePercent, parseTokens, relativeTime, tokensToInput } from "./format";

describe("tokens", () => {
  it("formats minor units exactly", () => {
    expect(formatTokens(123_456)).toBe("1,234.56");
    expect(formatTokens(100)).toBe("1");
    expect(formatTokens(105)).toBe("1.05");
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(-250)).toBe("−2.50");
    expect(formatTokens(250, { sign: true })).toBe("+2.50");
  });

  it("parses what an admin types, with no float drift", () => {
    expect(parseTokens("12.34")).toBe(1234);
    expect(parseTokens("0.07")).toBe(7);
    expect(parseTokens("1,000")).toBe(100_000);
    expect(parseTokens("19.99")).toBe(1999);
    expect(parseTokens("1.234")).toBeNull();
    expect(parseTokens("-5")).toBeNull();
    expect(parseTokens("abc")).toBeNull();
    expect(parseTokens("")).toBeNull();
  });

  it("round-trips through a form field", () => {
    for (const units of [0, 7, 70, 100, 1250, 1999, 100_000]) expect(parseTokens(tokensToInput(units))).toBe(units);
  });

  it("shortens axis labels", () => {
    expect(compactTokens(50_000)).toBe("500");
    expect(compactTokens(120_000)).toBe("1.2k");
    expect(compactTokens(200_000_000)).toBe("2M");
    expect(compactTokens(-120_000)).toBe("−1.2k");
  });
});

describe("percent and odds", () => {
  it("converts percent to basis points exactly", () => {
    expect(parsePercent("5")).toBe(500);
    expect(parsePercent("5.25")).toBe(525);
    expect(parsePercent("0.07")).toBe(7);
    expect(parsePercent("x")).toBeNull();
    expect(formatBps(500)).toBe("5%");
    expect(formatBps(525)).toBe("5.25%");
  });

  it("shows odds as two decimals", () => {
    expect(formatOdds(185)).toBe("1.85");
    expect(formatOdds(200)).toBe("2.00");
  });
});

describe("time", () => {
  it("keeps a UTC day key on its own date in any timezone", () => {
    expect(formatDay("2026-10-31")).toMatch(/31/);
  });

  it("describes ages", () => {
    const now = Date.parse("2026-10-31T12:00:00Z");
    expect(relativeTime(null, now)).toBe("never");
    expect(relativeTime("2026-10-31T11:59:58Z", now)).toBe("just now");
    expect(relativeTime("2026-10-31T11:59:30Z", now)).toBe("30s ago");
    expect(relativeTime("2026-10-31T09:00:00Z", now)).toBe("3h ago");
  });
});
