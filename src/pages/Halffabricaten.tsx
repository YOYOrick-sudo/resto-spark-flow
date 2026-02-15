import { PageHeader, EmptyState } from "@/components/polar";
import { Layers } from "lucide-react";

export default function Halffabricaten() {
  return (
    <div className="space-y-6">
      <PageHeader title="Halffabricaten" subtitle="Beheer halffabricaten en voorbereidingen." />
      <EmptyState
        icon={Layers}
        title="Nog geen halffabricaten toegevoegd"
        description="Voeg je eerste halffabricaat toe om te beginnen."
      />
    </div>
  );
}
