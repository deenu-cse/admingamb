import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/utils";
import { ReasonDialog, type ReasonDialogProps } from "./reason-dialog";

function setup(over: Partial<ReasonDialogProps> = {}) {
  const props: ReasonDialogProps = { open: true, onOpenChange: vi.fn(), title: "Suspend?", description: "They are signed out.", confirmLabel: "Suspend", onConfirm: vi.fn().mockResolvedValue(undefined), ...over };
  renderApp(<ReasonDialog {...props} />);
  return { props, user: userEvent.setup(), confirm: screen.getByRole("button", { name: "Suspend" }), reason: screen.getByLabelText("Reason") };
}

describe("ReasonDialog", () => {
  it("won't confirm until a real reason is given", async () => {
    const { confirm, reason, user } = setup();
    expect(confirm).toBeDisabled();
    await user.type(reason, "   no ");
    expect(confirm).toBeDisabled();
    await user.type(reason, "t enough here");
    expect(confirm).toBeEnabled();
  });

  it("sends the trimmed reason, then closes", async () => {
    const { confirm, reason, user, props } = setup();
    await user.type(reason, "  Abuse report 42  ");
    await user.click(confirm);
    expect(props.onConfirm).toHaveBeenCalledWith("Abuse report 42");
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
  });

  it("can't fire twice while the request is in flight", async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { confirm, reason, user } = setup({ onConfirm });
    await user.type(reason, "Abuse report 42");
    await user.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    await user.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledTimes(1);
    finish();
  });

  it("stays open with the reason intact when the server refuses", async () => {
    const { confirm, reason, user, props } = setup({ onConfirm: vi.fn().mockRejectedValue(new Error("Refused")) });
    await user.type(reason, "Abuse report 42");
    await user.click(confirm);
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(reason).toHaveValue("Abuse report 42");
  });

  it("keeps confirm off until the extra fields are ready", async () => {
    const { confirm, reason, user } = setup({ ready: false });
    await user.type(reason, "Abuse report 42");
    expect(confirm).toBeDisabled();
  });
});
