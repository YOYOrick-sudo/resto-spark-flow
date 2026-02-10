import { Outlet, useLocation } from 'react-router-dom';
import { AppLayout } from './AppLayout';

export function AppShell() {
  const location = useLocation();

  return (
    <AppLayout>
      <div key={location.pathname} className="animate-fade-in-fast">
        <Outlet />
      </div>
    </AppLayout>
  );
}
