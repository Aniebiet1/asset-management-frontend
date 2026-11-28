import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetImage, useAssetImageSrc } from "@/components/common/AssetImage";
import { ApiError } from "@/lib/http-error";
import { useUpdateAssetMutation } from "@/features/assets/api";
import { assetImages } from "@/features/assets/components/AssetPhotosField";
import type { Asset } from "@/types";

const overlayButton =
  "flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition-opacity hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * The asset page's photo card: one photo at a time, with a strip of thumbnails when there is more
 * than one. Someone who can edit the asset can make the photo they're looking at the cover.
 */
export function AssetGallery({ asset, canEdit }: { asset: Asset; canEdit: boolean }) {
  const images = assetImages(asset);
  const cover = asset.imageUrl && images.includes(asset.imageUrl) ? asset.imageUrl : (images[0] ?? null);
  const [selected, setSelected] = useState<string | null>(cover);
  const updateAsset = useUpdateAssetMutation(asset.id);

  // Follow the cover when the asset changes, and don't keep pointing at a photo that's been removed.
  useEffect(() => {
    setSelected((prev) => (prev && images.includes(prev) ? prev : cover));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, cover, images.join("|")]);

  const shown = selected && images.includes(selected) ? selected : cover;
  const fullSizeSrc = useAssetImageSrc(shown);
  if (!shown) return null;

  const index = images.indexOf(shown);
  const many = images.length > 1;
  const step = (delta: number) => setSelected(images[(index + delta + images.length) % images.length]);

  async function handleMakeCover() {
    try {
      await updateAsset.mutateAsync({ images, imageUrl: shown });
      toast.success("Cover photo updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't change the cover photo.");
    }
  }

  return (
    <Card className="h-fit gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div
          className="group relative aspect-[4/3] bg-muted"
          tabIndex={many ? 0 : undefined}
          aria-label={many ? "Photos. Use the arrow keys to move between them." : undefined}
          onKeyDown={(e) => {
            if (!many) return;
            if (e.key === "ArrowLeft") step(-1);
            if (e.key === "ArrowRight") step(1);
          }}
        >
          <AssetImage src={shown} alt={`${asset.name}, photo ${index + 1}`} iconClassName="size-8" loading="eager" />

          {shown === cover && many && (
            <span className="absolute top-2 left-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">Cover</span>
          )}
          {fullSizeSrc && (
            <a href={fullSizeSrc} target="_blank" rel="noreferrer" title="Open full size" aria-label="Open full size" className={cn(overlayButton, "absolute top-2 right-2")}>
              <Expand className="size-3.5" />
            </a>
          )}
          {many && (
            <>
              <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className={cn(overlayButton, "absolute top-1/2 left-2 -translate-y-1/2")}>
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" aria-label="Next photo" onClick={() => step(1)} className={cn(overlayButton, "absolute top-1/2 right-2 -translate-y-1/2")}>
                <ChevronRight className="size-4" />
              </button>
              <span className="absolute right-2 bottom-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground ring-1 ring-border">
                {index + 1} / {images.length}
              </span>
            </>
          )}
        </div>

        {many && (
          <div className="space-y-3 p-3">
            <ul className="flex gap-2 overflow-x-auto pb-0.5">
              {images.map((url, i) => (
                <li key={url} className="shrink-0">
                  <button
                    type="button"
                    aria-label={`Show photo ${i + 1}`}
                    aria-pressed={url === shown}
                    onClick={() => setSelected(url)}
                    className={cn(
                      "block size-12 overflow-hidden rounded-md bg-muted transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      url === shown ? "ring-2 ring-primary" : "opacity-60 ring-1 ring-border hover:opacity-100"
                    )}
                  >
                    <AssetImage src={url} alt="" iconClassName="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            {canEdit && shown !== cover && (
              <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={handleMakeCover} disabled={updateAsset.isPending}>
                {updateAsset.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Make this the cover photo
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
