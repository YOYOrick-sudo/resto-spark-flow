import { useParams } from 'react-router-dom';

export default function HalffabricatenDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1>Halffabricaat</h1>
      <p className="text-muted-foreground">
        Details voor halffabricaat #{id}
      </p>
      <div className="nesto-card-base">
        <p className="text-muted-foreground">Halffabricaat niet gevonden.</p>
      </div>
    </div>
  );
}
