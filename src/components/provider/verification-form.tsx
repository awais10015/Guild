"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader, type UploadedImage } from "@/components/shared/image-uploader";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "id_document", label: "Government-issued ID" },
  { value: "license", label: "Trade license" },
  { value: "certificate", label: "Skill certificate" },
  { value: "business_proof", label: "Business registration" },
];

export function VerificationForm() {
  const router = useRouter();
  const [type, setType] = useState("id_document");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (images.length === 0) {
      toast.error("Upload at least one document image.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documents: images.map((img, i) => ({
            type,
            label: `${DOC_TYPES.find((d) => d.value === type)?.label ?? "Document"} ${i + 1}`,
            url: img.url,
            publicId: img.publicId ?? null,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success("Submitted for review!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" /> Submit documents
        </CardTitle>
        <CardDescription>
          Upload your government ID and at least one proof of your trade. Documents are visible only to you and review admins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs">
          <Label>Document type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ImageUploader kind="verification" images={images} onChange={setImages} max={6} label="Add document photo" />
        <Button onClick={submit} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit for review
        </Button>
      </CardContent>
    </Card>
  );
}
