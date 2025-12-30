import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

export default function HalffabricatenDetail() {
  const { id } = useParams();

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Halffabricaat</h1>
        <p className="text-muted-foreground">
          Details voor halffabricaat #{id}
        </p>
        <div className="nesto-card-base">
          <p className="text-muted-foreground">Halffabricaat niet gevonden.</p>
        </div>
      </div>
    </AppLayout>
  );
}
