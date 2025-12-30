import { AppLayout } from '@/components/layout/AppLayout';

export default function Kostprijzen() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Kostprijzen</h1>
        <p className="text-muted-foreground">
          Overzicht van kostprijzen en marges.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Geen kostprijzen gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
