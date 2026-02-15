import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';

export function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
