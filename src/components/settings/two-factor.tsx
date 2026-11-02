"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query-keys";

export function TwoFactor() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [code, setCode] = useState("");
  const done = (message: string) => {
    toast.success(message);
    setCode("");
    setup.reset();
    void qc.invalidateQueries({ queryKey: qk.me });
  };
  const fail = (err: unknown) => toast.error(errorMessage(err));
  const setup = useMutation({ mutationFn: authApi.totpSetup, onError: fail });
  const enable = useMutation({ mutationFn: () => authApi.totpEnable(code), onSuccess: () => done("Two-factor authentication is on"), onError: fail });
  const disable = useMutation({ mutationFn: () => authApi.totpDisable(code), onSuccess: () => done("Two-factor authentication is off"), onError: fail });

  if (!me) return <ListSkeleton rows={1} className="h-32" />;
  const validCode = /^\d{6}$/.test(code);
  const codeField = (
    <div className="grid max-w-48 gap-1.5">
      <Label htmlFor="totp-code">Authenticator code</Label>
      <Input id="totp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
    </div>
  );

  return (
    <Card className="max-w-xl gap-3 p-4">
      <div>
        <h2 className="font-semibold">Two-factor authentication</h2>
        <p className="text-sm text-muted-foreground">{me.totpEnabled ? "On. You'll need a code from your authenticator app to sign in." : "Off. Add a code from an authenticator app to your sign-in."}</p>
      </div>
      {me.totpEnabled ? (
        <>
          {codeField}
          <Button variant="destructive" size="sm" className="justify-self-start" disabled={!validCode || disable.isPending} onClick={() => disable.mutate()}>
            Turn off
          </Button>
        </>
      ) : setup.data ? (
        <>
          <div className="grid gap-1 text-sm">
            <p>Add this key to your authenticator app:</p>
            <code className="rounded bg-muted p-2 text-xs break-all">{setup.data.secret}</code>
          </div>
          {codeField}
          <Button size="sm" className="justify-self-start" disabled={!validCode || enable.isPending} onClick={() => enable.mutate()}>
            Confirm and turn on
          </Button>
        </>
      ) : (
        <Button size="sm" className="justify-self-start" disabled={setup.isPending} onClick={() => setup.mutate()}>
          Set up
        </Button>
      )}
    </Card>
  );
}
