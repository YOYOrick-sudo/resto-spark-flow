import { AppLayout } from '@/components/layout/AppLayout';

export default function Kaartbeheer() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Kaartbeheer</h1>
        <p className="text-muted-foreground">
          Beheer alle gerechten op je menukaart.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Geen gerechten gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
