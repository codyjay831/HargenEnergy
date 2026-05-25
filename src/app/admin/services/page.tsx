import { getServiceCategories } from "@/app/actions/services";
import { EngagementType } from "@/generated/prisma/client";
import { getRecurringTasks } from "@/app/actions/recurring";
import { prisma } from "@/lib/prisma";
import { ensureCatalogSeeded } from "@/lib/catalog-seed";
import { ServiceManagement } from "@/components/admin/ServiceManagement";
import { RecurringTaskManagement } from "@/components/admin/RecurringTaskManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await ensureCatalogSeeded();

  const [categories, recurringTasks, clients] = await Promise.all([
    getServiceCategories(),
    getRecurringTasks(),
    prisma.client.findMany({
      where: { status: "ACTIVE", engagementType: EngagementType.SUPPORT_BLOCK },
      select: { id: true, companyName: true },
    }),
  ]);

  const allTasks = categories.flatMap(c => c.tasks.map(t => ({ id: t.id, name: `${c.name}: ${t.name}` })));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Management</h1>
          <p className="text-muted-foreground">Configure scope-based work types and internal scheduled templates.</p>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Service Catalog
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recurring Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <ServiceManagement initialCategories={categories} />
        </TabsContent>

        <TabsContent value="recurring">
          <RecurringTaskManagement 
            initialTasks={recurringTasks} 
            clients={clients}
            allTasks={allTasks}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
