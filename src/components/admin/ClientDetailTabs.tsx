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
  discoveryTabLabel?: string;
  showWorkTab?: boolean;
  showSetupTab?: boolean;
  showBillingTab?: boolean;
  overview: React.ReactNode;
  work?: React.ReactNode;
  discovery: React.ReactNode;
  setup: React.ReactNode;
  billing: React.ReactNode;
};

function resolveActiveTab(
  tabParam: string | null | undefined,
  initialTab: AdminClientTab,
  showDiscoveryTab: boolean,
  showWorkTab: boolean,
  showSetupTab: boolean,
  showBillingTab: boolean,
): AdminClientTab {
  const hasUrlTabHint = Boolean(tabParam);
  let activeTab = hasUrlTabHint ? resolveAdminClientTab(tabParam) : initialTab;

  if (activeTab === "discovery" && !showDiscoveryTab) {
    activeTab = "overview";
  }
  if (activeTab === "work" && !showWorkTab) {
    activeTab = "overview";
  }
  if (activeTab === "setup" && !showSetupTab) {
    activeTab = showWorkTab ? "work" : showDiscoveryTab ? "discovery" : "overview";
  }
  if (activeTab === "billing" && !showBillingTab) {
    activeTab = showWorkTab
      ? "work"
      : showSetupTab
        ? "setup"
        : showDiscoveryTab
          ? "discovery"
          : "overview";
  }

  return activeTab;
}

export function ClientDetailTabs({
  clientId,
  initialTab,
  showDiscoveryTab,
  discoveryTabLabel = "Discovery call",
  showWorkTab = false,
  showSetupTab = true,
  showBillingTab = true,
  overview,
  work,
  discovery,
  setup,
  billing,
}: ClientDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const activeTab = resolveActiveTab(
    tabParam,
    initialTab,
    showDiscoveryTab,
    showWorkTab,
    showSetupTab,
    showBillingTab,
  );

  const handleTabChange = useCallback(
    (value: string | number | null) => {
      if (typeof value !== "string" || !isAdminClientTab(value)) {
        return;
      }
      if (value === "discovery" && !showDiscoveryTab) {
        return;
      }
      if (value === "work" && !showWorkTab) {
        return;
      }
      if (value === "setup" && !showSetupTab) {
        return;
      }
      if (value === "billing" && !showBillingTab) {
        return;
      }

      router.replace(adminClientTabHref(clientId, value), { scroll: false });
    },
    [clientId, router, showBillingTab, showDiscoveryTab, showSetupTab, showWorkTab],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="w-full max-w-2xl flex-wrap h-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {showWorkTab && <TabsTrigger value="work">Work</TabsTrigger>}
        {showDiscoveryTab && <TabsTrigger value="discovery">{discoveryTabLabel}</TabsTrigger>}
        {showSetupTab && <TabsTrigger value="setup">Setup & access</TabsTrigger>}
        {showBillingTab && <TabsTrigger value="billing">Billing</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        {overview}
      </TabsContent>

      {showWorkTab && work && (
        <TabsContent value="work" className="mt-0">
          {work}
        </TabsContent>
      )}

      {showDiscoveryTab && (
        <TabsContent value="discovery" className="mt-0">
          {discovery}
        </TabsContent>
      )}

      {showSetupTab && (
        <TabsContent value="setup" className="mt-0">
          {setup}
        </TabsContent>
      )}

      {showBillingTab && (
        <TabsContent value="billing" className="mt-0">
          {billing}
        </TabsContent>
      )}
    </Tabs>
  );
}
