import { AppLayout } from '@/components/layout/AppLayout';

export default function Inkoop() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Inkoop</h1>
        <p className="text-muted-foreground">
          Beheer interne bestellingen en inkoop.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Geen bestellingen gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
