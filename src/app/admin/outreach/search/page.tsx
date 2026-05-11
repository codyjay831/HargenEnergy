"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Loader2,
  Plus,
  Check,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  searchContractors,
  searchPermitStack,
  getPlaceDetails,
  createOutreachCompany,
  listOutreachSearchHistory,
  normalizePermitStackQueryWithAI,
  type PermitStackSearchInput,
} from "@/app/actions/outreach";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter } from "next/navigation";

const permitStackSearchModeLabels: Record<string, string> = {
  contractors_by_area: "Contractors by area",
  contractors_by_name: "Contractors by name",
  derived_from_permits: "Derived from permits",
};

const defaultPermitStackInput: PermitStackSearchInput = {
  searchType: "area",
  city: "",
  state: "",
  jurisdiction: "",
  contractorName: "",
  category: "solar",
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
  const [permitStackInput, setPermitStackInput] =
    useState<PermitStackSearchInput>(defaultPermitStackInput);
  const [aiAssistText, setAiAssistText] = useState("");
  const [aiAssistRationale, setAiAssistRationale] = useState<string | null>(null);
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [resolvedJurisdiction, setResolvedJurisdiction] = useState<string | null>(null);
  const [attemptedQueries, setAttemptedQueries] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadHistory = async () => {
      const history = await listOutreachSearchHistory(20);
      if (history.success) {
        setRecentSearches(history.runs);
      }
    };

    loadHistory();
  }, []);

  const handlePermitStackAiAssist = async () => {
    if (!aiAssistText.trim()) {
      return;
    }

    setIsAiAssisting(true);
    const result = await normalizePermitStackQueryWithAI(aiAssistText);
    if (result.success && result.input) {
      setPermitStackInput(result.input);
      setAiAssistRationale(result.rationale || null);
    } else {
      alert(result.error);
    }
    setIsAiAssisting(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setHasSearched(true);
    setPermitStackMessage(null);
    setPermitStackSearchMode(null);
    setResolvedJurisdiction(null);
    setAttemptedQueries([]);

    let result;

    if (activeSource === "google") {
      if (!query.trim()) {
        setIsSearching(false);
        return;
      }

      result = await searchContractors(query);
    } else {
      result = await searchPermitStack(permitStackInput);
    }

    if (result.success) {
      setResults(result.results);
      setCounts((prev) => ({ ...prev, [activeSource]: result.count || 0 }));
      if (activeSource === "permitstack") {
        const permitStackResult = result as {
          searchMode?: string;
          message?: string | null;
          resolvedJurisdiction?: string | null;
          attempted?: string[];
        };
        setPermitStackSearchMode(permitStackResult.searchMode ?? null);
        setPermitStackMessage(permitStackResult.message ?? null);
        setResolvedJurisdiction(permitStackResult.resolvedJurisdiction ?? null);
        setAttemptedQueries(permitStackResult.attempted ?? []);
      }
    } else {
      setResults([]);
      alert(result.error);
    }

    const history = await listOutreachSearchHistory(20);
    if (history.success) {
      setRecentSearches(history.runs);
    }

    setIsSearching(false);
  };

  const handleSave = async (result: any) => {
    if (result.alreadySaved && result.matchedCompanyId) {
      router.push(`/admin/outreach/companies/${result.matchedCompanyId}`);
      return;
    }

    setLoadingId(result.placeId);

    let companyData: any = {
      name: result.name,
      city: result.city,
      state: result.state,
      leadSource: activeSource.charAt(0).toUpperCase() + activeSource.slice(1),
      sourceQuery: activeSource === "google" ? query : JSON.stringify(permitStackInput),
    };

    if (activeSource === "google") {
      const detailsResult = await getPlaceDetails(result.placeId);
      if (detailsResult.success) {
        const place = detailsResult.place;
        companyData.website = place.website;
        companyData.sourceUrl = `https://www.google.com/maps/place/?q=place_id:${result.placeId}`;
        companyData.notes = `Google Rating: ${result.rating} (${result.userRatingsTotal} reviews)\nAddress: ${result.address}`;
      }
    } else if (activeSource === "permitstack") {
      companyData.sourceUrl = `https://api.permit-stack.com/v1/contractors/${result.placeId}`;
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
      setSavedIds((prev) => new Set(prev).add(result.placeId));
      router.refresh();
    } else if (saveResult.existingCompanyId) {
      router.push(`/admin/outreach/companies/${saveResult.existingCompanyId}`);
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
            Search with Google Places, or use PermitStack with exact city/state or contractor
            name fields.
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

            <form onSubmit={handleSearch} className="space-y-4">
              {activeSource === "google" ? (
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. solar contractors in Sacramento, CA"
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
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={permitStackInput.searchType === "area" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setPermitStackInput((prev) => ({ ...prev, searchType: "area" }))
                      }
                    >
                      Find contractors in area
                    </Button>
                    <Button
                      type="button"
                      variant={permitStackInput.searchType === "contractor" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setPermitStackInput((prev) => ({ ...prev, searchType: "contractor" }))
                      }
                    >
                      Find contractor by name
                    </Button>
                  </div>

                  {permitStackInput.searchType === "area" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        placeholder="City (e.g. Sacramento)"
                        value={permitStackInput.city || ""}
                        onChange={(e) =>
                          setPermitStackInput((prev) => ({ ...prev, city: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="State (e.g. CA)"
                        value={permitStackInput.state || ""}
                        onChange={(e) =>
                          setPermitStackInput((prev) => ({ ...prev, state: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Jurisdiction (optional)"
                        value={permitStackInput.jurisdiction || ""}
                        onChange={(e) =>
                          setPermitStackInput((prev) => ({
                            ...prev,
                            jurisdiction: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        placeholder="Contractor name (e.g. Smith Solar)"
                        value={permitStackInput.contractorName || ""}
                        onChange={(e) =>
                          setPermitStackInput((prev) => ({
                            ...prev,
                            contractorName: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="City (optional)"
                        value={permitStackInput.city || ""}
                        onChange={(e) =>
                          setPermitStackInput((prev) => ({ ...prev, city: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="State (optional)"
                        value={permitStackInput.state || ""}
                        onChange={(e) =>
                          setPermitStackInput((prev) => ({ ...prev, state: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-xs font-medium">AI fill form</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder='e.g. "Sacramento solar contractors" or "Smith Solar in CA"'
                        value={aiAssistText}
                        onChange={(e) => setAiAssistText(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePermitStackAiAssist}
                        disabled={isAiAssisting}
                      >
                        {isAiAssisting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {aiAssistRationale && (
                      <p className="text-xs text-muted-foreground">{aiAssistRationale}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSearching}>
                      {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Search PermitStack
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Tabs>
        </CardContent>
      </Card>

      {activeSource === "permitstack" && permitStackSearchMode && (
        <p className="text-sm text-muted-foreground">
          Search mode: {permitStackSearchModeLabels[permitStackSearchMode] || permitStackSearchMode}
          {resolvedJurisdiction ? ` · Jurisdiction: ${resolvedJurisdiction}` : ""}
        </p>
      )}

      {activeSource === "permitstack" && attemptedQueries.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Attempted queries: {attemptedQueries.join(" · ")}
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
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {result.permitCount != null
                            ? `${result.permitCount} permits`
                            : "Permit data unavailable"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Last: {result.lastPermitDate || "N/A"}
                        </span>
                      </div>
                    ) : result.rating ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{result.rating}</span>
                        <CheckCircle2 className="h-3 w-3 text-amber-400" />
                        <span className="text-xs text-muted-foreground">
                          ({result.userRatingsTotal})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No ratings</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {savedIds.has(result.placeId) || result.alreadySaved ? (
                      result.matchedCompanyId ? (
                        <Link href={`/admin/outreach/companies/${result.matchedCompanyId}`}>
                          <Button size="sm" variant="outline">
                            <Check className="h-3 w-3 mr-1" />
                            Open Existing
                          </Button>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          <Check className="h-3 w-3 mr-1" />
                          Saved
                        </Badge>
                      )
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

      {recentSearches.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-sm font-semibold">Recent searches</h2>
            <div className="space-y-2">
              {recentSearches.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {run.source} · {run.resultCount} results
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {run.queryText || JSON.stringify(run.params)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
