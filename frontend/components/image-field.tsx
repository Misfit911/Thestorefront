"use client";

import { useState } from "react";
import { compressImage } from "@/components/compress-image";
import { MediaImage } from "@/components/media-image";

export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const body = new FormData();
      body.set("file", compressed);
      const response = await fetch("/api/upload", { method: "POST", body });
      const json = (await response.json()) as { key?: string; error?: string };
      if (!response.ok || !json.key) throw new Error(json.error || "Upload failed");
      onChange(json.key);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://… or upload"
        className="mt-1 w-full min-w-0 max-w-full rounded-lg border border-line px-3 py-2"
      />
      <input
        type="file"
        accept="image/*"
        className="mt-2 block max-w-full text-xs"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      {uploading ? <span className="mt-1 block text-xs text-muted">Compressing and uploading…</span> : null}
      {error ? <span className="mt-1 block text-xs text-sale">{error}</span> : null}
      {value ? <MediaImage src={value} alt="" className="mt-2 h-24 w-24 object-cover" /> : null}
    </label>
  );
}
