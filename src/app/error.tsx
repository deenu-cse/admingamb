"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="tabular text-5xl font-black text-destructive">500</p>
      <h1 className="text-lg font-semibold">This screen hit an error</h1>
      <p className="text-sm text-muted-foreground">Nothing was changed. Try again, or check System health.</p>
      <Button size="sm" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}
