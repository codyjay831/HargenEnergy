"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Loader2,
  ArrowLeft,
  Sparkles,
  FileDown,
} from "lucide-react";
import {
  searchContractors,
  searchPermitStack,
  getPlaceDetails,
  createOutreachCompany,
  listOutreachSearchHistory,
  getOutreachSearchRun,
  normalizePermitStackQueryWithAI,
  saveDiscoveryToCompany,
  exportOutreachCSV,
  type PermitStackSearchInput,
} from "@/app/actions/outreach";
import { getRecentOutreachSearchRuns } from "@/lib/outreach-search";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OutreachCompanyInput } from "@/lib/validations";
import {
  FinderResultCards,
  FinderResultTable,
  type FinderResultCardData,
} from "@/components/outreach/FinderResultCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type OutreachSearchHistoryRun = Awaited<
  ReturnType<typeof getRecentOutreachSearchRuns>
>[number];

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

function formatPermitNumberSummary(result: FinderResultCardData) {
  const extended = result as FinderResultCardData & {
    permitNumbers?: string[];
    samplePermitNumber?: string | null;
  };
  if (extended.permitNumbers?.length) {
    const preview = extended.permitNumbers.slice(0, 3).join(", ");
    const remainder = extended.permitNumbers.length - 3;
    return remainder > 0 ? `${preview} (+${remainder} more)` : preview;
  }
  return extended.samplePermitNumber || "Not listed";
}

function buildPermitStackSavePayload(
  result: FinderResultCardData,
  searchInput: PermitStackSearchInput,
  searchMode: string | null
) {
  const extended = result as FinderResultCardData & {
    contractorName?: string;
    permitNumbers?: string[];
    samplePermitId?: string | null;
    samplePermitNumber?: string | null;
    sampleDescription?: string | null;
    jurisdiction?: string | null;
    permitCount?: number | null;
    lastPermitDate?: string | null;
    matchConfidence?: number;
    sourceKind?: string;
  };
  const contractorName = extended.contractorName || result.name;
  const permitNumberSummary = formatPermitNumberSummary(result);
  const notes = [
    "PermitStack contractor (named on permit)",
    `Contractor: ${contractorName}`,
    `Permit numbers: ${permitNumberSummary}`,
    extended.lastPermitDate ? `Latest permit date: ${extended.lastPermitDate}` : null,
    extended.jurisdiction ? `Jurisdiction: ${extended.jurisdiction}` : null,
    result.address ? `Job site: ${result.address}` : null,
    extended.sampleDescription
      ? `Sample work: ${extended.sampleDescription.slice(0, 200)}`
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
    permitStackId: result.placeId.startsWith("contractor-") ? undefined : result.placeId,
    enrichmentData: {
      permitStack: {
        searchParams: searchInput,
        searchMode,
        contractorName,
        permitNumbers: extended.permitNumbers || [],
        samplePermitId: extended.samplePermitId,
        samplePermitNumber: extended.samplePermitNumber,
        sampleDescription: extended.sampleDescription,
        jurisdiction: extended.jurisdiction,
        address: result.address,
        city: result.city,
        state: result.state,
        permitCount: extended.permitCount,
        lastPermitDate: extended.lastPermitDate,
        matchConfidence: extended.matchConfidence ?? 1,
        sourceKind: extended.sourceKind || "named_contractor",
      },
    },
  };
}

function parsePermitStackParamsFromRun(params: unknown): PermitStackSearchInput | null {
  if (!params || typeof params !== "object") return null;
  const value = params as Record<string, unknown>;
  if (value.searchType !== "area" && value.searchType !== "contractor") return null;
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
  const [results, setResults] = useState<FinderResultCardData[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ google: 0, permitstack: 0 });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
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
  const [attemptDiagnostics, setAttemptDiagnostics] = useState<PermitStackAttemptDiagnostic[]>([]);
  const [recentSearches, setRecentSearches] = useState<OutreachSearchHistoryRun[]>([]);
  const [replayedSearchAt, setReplayedSearchAt] = useState<string | null>(null);
  const [isViewingCachedResults, setIsViewingCachedResults] = useState(false);
  const [loadingReplayId, setLoadingReplayId] = useState<string | null>(null);
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    listOutreachSearchHistory(20).then((history) => {
      if (history.success) setRecentSearches(history.runs);
    });
  }, []);

  const handlePermitStackAiAssist = async () => {
    if (!aiAssistText.trim()) return;
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
    if (!restored) return false;
    setActiveSource("permitstack");
    setPermitStackInput(restored);
    setPermitStackFormError(null);
    setAiAssistError(null);
    return true;
  };

  const handleViewSearchResults = async (run: OutreachSearchHistoryRun) => {
    setLoadingReplayId(run.id);
    const response = await getOutreachSearchRun(run.id);
    if (!response.success || !response.replay) {
      toast.error(response.error || "Could not load saved search results.");
      setLoadingReplayId(null);
      return;
    }
    const replay = response.replay;
    if (run.source === "PERMITSTACK") restorePermitStackForm(run.params);
    else if (run.source === "GOOGLE") {
      const value =
        run.params && typeof run.params === "object" && "query" in run.params
          ? String((run.params as { query?: unknown }).query || "")
          : "";
      setActiveSource("google");
      setQuery(value);
    }
    setResults((replay.results as FinderResultCardData[]) || []);
    setCounts((prev) => ({
      ...prev,
      [run.source === "PERMITSTACK" ? "permitstack" : "google"]: replay.results?.length || 0,
    }));
    setHasSearched(true);
    setNextPageToken(null);
    setPermitStackMessage(replay.message ?? run.errorMessage ?? null);
    setPermitStackSearchMode(replay.searchMode ?? run.searchMode ?? null);
    setResolvedJurisdiction(replay.resolvedJurisdiction ?? null);
    setAttemptDiagnostics((replay.attemptDiagnostics as PermitStackAttemptDiagnostic[]) || []);
    setReplayedSearchAt(new Date(run.createdAt).toLocaleString());
    setIsViewingCachedResults(true);
    setLoadingReplayId(null);
  };

  const handleExportRun = async (run: OutreachSearchHistoryRun) => {
    setExportingRunId(run.id);
    const result = await exportOutreachCSV("run", run.id);
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `outreach_search_run_${run.id.slice(0, 8)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Search run exported");
    } else {
      toast.error(result.error || "Export failed");
    }
    setExportingRunId(null);
  };

  const runGoogleSearch = async (pageToken?: string) => {
    const result = await searchContractors(query, pageToken);
    if (result.success) {
      setResults((prev) => (pageToken ? [...prev, ...result.results] : result.results));
      setCounts((prev) => ({
        ...prev,
        google: pageToken ? prev.google + (result.count || 0) : result.count || 0,
      }));
      setNextPageToken(result.nextPageToken || null);
    } else {
      if (!pageToken) setResults([]);
      toast.error(result.error || "Search failed");
    }
    return result.success;
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
    setNextPageToken(null);

    if (activeSource === "google") {
      if (!query.trim()) {
        setIsSearching(false);
        return;
      }
      await runGoogleSearch();
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
      const result = await searchPermitStack(permitStackInput);
      if (result.success) {
        setResults(result.results);
        setCounts((prev) => ({ ...prev, permitstack: result.count || 0 }));
        setPermitStackSearchMode(result.searchMode ?? null);
        setPermitStackMessage(result.message ?? null);
        setResolvedJurisdiction(result.resolvedJurisdiction ?? null);
        setAttemptDiagnostics(result.attemptDiagnostics ?? []);
      } else {
        setResults([]);
        toast.error(result.error || "PermitStack search failed");
      }
    }

    const history = await listOutreachSearchHistory(20);
    if (history.success) setRecentSearches(history.runs);
    setIsSearching(false);
  };

  const handleLoadMore = async () => {
    if (!nextPageToken) return;
    setIsSearching(true);
    await runGoogleSearch(nextPageToken);
    setIsSearching(false);
  };

  const handleSave = async (result: FinderResultCardData) => {
    if (activeSource === "permitstack" && result.sourceKind !== "named_contractor") return;

    if (result.alreadySaved && result.matchedCompanyId) {
      router.push(`/admin/outreach/companies/${result.matchedCompanyId}`);
      return;
    }

    if (result.discoveryId) {
      setLoadingId(result.placeId);
      const saveResult = await saveDiscoveryToCompany(result.discoveryId);
      if (saveResult.success && "companyId" in saveResult && saveResult.companyId) {
        toast.success("Saved to prospects");
        setResults((prev) =>
          prev.map((r) =>
            r.placeId === result.placeId
              ? { ...r, alreadySaved: true, matchedCompanyId: saveResult.companyId }
              : r
          )
        );
        router.refresh();
      } else {
        toast.error("error" in saveResult ? saveResult.error || "Could not save" : "Could not save");
      }
      setLoadingId(null);
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
      if (detailsResult.success && detailsResult.place) {
        const place = detailsResult.place;
        companyData = {
          ...companyData,
          website: place.website,
          googlePlaceId: result.placeId,
          sourceUrl: `https://www.google.com/maps/place/?q=place_id:${result.placeId}`,
          notes: `Google Rating: ${result.rating} (${result.userRatingsTotal} reviews)\nAddress: ${result.address}`,
          primaryContactPhone: place.formatted_phone_number,
        };
      }
    } else {
      companyData = {
        ...companyData,
        ...buildPermitStackSavePayload(result, permitStackInput, permitStackSearchMode),
      };
    }

    const saveResult = await createOutreachCompany(companyData);

    if (saveResult.success) {
      toast.success("Saved to prospects");
      setResults((prev) =>
        prev.map((r) =>
          r.placeId === result.placeId
            ? { ...r, alreadySaved: true, matchedCompanyId: saveResult.company?.id }
            : r
        )
      );
      router.refresh();
    } else if (saveResult.existingCompanyId) {
      router.push(`/admin/outreach/companies/${saveResult.existingCompanyId}`);
    } else {
      toast.error(saveResult.error || "Could not save");
    }

    setLoadingId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/outreach/discovery">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Contractor Finder</h1>
          <p className="text-muted-foreground text-sm">
            Search results are saved to your{" "}
            <Link href="/admin/outreach/discovery" className="text-primary hover:underline">
              Discovery Inbox
            </Link>
            .
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
                        <Input placeholder="City" value={permitStackInput.city || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, city: e.target.value }))} />
                        <Input placeholder="State" value={permitStackInput.state || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, state: e.target.value }))} />
                        <Input placeholder="Jurisdiction" value={permitStackInput.jurisdiction || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, jurisdiction: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Input placeholder="Category" value={permitStackInput.category || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, category: e.target.value }))} />
                        <Input placeholder="ZIP" value={permitStackInput.zipCode || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, zipCode: e.target.value }))} />
                        <Input placeholder="Keyword" value={permitStackInput.keyword || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, keyword: e.target.value }))} />
                        <Input type="date" value={permitStackInput.filedAfter || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, filedAfter: e.target.value }))} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input placeholder="Contractor name" value={permitStackInput.contractorName || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, contractorName: e.target.value }))} />
                      <Input placeholder="City" value={permitStackInput.city || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, city: e.target.value }))} />
                      <Input placeholder="State" value={permitStackInput.state || ""} onChange={(e) => setPermitStackInput((p) => ({ ...p, state: e.target.value }))} />
                    </div>
                  )}
                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-xs font-medium">AI fill form</p>
                    <div className="flex gap-2">
                      <Input placeholder='e.g. "Sacramento solar contractors"' value={aiAssistText} onChange={(e) => setAiAssistText(e.target.value)} />
                      <Button type="button" variant="outline" onClick={handlePermitStackAiAssist} disabled={isAiAssisting}>
                        {isAiAssisting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </Button>
                    </div>
                    {aiAssistRationale && <p className="text-xs text-muted-foreground">{aiAssistRationale}</p>}
                    {aiAssistError && <p className="text-xs text-destructive">{aiAssistError}</p>}
                  </div>
                  {permitStackFormError && <p className="text-sm text-destructive">{permitStackFormError}</p>}
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
              Showing cached results from {replayedSearchAt}.
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
        <>
          <FinderResultCards
            results={results}
            activeSource={activeSource}
            savingId={loadingId}
            onSave={handleSave}
            formatPermitSummary={formatPermitNumberSummary}
          />
          <FinderResultTable
            results={results}
            activeSource={activeSource}
            savingId={loadingId}
            onSave={handleSave}
            formatPermitSummary={formatPermitNumberSummary}
            Table={Table}
            TableBody={TableBody}
            TableCell={TableCell}
            TableHead={TableHead}
            TableHeader={TableHeader}
            TableRow={TableRow}
          />
          {activeSource === "google" && nextPageToken && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Load more results
              </Button>
            </div>
          )}
        </>
      )}

      {recentSearches.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-sm font-semibold">Recent searches</h2>
            <div className="space-y-2">
              {recentSearches.map((run) => (
                <div key={run.id} className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {run.source} · {run.resultCount} results
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportRun(run)}
                        disabled={exportingRunId === run.id}
                      >
                        {exportingRunId === run.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <FileDown className="h-3 w-3 mr-1" />
                            Export CSV
                          </>
                        )}
                      </Button>
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
