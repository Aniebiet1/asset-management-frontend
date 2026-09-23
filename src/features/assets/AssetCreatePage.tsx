import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { AssetForm } from "@/features/assets/components/AssetForm";

export function AssetCreatePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-3 gap-1.5 text-xs" asChild>
        <Link to="/assets">
          <ArrowLeft className="size-3.5" />
          Back to Assets
        </Link>
      </Button>
      <PageHeader title="New Asset" description="Register a new asset with its asset type, location and purchase details." />
      <AssetForm />
    </div>
  );
}
