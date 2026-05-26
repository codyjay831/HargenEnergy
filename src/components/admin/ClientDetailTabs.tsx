"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminClientTabHref,
  type AdminClientTab,
  isAdminClientTab,
  resolveAdminClientTab,
} from "@/lib/admin-client-tabs";

type ClientDetailTabsProps = {
  clientId: string;
  initialTab: AdminClientTab;
  showDiscoveryTab: boolean;
  overview: React.ReactNode;
  discovery: React.ReactNode;
  setup: React.ReactNode;
  billing: React.ReactNode;
};

function resolveActiveTab(
  tabParam: string | null | undefined,
  initialTab: AdminClientTab,
  showDiscoveryTab: boolean,
): AdminClientTab {
  const hasUrlTabHint = Boolean(tabParam);
  let activeTab = hasUrlTabHint ? resolveAdminClientTab(tabParam) : initialTab;

  if (activeTab === "discovery" && !showDiscoveryTab) {
    activeTab = "overview";
  }

  return activeTab;
}

export function ClientDetailTabs({
  clientId,
  initialTab,
  showDiscoveryTab,
  overview,
  discovery,
  setup,
  billing,
}: ClientDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const activeTab = resolveActiveTab(tabParam, initialTab, showDiscoveryTab);

  const handleTabChange = useCallback(
    (value: string | number | null) => {
      if (typeof value !== "string" || !isAdminClientTab(value)) {
        return;
      }
      if (value === "discovery" && !showDiscoveryTab) {
        return;
      }

      router.replace(adminClientTabHref(clientId, value), { scroll: false });
    },
    [clientId, router, showDiscoveryTab],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="w-full max-w-2xl flex-wrap h-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {showDiscoveryTab && <TabsTrigger value="discovery">Discovery call</TabsTrigger>}
        <TabsTrigger value="setup">Setup & access</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        {overview}
      </TabsContent>

      {showDiscoveryTab && (
        <TabsContent value="discovery" className="mt-0">
          {discovery}
        </TabsContent>
      )}

      <TabsContent value="setup" className="mt-0">
        {setup}
      </TabsContent>

      <TabsContent value="billing" className="mt-0">
        {billing}
      </TabsContent>
    </Tabs>
  );
}
