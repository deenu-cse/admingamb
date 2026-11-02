import type { Metadata } from "next";
import { Suspense } from "react";
import { BetsView } from "@/components/bets/bets-view";

export const metadata: Metadata = { title: "Bets monitor" };

export default function BetsPage() {
  return (
    <Suspense>
      <BetsView />
    </Suspense>
  );
}
