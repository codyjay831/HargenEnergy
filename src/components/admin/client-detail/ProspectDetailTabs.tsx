"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminClientTabHref,
  isAdminClientTab,
  PROSPECT_DEFAULT_TAB,
  resolveProspectClientTab,
  type AdminClientTab,
} from "@/lib/admin-client-tabs";

type ProspectDetailTabsProps = {
  clientId: string;
  defaultTab?: AdminClientTab;
  showSetupTab: boolean;
  showBillingTab: boolean;
  discovery: React.ReactNode;
  setup: React.ReactNode;
  billing: React.ReactNode;
};

export function ProspectDetailTabs({
  clientId,
  defaultTab = PROSPECT_DEFAULT_TAB,
  showSetupTab,
  showBillingTab,
  discovery,
  setup,
  billing,
}: ProspectDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const activeTab = resolveProspectClientTab(tabParam, defaultTab, {
    showSetupTab,
    showBillingTab,
  });

  useEffect(() => {
    if (!tabParam) {
      router.replace(adminClientTabHref(clientId, defaultTab), { scroll: false });
    }
  }, [clientId, defaultTab, router, tabParam]);

  const handleTabChange = useCallback(
    (value: string | number | null) => {
      if (typeof value !== "string" || !isAdminClientTab(value)) {
        return;
      }
      if (value === "setup" && !showSetupTab) {
        return;
      }
      if (value === "billing" && !showBillingTab) {
        return;
      }
      if (value === "overview" || value === "work") {
        return;
      }

      router.replace(adminClientTabHref(clientId, value), { scroll: false });
    },
    [clientId, router, showBillingTab, showSetupTab],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="w-full max-w-2xl flex-wrap h-auto">
        <TabsTrigger value="discovery">Discovery</TabsTrigger>
        {showSetupTab && <TabsTrigger value="setup">Pre-activation setup</TabsTrigger>}
        {showBillingTab && <TabsTrigger value="billing">Access & billing</TabsTrigger>}
      </TabsList>

      <TabsContent value="discovery" className="mt-0">
        {discovery}
      </TabsContent>

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
