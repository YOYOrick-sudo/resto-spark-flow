import { PageHeader, EmptyState } from "@/components/polar";
import { BookOpen } from "lucide-react";

export default function KaartbeheerMenus() {
  return (
    <div className="space-y-6">
      <PageHeader title="Menu's" subtitle="Stel menu's samen voor je restaurant." />
      <EmptyState
        icon={BookOpen}
        title="Menu's"
        description="Hier kun je binnenkort menu's samenstellen en beheren."
      />
    </div>
  );
}
