"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Loader2, 
  Plus, 
  Check, 
  ExternalLink, 
  CheckCircle2,
  ArrowLeft,
  Globe,
  MapPin,
  FileText
} from "lucide-react";
import { 
  searchContractors, 
  searchPermitStack, 
  getPlaceDetails, 
  createOutreachCompany 
} from "@/app/actions/outreach";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter } from "next/navigation";

const permitStackSearchModeLabels: Record<string, string> = {
  contractors_by_area: "Contractors by area",
  contractors_by_name: "Contractors by name",
  derived_from_permits: "Derived from permits",
};

export default function ContractorFinderPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeSource, setActiveSource] = useState("google");
  const [results, setResults] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ google: 0, permitstack: 0 });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [permitStackMessage, setPermitStackMessage] = useState<string | null>(null);
  const [permitStackSearchMode, setPermitStackSearchMode] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsSearching(true);
    setHasSearched(true);
    setPermitStackMessage(null);
    setPermitStackSearchMode(null);
    let result;
    
    if (activeSource === "google") {
      result = await searchContractors(query);
    } else {
      result = await searchPermitStack(query);
    }

    if (result.success) {
      setResults(result.results);
      setCounts(prev => ({ ...prev, [activeSource]: result.count || 0 }));
      if (activeSource === "permitstack") {
        const permitStackResult = result as {
          searchMode?: string;
          message?: string;
        };
        setPermitStackSearchMode(permitStackResult.searchMode ?? null);
        setPermitStackMessage(permitStackResult.message ?? null);
      }
    } else {
      setResults([]);
      if (activeSource === "permitstack") {
        setPermitStackSearchMode(null);
        setPermitStackMessage(null);
      }
      alert(result.error);
    }
    setIsSearching(false);
  };

  const handleSave = async (result: any) => {
    setLoadingId(result.placeId);
    
    let companyData: any = {
      name: result.name,
      city: result.city,
      state: result.state,
      leadSource: activeSource.charAt(0).toUpperCase() + activeSource.slice(1),
      sourceQuery: query,
    };

    if (activeSource === "google") {
      // Get more details (website, phone)
      const detailsResult = await getPlaceDetails(result.placeId);
      if (detailsResult.success) {
        const place = detailsResult.place;
        companyData.website = place.website;
        companyData.sourceUrl = `https://www.google.com/maps/place/?q=place_id:${result.placeId}`;
        companyData.notes = `Google Rating: ${result.rating} (${result.userRatingsTotal} reviews)\nAddress: ${result.address}`;
      }
    } else if (activeSource === "permitstack") {
      const permitLines = [
        "PermitStack Result",
        permitStackSearchMode
          ? `Search Mode: ${permitStackSearchModeLabels[permitStackSearchMode] || permitStackSearchMode}`
          : null,
        result.permitCount != null ? `Total Permits: ${result.permitCount}` : null,
        result.lastPermitDate ? `Last Permit Date: ${result.lastPermitDate}` : null,
        result.specialties?.length ? `Specialties: ${result.specialties.join(", ")}` : null,
        result.jurisdiction ? `Jurisdiction: ${result.jurisdiction}` : null,
        result.address ? `Address: ${result.address}` : null,
      ].filter(Boolean);

      companyData.notes = permitLines.join("\n");
    }
    
    const saveResult = await createOutreachCompany(companyData);

    if (saveResult.success) {
      setSavedIds(prev => new Set(prev).add(result.placeId));
      router.refresh();
    } else {
      alert(saveResult.error);
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/outreach/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Contractor Finder</h1>
          <p className="text-muted-foreground text-sm">
            Search with Google Places, or use PermitStack for covered jurisdictions by city/state
            or contractor name.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeSource} onValueChange={setActiveSource} className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="google" className="text-xs">
                Google {counts.google > 0 && `(${counts.google})`}
              </TabsTrigger>
              <TabsTrigger value="permitstack" className="text-xs">
                PermitStack {counts.permitstack > 0 && `(${counts.permitstack})`}
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSearch} className="space-y-2">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      activeSource === "permitstack"
                        ? "Sacramento, CA or Smith Solar"
                        : "e.g. solar contractors in Sacramento, CA"
                    }
                    className="pl-10"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Search
                </Button>
              </div>
              {activeSource === "permitstack" && (
                <p className="text-xs text-muted-foreground">
                  PermitStack only returns contractors in covered jurisdictions with permit
                  activity. Use a city and state for market discovery, or a contractor name for
                  direct lookup.
                </p>
              )}
            </form>
          </Tabs>
        </CardContent>
      </Card>

      {activeSource === "permitstack" && permitStackSearchMode && (
        <p className="text-sm text-muted-foreground">
          Search mode: {permitStackSearchModeLabels[permitStackSearchMode] || permitStackSearchMode}
        </p>
      )}

      {activeSource === "permitstack" && hasSearched && results.length === 0 && permitStackMessage && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{permitStackMessage}</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
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
                    <div className="flex flex-col">
                      <span className="font-medium">{result.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {result.address}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {result.city ? `${result.city}, ` : ""}{result.state || ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    {activeSource === "permitstack" ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {result.permitCount != null ? `${result.permitCount} permits` : "Permit data unavailable"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Last: {result.lastPermitDate}</span>
                      </div>
                    ) : result.rating ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{result.rating}</span>
                        <CheckCircle2 className="h-3 w-3 text-amber-400" />
                        <span className="text-xs text-muted-foreground">({result.userRatingsTotal})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No ratings</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {savedIds.has(result.placeId) ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        <Check className="h-3 w-3 mr-1" />
                        Saved
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSave(result)}
                        disabled={loadingId === result.placeId}
                      >
                        {loadingId === result.placeId ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1" />
                        )}
                        Save Prospect
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
