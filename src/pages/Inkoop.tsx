import { PageHeader, EmptyState } from "@/components/polar";
import { ShoppingCart } from "lucide-react";

export default function Inkoop() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inkoop" subtitle="Beheer interne bestellingen en inkoop." />
      <EmptyState
        icon={ShoppingCart}
        title="Nog geen bestellingen gevonden"
        description="Bestellingen verschijnen hier zodra je ze aanmaakt."
      />
    </div>
  );
}
