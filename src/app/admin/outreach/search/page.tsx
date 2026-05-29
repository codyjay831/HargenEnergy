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
  getOutreachSearchRun,
  normalizePermitStackQueryWithAI,
  type PermitStackSearchInput,
} from "@/app/actions/outreach";
import { getRecentOutreachSearchRuns } from "@/lib/outreach-search";

type OutreachSearchHistoryRun = Awaited<
  ReturnType<typeof getRecentOutreachSearchRuns>
>[number];
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
import type { OutreachCompanyInput } from "@/lib/validations";

const permitStackSearchModeLabels: Record<string, string> = {
  contractors_by_name: "Contractors by name",
  derived_from_permits: "Permits search",
};

type PermitStackAttemptDiagnostic = {
  query: string;
  permitTotal: number;
  permitRowsReturned: number;
  contractorRowsDerived: number;
};

const defaultPermitStackInput: PermitStackSearchInput = {
  searchType: "area",
  city: "",
  state: "",
  jurisdiction: "",
  contractorName: "",
  category: "solar",
  zipCode: "",
  keyword: "",
  filedAfter: "",
};

type FinderResult = {
  placeId: string;
  name: string;
  address?: string;
  city?: string | null;
  state?: string | null;
  rating?: number | null;
  userRatingsTotal?: number;
  permitCount?: number | null;
  lastPermitDate?: string | null;
  permitNumbers?: string[];
  samplePermitNumber?: string | null;
  samplePermitId?: string | null;
  sampleDescription?: string | null;
  contractorName?: string;
  jurisdiction?: string | null;
  specialties?: string[];
  sourceKind?: string;
  matchConfidence?: number;
  alreadySaved?: boolean;
  matchedCompanyId?: string | null;
};

function formatPermitNumberSummary(result: FinderResult) {
  if (result.permitNumbers?.length) {
    const preview = result.permitNumbers.slice(0, 3).join(", ");
    const remainder = result.permitNumbers.length - 3;
    return remainder > 0 ? `${preview} (+${remainder} more)` : preview;
  }

  return result.samplePermitNumber || "Not listed";
}

function buildPermitStackSavePayload(
  result: FinderResult,
  searchInput: PermitStackSearchInput,
  searchMode: string | null
) {
  const contractorName = result.contractorName || result.name;
  const permitNumberSummary = formatPermitNumberSummary(result);
  const notes = [
    "PermitStack contractor (named on permit)",
    `Contractor: ${contractorName}`,
    `Permit numbers: ${permitNumberSummary}`,
    result.lastPermitDate ? `Latest permit date: ${result.lastPermitDate}` : null,
    result.jurisdiction ? `Jurisdiction: ${result.jurisdiction}` : null,
    result.address ? `Job site: ${result.address}` : null,
    result.sampleDescription
      ? `Sample work: ${result.sampleDescription.slice(0, 200)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const sourceUrl =
    result.placeId && !result.placeId.startsWith("contractor-")
      ? `https://api.permit-stack.com/v1/contractors/${result.placeId}`
      : undefined;

  return {
    name: contractorName,
    city: result.city,
    state: result.state,
    notes,
    sourceUrl,
    enrichmentData: {
      permitStack: {
        searchParams: searchInput,
        searchMode,
        contractorName,
        permitNumbers: result.permitNumbers || [],
        samplePermitId: result.samplePermitId,
        samplePermitNumber: result.samplePermitNumber,
        sampleDescription: result.sampleDescription,
        jurisdiction: result.jurisdiction,
        address: result.address,
        city: result.city,
        state: result.state,
        permitCount: result.permitCount,
        lastPermitDate: result.lastPermitDate,
        matchConfidence: result.matchConfidence ?? 1,
        sourceKind: result.sourceKind || "named_contractor",
      },
    },
  };
}

function parsePermitStackParamsFromRun(params: unknown): PermitStackSearchInput | null {
  if (!params || typeof params !== "object") {
    return null;
  }

  const value = params as Record<string, unknown>;
  if (value.searchType !== "area" && value.searchType !== "contractor") {
    return null;
  }

  return {
    searchType: value.searchType,
    city: typeof value.city === "string" ? value.city : "",
    state: typeof value.state === "string" ? value.state : "",
    jurisdiction: typeof value.jurisdiction === "string" ? value.jurisdiction : "",
    contractorName: typeof value.contractorName === "string" ? value.contractorName : "",
    category: typeof value.category === "string" ? value.category : "solar",
    zipCode: typeof value.zipCode === "string" ? value.zipCode : "",
    keyword: typeof value.keyword === "string" ? value.keyword : "",
    filedAfter: typeof value.filedAfter === "string" ? value.filedAfter : "",
  };
}

export default function ContractorFinderPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeSource, setActiveSource] = useState("google");
  const [results, setResults] = useState<FinderResult[]>([]);
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
  const [aiAssistError, setAiAssistError] = useState<string | null>(null);
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [permitStackFormError, setPermitStackFormError] = useState<string | null>(null);
  const [resolvedJurisdiction, setResolvedJurisdiction] = useState<string | null>(null);
  const [attemptDiagnostics, setAttemptDiagnostics] = useState<PermitStackAttemptDiagnostic[]>(
    []
  );
  const [recentSearches, setRecentSearches] = useState<OutreachSearchHistoryRun[]>([]);
  const [replayedSearchAt, setReplayedSearchAt] = useState<string | null>(null);
  const [isViewingCachedResults, setIsViewingCachedResults] = useState(false);
  const [loadingReplayId, setLoadingReplayId] = useState<string | null>(null);
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
    setAiAssistError(null);
    const result = await normalizePermitStackQueryWithAI(aiAssistText);
    if (result.success && result.input) {
      setPermitStackInput((prev) => ({ ...prev, ...result.input }));
      setAiAssistRationale(result.rationale || null);
    } else {
      setAiAssistRationale(null);
      setAiAssistError(result.error || "Could not normalize that query.");
    }
    setIsAiAssisting(false);
  };

  const restorePermitStackForm = (params: unknown) => {
    const restored = parsePermitStackParamsFromRun(params);
    if (!restored) {
      return false;
    }

    setActiveSource("permitstack");
    setPermitStackInput(restored);
    setPermitStackFormError(null);
    setAiAssistError(null);
    return true;
  };

  const handleReRunPermitStackSearch = (params: unknown) => {
    restorePermitStackForm(params);
    setResults([]);
    setHasSearched(false);
    setPermitStackMessage(null);
    setPermitStackSearchMode(null);
    setResolvedJurisdiction(null);
    setAttemptDiagnostics([]);
    setReplayedSearchAt(null);
    setIsViewingCachedResults(false);
  };

  const handleReRunGoogleSearch = (params: unknown) => {
    const value =
      params && typeof params === "object" && "query" in params
        ? String((params as { query?: unknown }).query || "")
        : "";

    setActiveSource("google");
    setQuery(value);
    setResults([]);
    setHasSearched(false);
    setPermitStackMessage(null);
    setPermitStackSearchMode(null);
    setResolvedJurisdiction(null);
    setAttemptDiagnostics([]);
    setReplayedSearchAt(null);
    setIsViewingCachedResults(false);
  };

  const handleViewSearchResults = async (run: OutreachSearchHistoryRun) => {
    setLoadingReplayId(run.id);
    const response = await getOutreachSearchRun(run.id);

    if (!response.success || !response.replay) {
      alert(response.error || "Could not load saved search results.");
      setLoadingReplayId(null);
      return;
    }

    const replay = response.replay;
    const replayedAt = new Date(run.createdAt).toLocaleString();

    if (run.source === "PERMITSTACK") {
      restorePermitStackForm(run.params);
    } else if (run.source === "GOOGLE") {
      const value =
        run.params && typeof run.params === "object" && "query" in run.params
          ? String((run.params as { query?: unknown }).query || "")
          : "";
      setActiveSource("google");
      setQuery(value);
    }

    setResults((replay.results as FinderResult[]) || []);
    setCounts((prev) => ({
      ...prev,
      [run.source === "PERMITSTACK" ? "permitstack" : "google"]:
        replay.results?.length || 0,
    }));
    setHasSearched(true);
    setPermitStackMessage(replay.message ?? run.errorMessage ?? null);
    setPermitStackSearchMode(replay.searchMode ?? run.searchMode ?? null);
    setResolvedJurisdiction(replay.resolvedJurisdiction ?? null);
    setAttemptDiagnostics((replay.attemptDiagnostics as PermitStackAttemptDiagnostic[]) || []);
    setReplayedSearchAt(replayedAt);
    setIsViewingCachedResults(true);
    setLoadingReplayId(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setHasSearched(true);
    setPermitStackMessage(null);
    setPermitStackSearchMode(null);
    setResolvedJurisdiction(null);
    setAttemptDiagnostics([]);
    setPermitStackFormError(null);
    setReplayedSearchAt(null);
    setIsViewingCachedResults(false);

    let result;

    if (activeSource === "google") {
      if (!query.trim()) {
        setIsSearching(false);
        return;
      }

      result = await searchContractors(query);
    } else {
      if (permitStackInput.searchType === "contractor") {
        if (!permitStackInput.contractorName?.trim()) {
          setPermitStackFormError("Enter a contractor name before searching PermitStack.");
          setIsSearching(false);
          return;
        }
      } else if (
        !permitStackInput.city?.trim() &&
        !permitStackInput.zipCode?.trim() &&
        !permitStackInput.keyword?.trim() &&
        !permitStackInput.jurisdiction?.trim()
      ) {
        setPermitStackFormError(
          "Enter at least one area filter: city, ZIP code, keyword, or jurisdiction."
        );
        setIsSearching(false);
        return;
      }

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
          attemptDiagnostics?: PermitStackAttemptDiagnostic[];
        };
        setPermitStackSearchMode(permitStackResult.searchMode ?? null);
        setPermitStackMessage(permitStackResult.message ?? null);
        setResolvedJurisdiction(permitStackResult.resolvedJurisdiction ?? null);
        setAttemptDiagnostics(permitStackResult.attemptDiagnostics ?? []);
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

  const handleSave = async (result: FinderResult) => {
    if (activeSource === "permitstack" && result.sourceKind !== "named_contractor") {
      return;
    }

    if (result.alreadySaved && result.matchedCompanyId) {
      router.push(`/admin/outreach/companies/${result.matchedCompanyId}`);
      return;
    }

    setLoadingId(result.placeId);

    let companyData: OutreachCompanyInput = {
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
      companyData = {
        ...companyData,
        ...buildPermitStackSavePayload(result, permitStackInput, permitStackSearchMode),
      };
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. solar contractors in Sacramento, CA"
                      className="pl-10"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isSearching} className="sm:w-auto">
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
                    <div className="space-y-3">
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Input
                          placeholder="Category (default solar, all)"
                          value={permitStackInput.category || ""}
                          onChange={(e) =>
                            setPermitStackInput((prev) => ({ ...prev, category: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="ZIP code"
                          value={permitStackInput.zipCode || ""}
                          onChange={(e) =>
                            setPermitStackInput((prev) => ({ ...prev, zipCode: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Keyword"
                          value={permitStackInput.keyword || ""}
                          onChange={(e) =>
                            setPermitStackInput((prev) => ({ ...prev, keyword: e.target.value }))
                          }
                        />
                        <Input
                          type="date"
                          value={permitStackInput.filedAfter || ""}
                          onChange={(e) =>
                            setPermitStackInput((prev) => ({
                              ...prev,
                              filedAfter: e.target.value,
                            }))
                          }
                        />
                      </div>
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
                    {aiAssistError && (
                      <p className="text-xs text-destructive">{aiAssistError}</p>
                    )}
                  </div>

                  {permitStackFormError && (
                    <p className="text-sm text-destructive">{permitStackFormError}</p>
                  )}

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

      {isViewingCachedResults && replayedSearchAt && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Showing cached results from {replayedSearchAt}. Use Re-run search when you want a fresh
              provider lookup.
            </p>
          </CardContent>
        </Card>
      )}

      {activeSource === "permitstack" && permitStackSearchMode && (
        <p className="text-sm text-muted-foreground">
          Search mode: {permitStackSearchModeLabels[permitStackSearchMode] || permitStackSearchMode}
          {resolvedJurisdiction ? ` · Jurisdiction: ${resolvedJurisdiction}` : ""}
        </p>
      )}

      {activeSource === "permitstack" && attemptDiagnostics.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Search attempts</p>
          {attemptDiagnostics.map((attempt, index) => (
            <p key={`${attempt.query}-${index}`} className="text-xs text-muted-foreground">
              {attempt.query} · permits total {attempt.permitTotal} · rows returned{" "}
              {attempt.permitRowsReturned} · prospects derived {attempt.contractorRowsDerived}
            </p>
          ))}
        </div>
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
                      {activeSource === "permitstack" && (
                        <span className="text-xs text-muted-foreground">
                          Permit # {formatPermitNumberSummary(result)}
                        </span>
                      )}
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
                        disabled={
                          loadingId === result.placeId ||
                          (activeSource === "permitstack" &&
                            result.sourceKind !== "named_contractor")
                        }
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
                    <div className="flex items-center gap-2">
                      {(run.source === "PERMITSTACK" || run.source === "GOOGLE") && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSearchResults(run)}
                            disabled={loadingReplayId === run.id}
                          >
                            {loadingReplayId === run.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "View results"
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              run.source === "PERMITSTACK"
                                ? handleReRunPermitStackSearch(run.params)
                                : handleReRunGoogleSearch(run.params)
                            }
                          >
                            Re-run search
                          </Button>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
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
