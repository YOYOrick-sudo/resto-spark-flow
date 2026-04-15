import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LabelPreviewProps {
  zpl: string;
  widthMm: number;
  heightMm: number;
}

export function LabelPreview({ zpl, widthMm, heightMm }: LabelPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Convert mm to inches for Labelary (25.4 mm/inch)
  const widthInches = (widthMm / 25.4).toFixed(2);
  const heightInches = (heightMm / 25.4).toFixed(2);

  useEffect(() => {
    if (!zpl) { setImageUrl(null); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(
          `https://api.labelary.com/v1/printers/8dpmm/labels/${widthInches}x${heightInches}/0/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: zpl,
          }
        );
        if (!response.ok) throw new Error("Labelary error");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      } catch {
        setError(true);
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [zpl, widthInches, heightInches]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, []);

  if (loading) {
    return <Skeleton className="w-full aspect-[3/2] rounded-lg" />;
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full aspect-[3/2] rounded-lg bg-muted/30 border border-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground">
          {error ? "Preview niet beschikbaar" : "Geen label data"}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border overflow-hidden bg-white">
      <img
        src={imageUrl}
        alt="Label preview"
        className="w-full h-auto"
      />
    </div>
  );
}
