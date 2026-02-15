import { useParams } from "react-router-dom";
import { PageHeader, EmptyState } from "@/components/polar";
import { Layers } from "lucide-react";

export default function HalffabricatenDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <PageHeader title="Halffabricaat" subtitle={`Details voor halffabricaat #${id}`} />
      <EmptyState
        icon={Layers}
        title="Halffabricaat niet gevonden"
        description="Dit halffabricaat bestaat niet of is verwijderd."
      />
    </div>
  );
}
