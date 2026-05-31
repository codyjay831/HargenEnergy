"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Star,
  ShieldCheck,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  enrichWithApollo,
  enrichWithYelp,
  checkLicenseStatus,
  enrichCompanyWithAI,
} from "@/app/actions/outreach";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { YelpBusinessCandidate } from "@/lib/outreach-yelp";

interface EnrichmentToolsProps {
  companyId: string;
}

export function EnrichmentTools({ companyId }: EnrichmentToolsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [yelpCandidates, setYelpCandidates] = useState<YelpBusinessCandidate[]>([]);
  const [yelpMessage, setYelpMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleEnrich = async (
    source: string,
    action: (companyId: string) => Promise<{ success?: boolean; error?: string }>,
  ) => {
    setLoading(source);
    const result = await action(companyId);
    if (result.success) {
      toast.success(
        "message" in result && result.message ? String(result.message) : "Enrichment complete"
      );
      router.refresh();
    } else {
      toast.error(result.error || "Enrichment failed");
    }
    setLoading(null);
  };

  const handleYelpEnrich = async (selectedBusinessId?: string) => {
    setLoading("yelp");
    setYelpMessage(null);

    const result = await enrichWithYelp(companyId, selectedBusinessId);

    if ("requiresSelection" in result && result.requiresSelection) {
      setYelpCandidates(result.candidates || []);
      setYelpMessage(result.message || "Select the correct Yelp business.");
      setLoading(null);
      return;
    }

    if ("success" in result && result.success) {
      setYelpCandidates([]);
      setYelpMessage(null);
      toast.success("Yelp enrichment complete");
      router.refresh();
    } else {
      const errorMessage = "error" in result ? (result.error as string) : "An unknown error occurred";
      toast.error(errorMessage);
    }

    setLoading(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Enrichment Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start text-xs h-9"
          onClick={() => handleEnrich("apollo", enrichWithApollo)}
          disabled={!!loading}
        >
          {loading === "apollo" ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <Users className="h-3 w-3 mr-2 text-blue-500" />
          )}
          Find People (Apollo)
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start text-xs h-9"
          onClick={() => handleYelpEnrich()}
          disabled={!!loading}
        >
          {loading === "yelp" ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <Star className="h-3 w-3 mr-2 text-amber-500" />
          )}
          Get Reviews (Yelp)
        </Button>

        {yelpMessage && (
          <p className="text-xs text-muted-foreground">{yelpMessage}</p>
        )}

        {yelpCandidates.length > 0 && (
          <div className="space-y-2 rounded-md border p-2">
            {yelpCandidates.map((candidate) => (
              <Button
                key={candidate.id}
                variant="outline"
                className="w-full justify-start h-auto py-2 text-left"
                onClick={() => handleYelpEnrich(candidate.id)}
                disabled={loading === "yelp"}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-xs font-medium">{candidate.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {[candidate.address, candidate.city, candidate.state]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Match confidence: {Math.round(candidate.confidence * 100)}%
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full justify-start text-xs h-9"
          onClick={() => handleEnrich("license", checkLicenseStatus)}
          disabled={!!loading}
        >
          {loading === "license" ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="h-3 w-3 mr-2 text-green-500" />
          )}
          Verify License (Trades)
        </Button>

        <Button
          variant="default"
          className="w-full justify-start text-xs h-9 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
          onClick={() => handleEnrich("ai", enrichCompanyWithAI)}
          disabled={!!loading}
        >
          {loading === "ai" ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 mr-2" />
          )}
          Full AI Analysis (Web + Reviews + License)
        </Button>
      </CardContent>
    </Card>
  );
}
