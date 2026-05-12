"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  pullClientLogoFromWebsite,
  updateClientBranding,
} from "@/app/actions/client-branding";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { toast } from "sonner";

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
  const [isSaving, setIsSaving] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFileUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    if (files.length > 0) {
      setLogo(files[0].url);
      toast.success("Logo uploaded successfully!");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateClientBranding({
        clientId,
        logoUrl: logo || null,
        brandAccent: accent || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Branding saved successfully!");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      const result = await pullClientLogoFromWebsite(clientId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.logoUrl) {
        setLogo(result.logoUrl);
        toast.success("Logo pulled from website!");
      }
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="space-y-6">
      {logo && (
        <div className="flex items-center gap-3 rounded-md border p-4 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="Client logo" className="h-16 w-16 object-contain rounded border border-slate-200 bg-white p-1" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700">Current Logo</p>
            <p className="text-xs text-muted-foreground break-all mt-1">{logo}</p>
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-4 w-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-900">Upload New Logo</h4>
        </div>
        <FileUpload
          endpoint="clientLogo"
          value={uploadedFiles}
          onChange={handleFileUpload}
          maxFiles={1}
          clientId={clientId}
        />
      </div>

      <div className="border-t pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Or Enter Logo URL</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-logo-url">Logo URL</Label>
            <Input
              id="client-logo-url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button type="button" variant="outline" disabled={!website || isPulling} onClick={handlePull} className="w-full">
            {isPulling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="ml-2">Pull from website</span>
          </Button>
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client-brand-accent">Accent Color</Label>
          <div className="flex gap-2">
            <Input
              id="client-brand-accent"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder="#0f172a"
              className="flex-1"
            />
            {accent && (
              <div
                className="w-12 h-10 rounded border border-slate-200"
                style={{ backgroundColor: accent }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="button" disabled={isSaving} onClick={handleSave} className="px-8">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Branding"
          )}
        </Button>
      </div>
    </div>
  );
}
