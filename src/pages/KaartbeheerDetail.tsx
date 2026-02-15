import { useParams } from "react-router-dom";
import { PageHeader, EmptyState } from "@/components/polar";
import { UtensilsCrossed } from "lucide-react";

export default function KaartbeheerDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <PageHeader title="Gerecht" subtitle={`Details voor gerecht #${id}`} />
      <EmptyState
        icon={UtensilsCrossed}
        title="Gerecht niet gevonden"
        description="Dit gerecht bestaat niet of is verwijderd."
      />
    </div>
  );
}
