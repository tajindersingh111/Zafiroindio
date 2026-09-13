"use client";

import { useState } from "react";
import { Upload, AlertCircle, RefreshCw, X, Sparkles } from "lucide-react";
import { convertImageToWebP } from "@/lib/utils/image-converter";

interface ImageUploaderProps {
  onImageUploaded: (webpUrl: string) => void;
  currentImage?: string;
  label?: string;
  className?: string;
}

export default function ImageUploader({
  onImageUploaded,
  currentImage = "",
  label = "Upload Image",
  className = ""
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImage);
  const [stats, setStats] = useState<{ originalSize?: string; webpSize?: string; savings?: string } | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      // 1. Client-side WebP Conversion Pre-processing
      const webpResult = await convertImageToWebP(file, 0.85);

      // 2. Upload to Server for Sharp Processing & Permanent WebP Storage
      const formData = new FormData();
      formData.append("file", webpResult.file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      setPreviewUrl(data.url);
      setStats({
        originalSize: (webpResult.originalSize / 1024).toFixed(1) + " KB",
        webpSize: (webpResult.webpSize / 1024).toFixed(1) + " KB",
        savings: data.savingsPercent || `${webpResult.savingsPercent}%`
      });

      onImageUploaded(data.url);

    } catch (err: any) {
      console.error("WebP Upload Error:", err);
      setError(err.message || "Image conversion/upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl("");
    setStats(null);
    onImageUploaded("");
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone">
          {label}
        </label>
      )}

      {previewUrl ? (
        /* ── Preview State ─────────────────────────────── */
        <div className="border border-stone/20 rounded-sm bg-cream-card p-3 flex items-center gap-4">
          {/* Thumbnail */}
          <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-stone/20 bg-paper shrink-0">
            <img src={previewUrl} alt="Uploaded" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 bg-indigo text-white text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
              WebP
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-medium text-ink truncate font-sans">
              {previewUrl.split("/").pop()}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-green-700">
              <Sparkles className="w-3 h-3" />
              <span>Auto-converted to WebP</span>
            </div>
            {stats && (
              <p className="text-[11px] text-stone">
                Size:{" "}
                <span className="text-ink font-medium">{stats.webpSize}</span>
                {" "}(was {stats.originalSize} ·{" "}
                <span className="text-green-700">{stats.savings} saved</span>)
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-stone hover:text-madder hover:bg-madder/5 rounded-sm transition-colors shrink-0"
            title="Remove Image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* ── Drop Zone ─────────────────────────────────── */
        <label className="relative border border-dashed border-stone/40 hover:border-indigo/50 bg-paper hover:bg-paper-deep rounded-sm p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center space-y-2 group">
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-indigo">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-xs text-stone">Converting to WebP &amp; saving…</span>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-sm bg-paper-deep border border-stone/30 flex items-center justify-center text-indigo group-hover:bg-indigo/5 transition-colors">
                <Upload className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-ink">
                  Click to upload{" "}
                  <span className="text-indigo font-semibold">— auto WebP conversion</span>
                </p>
                <p className="text-[11px] text-stone">
                  PNG, JPG, JPEG, GIF, SVG — compressed &amp; optimised automatically
                </p>
              </div>
            </>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {error && (
        <div className="p-2.5 bg-madder/5 border border-madder/20 rounded-sm text-madder text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
