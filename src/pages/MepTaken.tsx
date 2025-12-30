import { AppLayout } from '@/components/layout/AppLayout';

export default function MepTaken() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>MEP Taken</h1>
        <p className="text-muted-foreground">
          Mise-en-place taken voor de keuken.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Geen MEP taken gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
