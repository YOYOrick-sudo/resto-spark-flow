export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      <p className="text-muted-foreground">
        Welkom bij Nesto. Hier vind je een overzicht van je restaurant activiteiten.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="nesto-card-base">
          <h3 className="mb-2">Reserveringen vandaag</h3>
          <p className="text-3xl font-bold text-primary">0</p>
        </div>
        <div className="nesto-card-base">
          <h3 className="mb-2">Open taken</h3>
          <p className="text-3xl font-bold text-primary">0</p>
        </div>
        <div className="nesto-card-base">
          <h3 className="mb-2">Actieve recepten</h3>
          <p className="text-3xl font-bold text-primary">0</p>
        </div>
      </div>
    </div>
  );
}
