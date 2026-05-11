"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  pullClientLogoFromWebsite,
  updateClientBranding,
} from "@/app/actions/client-branding";
import { Loader2, Sparkles } from "lucide-react";

interface ClientBrandingManagerProps {
  clientId: string;
  website: string | null;
  logoUrl: string | null;
  brandAccent: string | null;
}

export function ClientBrandingManager({
  clientId,
  website,
  logoUrl,
  brandAccent,
}: ClientBrandingManagerProps) {
  const [logo, setLogo] = useState(logoUrl ?? "");
  const [accent, setAccent] = useState(brandAccent ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await updateClientBranding({
        clientId,
        logoUrl: logo || null,
        brandAccent: accent || null,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setMessage("Branding saved.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    setMessage(null);
    setError(null);
    try {
      const result = await pullClientLogoFromWebsite(clientId);
      if (result.error) {
        setError(result.error);
      } else if (result.logoUrl) {
        setLogo(result.logoUrl);
        setMessage("Logo pulled from website.");
      }
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="space-y-4">
      {logo && (
        <div className="flex items-center gap-3 rounded-md border p-3 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="h-10 w-10 object-contain rounded" />
          <p className="text-xs text-muted-foreground break-all">{logo}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="client-logo-url">Logo URL</Label>
        <Input
          id="client-logo-url"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-brand-accent">Accent color</Label>
        <Input
          id="client-brand-accent"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          placeholder="#0f172a"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={!website || isPulling} onClick={handlePull}>
          {isPulling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="ml-2">Pull from website</span>
        </Button>
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className="ml-2">Save branding</span>
        </Button>
      </div>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
