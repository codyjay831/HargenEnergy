"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { enrichCompanyWithAI } from "@/app/actions/outreach";
import { useRouter } from "next/navigation";

interface AIEnrichmentButtonProps {
  companyId: string;
}

export function AIEnrichmentButton({ companyId }: AIEnrichmentButtonProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const router = useRouter();

  const handleEnrich = async () => {
    setIsEnriching(true);
    const result = await enrichCompanyWithAI(companyId);
    
    if (result.success) {
      alert("Enrichment successful! Check the contacts and notes for new information.");
      router.refresh();
    } else {
      alert(`Enrichment failed: ${result.error}`);
    }
    setIsEnriching(false);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleEnrich} 
      disabled={isEnriching}
      className="border-purple-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
    >
      {isEnriching ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
      )}
      Enrich with AI
    </Button>
  );
}
