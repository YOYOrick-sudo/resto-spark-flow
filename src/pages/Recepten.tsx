import { PageHeader, EmptyState } from "@/components/polar";
import { BookOpen } from "lucide-react";

export default function Recepten() {
  return (
    <div className="space-y-6">
      <PageHeader title="Recepten" subtitle="Beheer alle recepten voor je restaurant." />
      <EmptyState
        icon={BookOpen}
        title="Nog geen recepten toegevoegd"
        description="Voeg je eerste recept toe om te beginnen."
      />
    </div>
  );
}
