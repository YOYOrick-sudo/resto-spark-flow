import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsLeveranciers() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Leveranciers</h1>
        <p className="text-muted-foreground">
          Beheer leverancier integraties en koppelingen.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Leveranciers configuratie komt hier.</p>
        </div>
      </div>
    </AppLayout>
  );
}
