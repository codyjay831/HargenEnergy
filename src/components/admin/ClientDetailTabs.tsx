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
  showWalkthroughTab: boolean;
  overview: React.ReactNode;
  walkthrough: React.ReactNode;
  setup: React.ReactNode;
  billing: React.ReactNode;
};

function resolveActiveTab(
  tabParam: string | null | undefined,
  openParam: string | null | undefined,
  initialTab: AdminClientTab,
  showWalkthroughTab: boolean,
): AdminClientTab {
  const hasUrlTabHint = Boolean(tabParam || openParam);
  let activeTab = hasUrlTabHint
    ? resolveAdminClientTab(tabParam, openParam)
    : initialTab;

  if (activeTab === "walkthrough" && !showWalkthroughTab) {
    activeTab = "overview";
  }

  return activeTab;
}

export function ClientDetailTabs({
  clientId,
  initialTab,
  showWalkthroughTab,
  overview,
  walkthrough,
  setup,
  billing,
}: ClientDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const openParam = searchParams?.get("open");
  const activeTab = resolveActiveTab(tabParam, openParam, initialTab, showWalkthroughTab);

  const handleTabChange = useCallback(
    (value: string | number | null) => {
      if (typeof value !== "string" || !isAdminClientTab(value)) {
        return;
      }
      if (value === "walkthrough" && !showWalkthroughTab) {
        return;
      }

      router.replace(adminClientTabHref(clientId, value), { scroll: false });
    },
    [clientId, router, showWalkthroughTab],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="w-full max-w-2xl flex-wrap h-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {showWalkthroughTab && <TabsTrigger value="walkthrough">Walkthrough</TabsTrigger>}
        <TabsTrigger value="setup">Setup & access</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        {overview}
      </TabsContent>

      {showWalkthroughTab && (
        <TabsContent value="walkthrough" className="mt-0">
          {walkthrough}
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
