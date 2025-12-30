import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsInkoop() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Inkoop Instellingen</h1>
        <p className="text-muted-foreground">
          Configureer inkoop en bestellingen.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Inkoop configuratie komt hier.</p>
        </div>
      </div>
    </AppLayout>
  );
}
