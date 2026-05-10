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
  ArrowLeft
} from "lucide-react";
import { searchContractors, getPlaceDetails, createOutreachCompany } from "@/app/actions/outreach";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ContractorFinderPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsSearching(true);
    const result = await searchContractors(query);
    if (result.success) {
      setResults(result.results);
    } else {
      alert(result.error);
    }
    setIsSearching(false);
  };

  const handleSave = async (result: any) => {
    setLoadingId(result.placeId);
    
    // Get more details (website, phone)
    const detailsResult = await getPlaceDetails(result.placeId);
    if (!detailsResult.success) {
      alert(detailsResult.error);
      setLoadingId(null);
      return;
    }

    const place = detailsResult.place;
    
    const saveResult = await createOutreachCompany({
      name: place.name,
      website: place.website,
      city: result.city,
      state: result.state,
      leadSource: "Google Places",
      sourceQuery: query,
      sourceUrl: `https://www.google.com/maps/place/?q=place_id:${result.placeId}`,
      notes: `Google Rating: ${result.rating} (${result.userRatingsTotal} reviews)\nAddress: ${result.address}`,
    });

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
          <p className="text-muted-foreground text-sm">Search for solar contractors using Google Places.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
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
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rating</TableHead>
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
                    {result.rating ? (
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
