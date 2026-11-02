"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/client";

const MIN_REASON = 5;

export interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  success?: string;
  /** Extra inputs above the reason; `ready: false` keeps the confirm button disabled. */
  children?: ReactNode;
  ready?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
  onDone?: () => void;
}

/** Every privileged action goes through here: it states the effect, needs a reason, and can't double-fire. */
export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel, destructive, success, children, ready = true, onConfirm, onDone }: ReasonDialogProps) {
  const id = useId();
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => onConfirm(reason.trim()),
    onSuccess: () => {
      if (success) toast.success(success);
      setReason("");
      onOpenChange(false);
      onDone?.();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const valid = reason.trim().length >= MIN_REASON && ready;

  return (
    <Dialog open={open} onOpenChange={(next) => !m.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !m.isPending) m.mutate();
          }}
        >
          {children}
          <div className="grid gap-1.5">
            <Label htmlFor={id}>Reason</Label>
            <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Why? This goes in the audit log." />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={m.isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={!valid || m.isPending}>
              {m.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
