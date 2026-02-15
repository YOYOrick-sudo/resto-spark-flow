import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';

interface AppShellProps {
  fullBleed?: boolean;
}

export function AppShell({ fullBleed }: AppShellProps) {
  return (
    <AppLayout fullBleed={fullBleed}>
      <Outlet />
    </AppLayout>
  );
}
