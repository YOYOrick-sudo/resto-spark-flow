import { useParams } from 'react-router-dom';

export default function ReceptenDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1>Recept</h1>
      <p className="text-muted-foreground">
        Details voor recept #{id}
      </p>
      <div className="nesto-card-base">
        <p className="text-muted-foreground">Recept niet gevonden.</p>
      </div>
    </div>
  );
}
