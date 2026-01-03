// ============================================
// FASE 4.1: PERMISSION HOOK
// ============================================

import { useUserContext } from '@/contexts/UserContext';

/**
 * Hook to check if user has a specific permission.
 * Reads from context - no database query.
 */
export function usePermission(permission: string): boolean {
  const { hasPermission } = useUserContext();
  return hasPermission(permission);
}

/**
 * Hook to check if user has any of the given permissions.
 * Reads from context - no database query.
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = useUserContext();
  return hasAnyPermission(permissions);
}

/**
 * Hook to check if user has all of the given permissions.
 * Reads from context - no database query.
 */
export function useAllPermissions(permissions: string[]): boolean {
  const { hasAllPermissions } = useUserContext();
  return hasAllPermissions(permissions);
}
