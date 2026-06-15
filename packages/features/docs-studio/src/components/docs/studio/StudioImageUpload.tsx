"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { docsPaths } from "#/paths";

interface StudioImageUploadProps {
  slug: string;
  onUploaded: (url: string) => void;
  label?: string;
}

export default function StudioImageUpload({ slug, onUploaded, label = "Upload image" }: StudioImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(docsPaths.api.upload(slug), { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="studio-image-upload" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className="studio-image-upload-btn"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={12} />
        {uploading ? "Uploading…" : label}
      </button>
      {error && <p className="studio-image-upload-error">{error}</p>}
    </div>
  );
}
