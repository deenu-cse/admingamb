import type { Metadata } from "next";
import { RiskView } from "@/components/risk/risk-view";

export const metadata: Metadata = { title: "Risk" };

export default function RiskPage() {
  return <RiskView />;
}
