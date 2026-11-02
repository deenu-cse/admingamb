import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { marketsApi } from "@/lib/api/endpoints";
import type { AdminMarket } from "@/lib/api/types";
import { renderApp } from "@/test/utils";
import { actionsFor } from "./market-actions";
import { SettleDialog } from "./settle-dialog";

vi.mock("@/lib/api/endpoints", () => ({ marketsApi: { settle: vi.fn(), resettle: vi.fn() } }));

const market = {
  id: "m1",
  name: "Match Winner",
  selections: [{ id: "a", name: "India", odds: 180, status: "ACTIVE" }, { id: "b", name: "Australia", odds: 200, status: "ACTIVE" }],
  book: { totalStake: 5000, bets: 3, worstCaseLoss: {} },
} as unknown as AdminMarket;

async function open(mode: "settle" | "resettle") {
  const user = userEvent.setup();
  renderApp(<SettleDialog market={market} mode={mode} onClose={vi.fn()} onDone={vi.fn()} />);
  await user.type(screen.getByLabelText("Reason"), "Official result confirmed");
  return user;
}

describe("SettleDialog", () => {
  beforeEach(() => {
    vi.mocked(marketsApi.settle).mockReset().mockResolvedValue({ data: {}, meta: {} });
    vi.mocked(marketsApi.resettle).mockReset().mockResolvedValue({ data: {}, meta: {} });
  });

  it("needs a winner before it can pay anything out", async () => {
    const user = await open("settle");
    const confirm = screen.getByRole("button", { name: "Settle market" });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByLabelText("India"));
    expect(confirm).toBeEnabled();
  });

  it("sends both winners for a dead heat", async () => {
    const user = await open("settle");
    await user.click(screen.getByLabelText("India"));
    await user.click(screen.getByLabelText("Australia"));
    await user.click(screen.getByRole("button", { name: "Settle market" }));
    await waitFor(() => expect(marketsApi.settle).toHaveBeenCalledWith("m1", { winningSelectionIds: ["a", "b"], reason: "Official result confirmed" }));
  });

  it("warns that a resettle can take tokens back, and can void instead", async () => {
    const user = await open("resettle");
    expect(screen.getByText(/may lose tokens/)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Void the market instead/));
    await user.click(screen.getByRole("button", { name: "Resettle market" }));
    await waitFor(() => expect(marketsApi.resettle).toHaveBeenCalledWith("m1", { void: true, reason: "Official result confirmed" }));
  });
});

describe("actionsFor", () => {
  it("matches the backend state machine", () => {
    expect(actionsFor("OPEN")).toEqual(["edit", "suspend", "close", "void"]);
    expect(actionsFor("SUSPENDED")).toEqual(["edit", "reopen", "close", "void"]);
    expect(actionsFor("CLOSED")).toEqual(["settle", "void"]);
    expect(actionsFor("SETTLED")).toEqual(["resettle"]);
    expect(actionsFor("VOID")).toEqual(["resettle"]);
  });

  it("never offers to settle an open market", () => {
    expect(actionsFor("OPEN")).not.toContain("settle");
    expect(actionsFor("SUSPENDED")).not.toContain("settle");
  });
});
