import { useMemo } from 'react';
import { useSignals } from '@/hooks/useSignals';

export function useSignalCount() {
  const { signals } = useSignals();

  const count = useMemo(() => {
    return signals.filter(
      (s) => s.actionable && (s.severity === 'error' || s.severity === 'warning')
    ).length;
  }, [signals]);

  return count;
}
