import { AppLayout } from '@/components/layout/AppLayout';

export default function Reserveringen() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Reserveringen</h1>
        <p className="text-muted-foreground">
          Beheer alle reserveringen voor je restaurant.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Geen reserveringen gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
