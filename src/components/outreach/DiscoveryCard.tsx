"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bookmark,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Plus,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import type { OutreachDiscoveryStatus } from "@/generated/prisma/client";

export type DiscoveryCardData = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  website?: string | null;
  phone?: string | null;
  rating?: number | null;
  status: OutreachDiscoveryStatus;
  fitScore?: number | null;
  painTags: string[];
  matchedCompanyId?: string | null;
  googlePlaceId?: string | null;
  source?: string | null;
};

type DiscoveryCardProps = {
  discovery: DiscoveryCardData;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  loadingAction: string | null;
  onSave: (id: string) => void;
  onReview: (id: string) => void;
  onDismiss: (id: string) => void;
};

export function DiscoveryCard({
  discovery,
  selected,
  onSelect,
  loadingAction,
  onSave,
  onReview,
  onDismiss,
}: DiscoveryCardProps) {
  const location = [discovery.city, discovery.state].filter(Boolean).join(", ");
  const mapsUrl = discovery.googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${discovery.googlePlaceId}`
    : undefined;
  const isBusy = loadingAction === discovery.id;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(discovery.id, checked === true)}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm">{discovery.name}</p>
              <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                {discovery.status.toLowerCase()}
              </Badge>
            </div>
            {location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </p>
            )}
            {discovery.address && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{discovery.address}</p>
            )}
            {discovery.website && (
              <p className="text-xs text-primary truncate mt-1">{discovery.website}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {discovery.rating != null && (
            <Badge variant="outline" className="text-[10px]">
              Rating {discovery.rating}
            </Badge>
          )}
          {discovery.fitScore != null && discovery.fitScore > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Fit {discovery.fitScore}/5
            </Badge>
          )}
          {discovery.painTags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] bg-amber-50">
              {tag}
            </Badge>
          ))}
          {discovery.source && (
            <Badge variant="outline" className="text-[10px]">
              {discovery.source}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {discovery.phone && (
            <a
              href={`tel:${discovery.phone}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Maps
            </a>
          )}
          {discovery.matchedCompanyId ? (
            <Link href={`/admin/outreach/companies/${discovery.matchedCompanyId}`}>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Open CRM
              </Button>
            </Link>
          ) : (
            <>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={isBusy}
                onClick={() => onSave(discovery.id)}
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={isBusy}
                onClick={() => onReview(discovery.id)}
              >
                <Bookmark className="h-3 w-3 mr-1" />
                Later
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                disabled={isBusy}
                onClick={() => onDismiss(discovery.id)}
              >
                <SkipForward className="h-3 w-3 mr-1" />
                Skip
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
