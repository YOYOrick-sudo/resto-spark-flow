import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsKeuken() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Keuken Instellingen</h1>
        <p className="text-muted-foreground">
          Configureer keuken specifieke instellingen.
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Keuken configuratie komt hier.</p>
        </div>
      </div>
    </AppLayout>
  );
}
