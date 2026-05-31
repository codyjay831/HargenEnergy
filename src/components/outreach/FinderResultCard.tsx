"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Star,
} from "lucide-react";
import Link from "next/link";

export type FinderResultCardData = {
  placeId: string;
  name: string;
  address?: string;
  city?: string | null;
  state?: string | null;
  rating?: number | null;
  userRatingsTotal?: number;
  phone?: string | null;
  website?: string | null;
  alreadySaved?: boolean;
  matchedCompanyId?: string | null;
  discoveryId?: string | null;
  discoveryStatus?: string | null;
  permitCount?: number | null;
  lastPermitDate?: string | null;
  sourceKind?: string;
};

type FinderResultCardProps = {
  result: FinderResultCardData;
  activeSource: string;
  isSaving: boolean;
  onSave: (result: FinderResultCardData) => void;
  formatPermitSummary?: (result: FinderResultCardData) => string;
};

export function FinderResultCard({
  result,
  activeSource,
  isSaving,
  onSave,
  formatPermitSummary,
}: FinderResultCardProps) {
  const location = [result.city, result.state].filter(Boolean).join(", ");
  const mapsUrl = result.placeId.startsWith("contractor-")
    ? undefined
    : `https://www.google.com/maps/place/?q=place_id:${result.placeId}`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight">{result.name}</p>
            {result.address && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.address}</p>
            )}
            {location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {location}
              </p>
            )}
          </div>
          {activeSource === "google" && result.rating ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm font-medium">{result.rating}</span>
              <CheckCircle2 className="h-3 w-3 text-amber-400" />
              <span className="text-xs text-muted-foreground">({result.userRatingsTotal})</span>
            </div>
          ) : null}
        </div>

        {activeSource === "permitstack" && formatPermitSummary && (
          <p className="text-xs text-muted-foreground">
            Permit # {formatPermitSummary(result)}
            {result.permitCount != null ? ` · ${result.permitCount} permits` : ""}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {result.alreadySaved && (
            <Badge variant="outline" className="text-[10px]">
              In CRM
            </Badge>
          )}
          {result.discoveryStatus && result.discoveryStatus !== "SAVED" && (
            <Badge variant="secondary" className="text-[10px] capitalize">
              {result.discoveryStatus.toLowerCase()}
            </Badge>
          )}
          {result.phone && (
            <Badge variant="outline" className="text-[10px]">
              Has phone
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {result.phone && (
            <a
              href={`tel:${result.phone}`}
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
          {result.alreadySaved && result.matchedCompanyId ? (
            <Link href={`/admin/outreach/companies/${result.matchedCompanyId}`}>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Open
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => onSave(result)}
              disabled={
                isSaving ||
                (activeSource === "permitstack" && result.sourceKind !== "named_contractor")
              }
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinderResultCards({
  results,
  activeSource,
  savingId,
  onSave,
  formatPermitSummary,
}: {
  results: FinderResultCardData[];
  activeSource: string;
  savingId: string | null;
  onSave: (result: FinderResultCardData) => void;
  formatPermitSummary?: (result: FinderResultCardData) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
      {results.map((result) => (
        <FinderResultCard
          key={result.placeId}
          result={result}
          activeSource={activeSource}
          isSaving={savingId === result.placeId}
          onSave={onSave}
          formatPermitSummary={formatPermitSummary}
        />
      ))}
    </div>
  );
}

export function FinderResultTable({
  results,
  activeSource,
  savingId,
  onSave,
  formatPermitSummary,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
}: {
  results: FinderResultCardData[];
  activeSource: string;
  savingId: string | null;
  onSave: (result: FinderResultCardData) => void;
  formatPermitSummary?: (result: FinderResultCardData) => string;
  Table: React.ComponentType<{ children: React.ReactNode }>;
  TableBody: React.ComponentType<{ children: React.ReactNode }>;
  TableCell: React.ComponentType<{ children: React.ReactNode; className?: string }>;
  TableHead: React.ComponentType<{ children: React.ReactNode; className?: string }>;
  TableHeader: React.ComponentType<{ children: React.ReactNode }>;
  TableRow: React.ComponentType<{ children: React.ReactNode }>;
}) {
  return (
    <div className="hidden xl:block bg-white border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>{activeSource === "permitstack" ? "Permits" : "Rating"}</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.placeId}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{result.name}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                    {result.address}
                  </span>
                  {result.alreadySaved && (
                    <Badge variant="outline" className="w-fit text-[10px]">
                      Already in CRM
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {result.city ? `${result.city}, ` : ""}
                  {result.state || ""}
                </span>
              </TableCell>
              <TableCell>
                {activeSource === "permitstack" ? (
                  <span className="text-sm">{formatPermitSummary?.(result) || "N/A"}</span>
                ) : result.rating ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">{result.rating}</span>
                    <Star className="h-3 w-3 text-amber-400" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No ratings</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {result.alreadySaved && result.matchedCompanyId ? (
                  <Link href={`/admin/outreach/companies/${result.matchedCompanyId}`}>
                    <Button size="sm" variant="outline">
                      <Check className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSave(result)}
                    disabled={savingId === result.placeId}
                  >
                    {savingId === result.placeId ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    Save
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
