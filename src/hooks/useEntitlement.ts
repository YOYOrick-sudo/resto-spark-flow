// ============================================
// FASE 4.1: ENTITLEMENT HOOK
// ============================================

import { useUserContext } from '@/contexts/UserContext';
import type { ModuleKey } from '@/types/auth';

/**
 * Hook to check if a module is enabled for the current location.
 * Reads from context - no database query.
 */
export function useEntitlement(module: ModuleKey): boolean {
  const { hasModule } = useUserContext();
  return hasModule(module);
}

/**
 * Hook to get all enabled modules for the current location.
 * Reads from context - no database query.
 */
export function useEnabledModules(): ModuleKey[] {
  const { context } = useUserContext();
  
  if (!context) return [];
  
  return context.entitlements
    .filter(e => e.enabled)
    .map(e => e.module);
}
