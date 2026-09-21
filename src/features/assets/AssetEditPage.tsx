import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetForm } from "@/features/assets/components/AssetForm";
import { useAssetQuery } from "@/features/assets/api";

export function AssetEditPage() {
  const { id } = useParams();
  const { data: asset, isLoading, isError } = useAssetQuery(id);

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-3 gap-1.5 text-xs" asChild>
        <Link to={id ? `/assets/${id}` : "/assets"}>
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
      </Button>
      <PageHeader title="Edit Asset" description="Update this asset's details." />
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError || !asset ? (
        <p className="text-sm text-muted-foreground">Asset not found.</p>
      ) : (
        <AssetForm asset={asset} />
      )}
    </div>
  );
}
