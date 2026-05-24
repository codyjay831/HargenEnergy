"use client";

import { useState, useRef, useEffect } from "react";
import { X, FileText, Upload as UploadIcon, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { uploadFile, validateFile, generateStoragePath } from "@/lib/firebase/storage";
import { toast } from "sonner";

export interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface FileUploadProps {
  endpoint: "supportAttachment" | "clientLogo";
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  className?: string;
  clientId?: string;
  requestId?: string;
  uploadSessionId?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export function FileUpload({
  endpoint,
  value = [],
  onChange,
  maxFiles = 5,
  className,
  clientId,
  requestId,
  uploadSessionId,
  onUploadingChange,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(value);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const type = endpoint === "clientLogo" ? "logo" : "attachment";

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const remainingSlots = maxFiles - files.length;
    const filesToUpload = Array.from(selectedFiles).slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      toast.error(`Maximum ${maxFiles} file${maxFiles !== 1 ? "s" : ""} reached`);
      return;
    }

    setUploading(true);

    try {
      const token = await fetch("/api/upload/get-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          clientId,
          requestId,
          uploadSessionId,
        }),
      }).then((res) => res.json());

      if (!token.success) {
        throw new Error(token.error || "Failed to get upload token");
      }

      const uploadPromises = filesToUpload.map(async (file) => {
        const validation = validateFile(file, type);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          throw new Error(validation.error);
        }

        const storagePath = generateStoragePath(
          type,
          token.metadata.clientId,
          file.name,
          {
            requestId: token.metadata.requestId ?? undefined,
            uploadSessionId: token.metadata.uploadSessionId ?? undefined,
          }
        );

        const result = await uploadFile(file, storagePath, (progress) => {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: progress.progress,
          }));
        });

        return {
          url: result.url,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const updatedFiles = [...files, ...uploadedFiles].slice(0, maxFiles);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);

      toast.success(`${uploadedFiles.length} file${uploadedFiles.length !== 1 ? "s" : ""} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleRemove = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onChange?.(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const canUploadMore = files.length < maxFiles && !uploading;

  return (
    <div className={cn("space-y-4", className)}>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
            >
              <div className="flex-shrink-0">
                {file.type.startsWith("image/") ? (
                  <div className="relative w-12 h-12 rounded overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-slate-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
                className="flex-shrink-0"
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="truncate">{fileName}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {canUploadMore && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple={maxFiles > 1}
            accept={
              type === "logo"
                ? "image/jpeg,image/jpg,image/png,image/gif,image/webp"
                : "application/pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
            }
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-slate-100">
                <UploadIcon className="h-6 w-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  {type === "logo"
                    ? "Images only (max 2MB)"
                    : "PDF, Images (max 8MB each)"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </div>
      )}

      {!canUploadMore && !uploading && (
        <p className="text-xs text-slate-500 text-center py-2">
          Maximum {maxFiles} file{maxFiles !== 1 ? "s" : ""} reached
        </p>
      )}
    </div>
  );
}
