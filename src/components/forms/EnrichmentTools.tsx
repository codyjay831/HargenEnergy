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
  CheckCircle2
} from "lucide-react";
import { 
  enrichWithApollo, 
  enrichWithYelp, 
  checkLicenseStatus, 
  enrichCompanyWithAI 
} from "@/app/actions/outreach";
import { useRouter } from "next/navigation";

interface EnrichmentToolsProps {
  companyId: string;
}

export function EnrichmentTools({ companyId }: EnrichmentToolsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleEnrich = async (source: string, action: Function) => {
    setLoading(source);
    const result = await action(companyId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
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
          onClick={() => handleEnrich("yelp", enrichWithYelp)}
          disabled={!!loading}
        >
          {loading === "yelp" ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <Star className="h-3 w-3 mr-2 text-amber-500" />
          )}
          Get Reviews (Yelp)
        </Button>

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
          Full AI Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
