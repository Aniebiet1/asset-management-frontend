import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { AssetImage } from "@/components/common/AssetImage";
import { ApiError } from "@/lib/http-error";
import { compressImage } from "@/lib/compressImage";
import { useUploadFileMutation } from "@/features/assets/api";
import type { Asset } from "@/types";

/** Mirrors the backend's MAX_ASSET_IMAGES (assets.schema.ts). */
export const MAX_ASSET_IMAGES = 10;

/** An asset's photos in display order. Assets saved before multi-photo support only carry imageUrl. */
export function assetImages(asset: Pick<Asset, "images" | "imageUrl"> | null | undefined): string[] {
  if (!asset) return [];
  if (asset.images?.length) return asset.images;
  return asset.imageUrl ? [asset.imageUrl] : [];
}

export interface AssetPhotos {
  images: string[];
  cover: string | null;
}

/** The cover has to be one of the photos; otherwise the first photo is it (same rule as the backend). */
export function coverOf({ images, cover }: AssetPhotos): string | null {
  return cover && images.includes(cover) ? cover : (images[0] ?? null);
}

interface AssetPhotosFieldProps {
  value: AssetPhotos;
  onChange: Dispatch<SetStateAction<AssetPhotos>>;
}

// Tile controls stay visible on touch screens (no hover to reveal them) and appear on hover or
// keyboard focus everywhere else.
const revealOnHover = "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";

/**
 * Upload several photos for an asset and pick which one is the cover (the picture used in lists,
 * labels and the asset header). The first photo is the cover until someone picks another.
 */
export function AssetPhotosField({ value, onChange }: AssetPhotosFieldProps) {
  const uploadFile = useUploadFileMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);

  const { images } = value;
  const cover = coverOf(value);
  const remaining = MAX_ASSET_IMAGES - images.length - uploading;
  const canAdd = remaining > 0;

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    const accepted = files.slice(0, Math.max(0, remaining));
    if (accepted.length < files.length) {
      toast.error(`An asset can have up to ${MAX_ASSET_IMAGES} photos. ${files.length - accepted.length} not added.`);
    }
    if (!accepted.length) return;

    setUploading((n) => n + accepted.length);
    // One after another so the photos keep the order they were picked in.
    let failed = 0;
    for (const file of accepted) {
      try {
        const uploaded = await uploadFile.mutateAsync(await compressImage(file));
        onChange((prev) => ({ ...prev, images: [...prev.images, uploaded.url] }));
      } catch (err) {
        failed += 1;
        if (failed === 1) toast.error(err instanceof ApiError ? err.message : "Couldn't upload that photo.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    const added = accepted.length - failed;
    if (added > 0) toast.success(added === 1 ? "Photo uploaded" : `${added} photos uploaded`);
  }

  function handleRemove(url: string) {
    // Removing the cover leaves `cover` pointing at a photo that's gone, so coverOf falls back to
    // the new first photo.
    onChange((prev) => ({ ...prev, images: prev.images.filter((u) => u !== url) }));
  }

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!canAdd) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (canAdd) void addFiles(e.dataTransfer.files);
    },
  };

  const isEmpty = images.length === 0 && uploading === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Photos</p>
          <p className="text-xs text-muted-foreground">
            The cover photo is used in lists, on labels and on the asset page. The first photo is the cover unless you choose another.
          </p>
        </div>
        {!isEmpty && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {images.length} of {MAX_ASSET_IMAGES}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = "";
          void addFiles(files);
        }}
      />

      {isEmpty ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          {...dropHandlers}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            dragging && "border-primary bg-primary/5"
          )}
        >
          <ImagePlus className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Add photos</span>
          <span className="text-xs text-muted-foreground">Click or drop images here. JPG or PNG, up to {MAX_ASSET_IMAGES} photos.</span>
        </button>
      ) : (
        <ul
          {...dropHandlers}
          className={cn(
            "grid grid-cols-3 gap-2 rounded-lg sm:grid-cols-4 lg:grid-cols-5",
            dragging && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
        >
          {images.map((url, i) => {
            const isCover = url === cover;
            return (
              <li
                key={url}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg bg-muted",
                  isCover ? "ring-2 ring-primary" : "ring-1 ring-border"
                )}
              >
                <AssetImage src={url} alt={`Photo ${i + 1}`} iconClassName="size-5" />
                {isCover ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, cover: url }))}
                    className={cn(
                      "absolute bottom-1.5 left-1.5 rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm ring-1 ring-border transition-opacity hover:bg-background",
                      revealOnHover
                    )}
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  title="Remove photo"
                  onClick={() => handleRemove(url)}
                  className={cn(
                    "absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border transition-opacity hover:text-destructive",
                    revealOnHover
                  )}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}

          {Array.from({ length: uploading }, (_, i) => (
            <li key={`uploading-${i}`} className="flex aspect-square items-center justify-center rounded-lg bg-muted ring-1 ring-border">
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Uploading" />
            </li>
          ))}

          {canAdd && (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ImagePlus className="size-4" />
                Add photo
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
