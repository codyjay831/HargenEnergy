import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getCatalogHealthSummary } from "@/lib/client-catalog-loader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function CatalogHealthBanner() {
  const health = await getCatalogHealthSummary();

  if (health.globalCatalogReady && health.discoveryCatalogReady) {
    return null;
  }

  return (
    <div
      className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div className="space-y-1 text-sm">
          {!health.globalCatalogReady && (
            <p className="font-medium">
              Work catalog is empty — Request-Based clients and hybrid catalog paths cannot submit work.
            </p>
          )}
          {health.globalCatalogReady && !health.discoveryCatalogReady && (
            <p className="font-medium">
              Discovery intake has no active tasks — prospects cannot select support options on the public form.
            </p>
          )}
          <p className="text-amber-900/90">
            {health.globalActiveCount} active catalog task(s), {health.discoveryActiveCount} discovery-visible
            task(s).
          </p>
        </div>
      </div>
      <Link href="/admin/services" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}>
        Manage catalog
      </Link>
    </div>
  );
}
