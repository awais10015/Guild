"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UPLOAD_MAX_BYTES } from "@/lib/constants";

export interface UploadedImage {
  url: string;
  publicId?: string | null;
}

interface Props {
  kind: string;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
  label?: string;
  className?: string;
  aspect?: "square" | "video";
  /* "grid": photo tiles + button (forms); "button": single trigger only (chat composer) */
  mode?: "grid" | "button";
  /** Local blob preview while a file is uploading (e.g. chat composer). */
  onUploadingChange?: (state: { uploading: boolean; previewUrl: string | null }) => void;
}

interface SignResponse {
  ok: boolean;
  error?: string;
  data: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    uploadUrl: string;
  };
}

async function uploadFile(file: File, kind: string): Promise<UploadedImage> {
  const res = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  const json = (await res.json()) as SignResponse;
  if (!json.ok) throw new Error(json.error ?? "Upload permission failed");
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", json.data.apiKey);
  form.append("timestamp", String(json.data.timestamp));
  form.append("signature", json.data.signature);
  form.append("folder", json.data.folder);
  const up = await fetch(json.data.uploadUrl, { method: "POST", body: form });
  if (!up.ok) throw new Error("Cloudinary rejected the image — try a different file.");
  const data = (await up.json()) as { secure_url: string; public_id: string };
  return { url: data.secure_url, publicId: data.public_id };
}

export function ImageUploader({
  kind,
  images,
  onChange,
  max = 8,
  label = "Add photos",
  className,
  aspect = "video",
  mode = "grid",
  onUploadingChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  function clearPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    onUploadingChange?.({ uploading: false, previewUrl: null });
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - images.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (list.length === 0) {
      toast.warning(`You can attach up to ${max} images.`);
      return;
    }
    setBusy(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          toast.warning(`${file.name} is not an image and was skipped.`);
          continue;
        }
        if (file.size > UPLOAD_MAX_BYTES) {
          throw new Error(`${file.name} is too large (max ${Math.round(UPLOAD_MAX_BYTES / 1_000_000)} MB).`);
        }
        clearPreview();
        const localPreview = URL.createObjectURL(file);
        previewUrlRef.current = localPreview;
        onUploadingChange?.({ uploading: true, previewUrl: localPreview });
        try {
          uploaded.push(await uploadFile(file, kind));
        } finally {
          clearPreview();
        }
      }
      if (uploaded.length > 0) {
        onChange([...images, ...uploaded]);
        toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} added.`);
      }
    } catch (err) {
      clearPreview();
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      {mode === "grid" && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={`${img.url.slice(0, 40)}-${i}`}
              className={cn(
                "group relative overflow-hidden rounded-lg border bg-muted",
                aspect === "square" ? "aspect-square" : "aspect-video",
              )}
            >
              <Image src={img.url} alt={`Upload ${i + 1}`} fill sizes="200px" className="object-cover" />
              <button
                type="button"
                aria-label={`Remove image ${i + 1}`}
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < max && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-muted-foreground transition hover:border-primary/50 hover:text-primary",
                aspect === "square" ? "aspect-square" : "aspect-video",
              )}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
              <span className="px-1 text-center text-[11px] leading-tight">{busy ? "Uploading…" : label}</span>
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {(mode === "grid" || images.length < max) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(mode === "grid" && "mt-3")}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {label}
        </Button>
      )}
    </div>
  );
}
