import { AppLayout } from '@/components/layout/AppLayout';

export default function Halffabricaten() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Halffabricaten</h1>
        <p className="text-muted-foreground">
          Beheer halffabricaten en voorbereidingen.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Geen halffabricaten gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
