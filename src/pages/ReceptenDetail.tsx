import { useParams } from "react-router-dom";
import { PageHeader, EmptyState } from "@/components/polar";
import { BookOpen } from "lucide-react";

export default function ReceptenDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <PageHeader title="Recept" subtitle={`Details voor recept #${id}`} />
      <EmptyState
        icon={BookOpen}
        title="Recept niet gevonden"
        description="Dit recept bestaat niet of is verwijderd."
      />
    </div>
  );
}
