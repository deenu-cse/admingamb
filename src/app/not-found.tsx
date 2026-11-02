import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="tabular text-5xl font-black text-primary">404</p>
      <h1 className="text-lg font-semibold">Nothing here</h1>
      <p className="text-sm text-muted-foreground">That screen or record doesn&apos;t exist.</p>
      <Button asChild size="sm">
        <Link href="/">Back to overview</Link>
      </Button>
    </main>
  );
}
