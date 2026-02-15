import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { NestoErrorBoundary } from '@/components/polar/NestoErrorBoundary';

export function AppShell() {
  return (
    <AppLayout>
      <NestoErrorBoundary>
        <Outlet />
      </NestoErrorBoundary>
    </AppLayout>
  );
}
