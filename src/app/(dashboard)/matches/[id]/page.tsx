import type { Metadata } from "next";
import { MatchDetailView } from "@/components/matches/match-detail-view";

export const metadata: Metadata = { title: "Match" };

export default async function MatchPage({ params }: PageProps<"/matches/[id]">) {
  const { id } = await params;
  return <MatchDetailView id={id} />;
}
