"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorState, ListSkeleton, PageTitle } from "@/components/common/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { settingsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query-keys";
import { ReplayPanel } from "./replay-panel";
import { SettingsForm } from "./settings-form";
import { TwoFactor } from "./two-factor";

export function SettingsView() {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.settings, queryFn: settingsApi.get });
  return (
    <>
      <PageTitle hint="Every change is audited.">Settings</PageTitle>
      <Tabs defaultValue="platform">
        <TabsList>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="replay">Replay</TabsTrigger>
          <TabsTrigger value="account">My account</TabsTrigger>
        </TabsList>
        <TabsContent value="platform">
          {isPending ? (
            <ListSkeleton rows={4} className="h-32" />
          ) : error ? (
            <ErrorState error={error} retry={() => void refetch()} />
          ) : (
            // A new version means someone saved: start from their values, not a stale copy.
            <SettingsForm key={data.version} settings={data} />
          )}
        </TabsContent>
        <TabsContent value="replay"><ReplayPanel /></TabsContent>
        <TabsContent value="account"><TwoFactor /></TabsContent>
      </Tabs>
    </>
  );
}
