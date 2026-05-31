import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { DiscoveryInbox } from "@/components/outreach/DiscoveryInbox";
import { OutreachDiscoveryStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function OutreachDiscoveryPage() {
  const discoveries = await prisma.outreachDiscovery.findMany({
    where: {
      status: {
        in: [
          OutreachDiscoveryStatus.NEW,
          OutreachDiscoveryStatus.REVIEWING,
          OutreachDiscoveryStatus.SAVED,
          OutreachDiscoveryStatus.DISMISSED,
        ],
      },
    },
    orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
    include: {
      matchedCompany: {
        select: { id: true },
      },
    },
  });

  const activeCount = discoveries.filter(
    (d) =>
      d.status === OutreachDiscoveryStatus.NEW ||
      d.status === OutreachDiscoveryStatus.REVIEWING
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/outreach">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Discovery Inbox</h1>
            <p className="text-muted-foreground text-sm">
              {activeCount} unsaved {activeCount === 1 ? "company" : "companies"} to triage
            </p>
          </div>
        </div>
        <Link href="/admin/outreach/search">
          <Button size="sm">
            <Search className="h-4 w-4 mr-2" />
            Find Contractors
          </Button>
        </Link>
      </div>

      <DiscoveryInbox
        initialDiscoveries={discoveries.map((d) => ({
          id: d.id,
          name: d.name,
          city: d.city,
          state: d.state,
          address: d.address,
          website: d.website,
          phone: d.phone,
          rating: d.rating,
          status: d.status,
          fitScore: d.fitScore,
          painTags: d.painTags,
          matchedCompanyId: d.matchedCompanyId ?? d.matchedCompany?.id ?? null,
          googlePlaceId: d.googlePlaceId,
          source: d.source,
        }))}
      />
    </div>
  );
}
