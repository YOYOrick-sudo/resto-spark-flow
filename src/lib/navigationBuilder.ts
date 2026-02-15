
import type { UserContext, ModuleKey } from '@/types/auth';
import { menuItems, type MenuItem, type SubMenuItem } from './navigation';

// Mapping of menu items to module keys
const MENU_MODULE_MAP: Record<string, ModuleKey> = {
  'reservations': 'reservations',
  'kitchen': 'kitchen',
  'kitchen-mep': 'kitchen',
  'kitchen-halffabricaten': 'kitchen',
  'kitchen-recipes': 'kitchen',
  'kitchen-voorraad': 'kitchen',
  'kitchen-kostprijzen': 'kitchen',
  'kitchen-orders': 'kitchen',
  'kaartbeheer': 'kitchen', // Kaartbeheer uses kitchen module
  'kaartbeheer-gerechten': 'kitchen',
  'kaartbeheer-menu-engineering': 'kitchen',
  'service': 'reservations', // Service uses reservations module
  'service-tasks': 'reservations',
  'finance': 'finance',
  'takeaway': 'marketing',
  'settings': 'settings',
  'settings-voorkeuren': 'settings',
  'settings-keuken': 'settings',
  'settings-reserveringen': 'settings',
  'settings-inkoop': 'settings',
  'settings-leveranciers': 'settings',
};

// Mapping of menu items to required permissions
const MENU_PERMISSION_MAP: Record<string, string> = {
  'reservations': 'reservations.view',
  'kitchen': 'kitchen.view',
  'kitchen-mep': 'kitchen.mep.view',
  'kitchen-halffabricaten': 'kitchen.recipes.view',
  'kitchen-recipes': 'kitchen.recipes.view',
  'kitchen-voorraad': 'kitchen.ingredients.view',
  'kitchen-kostprijzen': 'finance.costs.view',
  'kitchen-orders': 'kitchen.orders.view',
  'kaartbeheer': 'kitchen.view',
  'kaartbeheer-gerechten': 'kitchen.recipes.view',
  'service': 'reservations.view',
  'service-tasks': 'reservations.view',
  'finance': 'finance.view',
  'takeaway': 'marketing.view',
  'settings': 'settings.view',
  'settings-voorkeuren': 'settings.general.view',
  'settings-keuken': 'settings.general.view',
  'settings-reserveringen': 'reservations.settings',
};

/**
 * Check if a module is enabled in entitlements
 */
function isModuleEnabled(context: UserContext, moduleKey: ModuleKey): boolean {
  if (context.is_platform_admin) return true;
  
  const entitlement = context.entitlements.find(e => e.module === moduleKey);
  return entitlement?.enabled ?? false;
}

/**
 * Check if user has permission
 */
function hasPermission(context: UserContext, permission: string): boolean {
  if (context.is_platform_admin) return true;
  return context.permissions.includes(permission);
}

/**
 * Filter sub items based on entitlements and permissions
 */
function filterSubItems
(
  subItems: SubMenuItem[],
  context: UserContext
): SubMenuItem[] {
  return subItems.filter(item => {
    // Keep disabled items visible but disabled
    if (item.disabled) return true;
    
    // Check module entitlement
    const moduleKey = MENU_MODULE_MAP[item.id];
    if (moduleKey && !isModuleEnabled(context, moduleKey)) {
      return false;
    }
    
    // Check permission
    const permission = MENU_PERMISSION_MAP[item.id];
    if (permission && !hasPermission(context, permission)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Build navigation based on user context.
 * Filters menu items based on entitlements and permissions.
 */
export function buildNavigation(context: UserContext | null): MenuItem[] {
  // No context = show dashboard only
  if (!context) {
    return menuItems.filter(item => item.id === 'dashboard');
  }

  // Platform admin sees everything
  if (context.is_platform_admin) {
    return menuItems;
  }

  return menuItems.filter(item => {
    // Dashboard is always visible
    if (item.id === 'dashboard') return true;
    
    // Assistent is always visible (but may be disabled)
    if (item.id === 'assistent') return true;
    
    // Check module entitlement for top-level items
    const moduleKey = MENU_MODULE_MAP[item.id];
    if (moduleKey && !isModuleEnabled(context, moduleKey)) {
      return false;
    }
    
    // Check permission for items with required permission
    const permission = MENU_PERMISSION_MAP[item.id];
    if (permission && !hasPermission(context, permission)) {
      return false;
    }
    
    // For expandable items, filter sub items
    if (item.expandable && item.subItems) {
      const filteredSubItems = filterSubItems(item.subItems, context);
      
      // Hide parent if no sub items are accessible
      if (filteredSubItems.length === 0) {
        return false;
      }
    }
    
    return true;
  }).map(item => {
    // Update sub items for expandable items
    if (item.expandable && item.subItems) {
      return {
        ...item,
        subItems: filterSubItems(item.subItems, context),
      };
    }
    return item;
  });
}

/**
 * Get the first accessible route for a user
 */
export function getDefaultRoute(context: UserContext | null): string {
  if (!context) return '/';
  
  // Platform admin goes to dashboard
  if (context.is_platform_admin) return '/';
  
  // Check what modules are enabled and find first accessible route
  if (isModuleEnabled(context, 'reservations') && hasPermission(context, 'reservations.view')) {
    return '/reserveringen';
  }
  
  if (isModuleEnabled(context, 'kitchen') && hasPermission(context, 'kitchen.view')) {
    return '/mep';
  }
  
  // Default to dashboard
  return '/';
}
