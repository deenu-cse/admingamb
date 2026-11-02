"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, errorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query-keys";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  totpCode: z.string().regex(/^\d{6}$/, "Enter the 6-digit code").or(z.literal("")),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [needsCode, setNeedsCode] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", totpCode: "" } });

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const { user } = await authApi.login({ email: values.email, password: values.password, ...(values.totpCode ? { totpCode: values.totpCode } : {}) });
      qc.setQueryData(qk.me, user);
      const next = params.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "TOTP_REQUIRED") {
        setNeedsCode(true);
        return;
      }
      setFailure(errorMessage(err));
    }
  });

  return (
    <Card className="w-full max-w-sm gap-4 p-5">
      <div>
        <ShieldCheck className="mb-2 size-7 text-primary" aria-hidden />
        <h1 className="text-lg font-bold">Gamb Admin</h1>
        <p className="text-sm text-muted-foreground">Staff accounts only. Every action is logged.</p>
      </div>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      <form className="grid gap-3" onSubmit={(e) => void submit(e)} noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" aria-invalid={Boolean(formState.errors.email)} {...register("email")} />
          {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(formState.errors.password)} {...register("password")} />
          {formState.errors.password && <p className="text-xs text-destructive">{formState.errors.password.message}</p>}
        </div>
        {needsCode && (
          <div className="grid gap-1.5">
            <Label htmlFor="totpCode">Authenticator code</Label>
            <Input id="totpCode" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} aria-invalid={Boolean(formState.errors.totpCode)} {...register("totpCode")} />
            {formState.errors.totpCode && <p className="text-xs text-destructive">{formState.errors.totpCode.message}</p>}
          </div>
        )}
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Sign in
        </Button>
      </form>
    </Card>
  );
}
