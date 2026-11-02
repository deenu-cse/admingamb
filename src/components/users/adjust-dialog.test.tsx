import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usersApi } from "@/lib/api/endpoints";
import { renderApp } from "@/test/utils";
import { AdjustDialog } from "./adjust-dialog";

vi.mock("@/lib/api/endpoints", () => ({ usersApi: { adjust: vi.fn() } }));
const adjust = vi.mocked(usersApi.adjust);

const REASON = "Goodwill credit";

async function fill(amount: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Amount (tokens)"), amount);
  await user.type(screen.getByLabelText("Reason"), REASON);
  return user;
}

describe("AdjustDialog", () => {
  beforeEach(() => adjust.mockReset());

  it("sends integer minor units, never a float", async () => {
    adjust.mockResolvedValue({ data: {}, meta: {} });
    renderApp(<AdjustDialog userId="u1" direction="credit" available={0} onClose={vi.fn()} />);
    const user = await fill("12.34");
    await user.click(screen.getByRole("button", { name: "Credit tokens" }));
    await waitFor(() => expect(adjust).toHaveBeenCalled());
    expect(adjust.mock.calls[0]?.[2]).toMatchObject({ amount: 1234, reason: REASON });
  });

  it("refuses a debit above the available balance", async () => {
    renderApp(<AdjustDialog userId="u1" direction="debit" available={500} onClose={vi.fn()} />);
    await fill("5.01");
    expect(screen.getByRole("button", { name: "Debit tokens" })).toBeDisabled();
    expect(screen.getByText(/more than the available balance/)).toBeInTheDocument();
  });

  it("allows a debit of exactly the available balance", async () => {
    renderApp(<AdjustDialog userId="u1" direction="debit" available={500} onClose={vi.fn()} />);
    await fill("5");
    expect(screen.getByRole("button", { name: "Debit tokens" })).toBeEnabled();
  });

  it("retries with the same idempotency key, so a timed-out credit can't post twice", async () => {
    adjust.mockRejectedValueOnce(new Error("Timed out")).mockResolvedValue({ data: {}, meta: {} });
    renderApp(<AdjustDialog userId="u1" direction="credit" available={0} onClose={vi.fn()} />);
    const user = await fill("10");
    const confirm = screen.getByRole("button", { name: "Credit tokens" });
    await user.click(confirm);
    await waitFor(() => expect(adjust).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);
    await waitFor(() => expect(adjust).toHaveBeenCalledTimes(2));
    expect(adjust.mock.calls[1]?.[2].idempotencyKey).toBe(adjust.mock.calls[0]?.[2].idempotencyKey);
  });
});
