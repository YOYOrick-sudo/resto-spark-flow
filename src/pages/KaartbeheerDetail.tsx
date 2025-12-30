import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

export default function KaartbeheerDetail() {
  const { id } = useParams();

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Gerecht</h1>
        <p className="text-muted-foreground">
          Details voor gerecht #{id}
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Gerecht niet gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
