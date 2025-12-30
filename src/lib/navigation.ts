import { ReactNode } from 'react';
import {
  Home,
  Bot,
  Calendar,
  ChefHat,
  UtensilsCrossed,
  ShoppingBag,
  ClipboardList,
  Banknote,
  Settings,
} from 'lucide-react';

// Route mapping: sidebar ID → route
export const ROUTE_MAP: Record<string, string> = {
  'dashboard': '/',
  'reservations': '/reserveringen',
  'kitchen-mep': '/mep',
  'kitchen-halffabricaten': '/halffabricaten',
  'kitchen-recipes': '/recepten',
  'kitchen-voorraad': '/voorraad',
  'kitchen-kostprijzen': '/kostprijzen',
  'kitchen-orders': '/inkoop',
  'kaartbeheer-gerechten': '/kaartbeheer',
  'service-tasks': '/taken',
  'settings-voorkeuren': '/instellingen/voorkeuren',
  'settings-keuken': '/instellingen/keuken',
  'settings-inkoop': '/instellingen/inkoop',
  'settings-leveranciers': '/instellingen/leveranciers',
};

export interface SubMenuItem {
  id: string;
  label: string;
  path?: string;
  disabled?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: typeof Home;
  path?: string;
  disabled?: boolean;
  expandable?: boolean;
  subItems?: SubMenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/',
  },
  {
    id: 'assistent',
    label: 'Assistent',
    icon: Bot,
    disabled: true,
  },
  {
    id: 'reservations',
    label: 'Reserveringen',
    icon: Calendar,
    path: '/reserveringen',
  },
  {
    id: 'kitchen',
    label: 'Keuken',
    icon: ChefHat,
    expandable: true,
    subItems: [
      { id: 'kitchen-mep', label: 'MEP Taken', path: '/mep' },
      { id: 'kitchen-halffabricaten', label: 'Halffabricaten', path: '/halffabricaten' },
      { id: 'kitchen-recipes', label: 'Recepten', path: '/recepten' },
      { id: 'kitchen-voorraad', label: 'Ingrediënten', path: '/voorraad' },
      { id: 'kitchen-inventory', label: 'Voorraad', disabled: true },
      { id: 'kitchen-kostprijzen', label: 'Kostprijzen', path: '/kostprijzen' },
      { id: 'kitchen-orders', label: 'Interne Bestellingen', path: '/inkoop' },
    ],
  },
  {
    id: 'kaartbeheer',
    label: 'Kaartbeheer',
    icon: UtensilsCrossed,
    expandable: true,
    subItems: [
      { id: 'kaartbeheer-gerechten', label: 'Gerechten', path: '/kaartbeheer' },
      { id: 'kaartbeheer-menu-engineering', label: 'Menu-engineering', disabled: true },
    ],
  },
  {
    id: 'takeaway',
    label: 'Takeaway',
    icon: ShoppingBag,
    disabled: true,
  },
  {
    id: 'service',
    label: 'Service',
    icon: ClipboardList,
    expandable: true,
    subItems: [
      { id: 'service-tasks', label: 'Taken & Checklists', path: '/taken' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Banknote,
    disabled: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    expandable: true,
    subItems: [
      { id: 'settings-voorkeuren', label: 'Voorkeuren', path: '/instellingen/voorkeuren' },
      { id: 'settings-keuken', label: 'Keuken', path: '/instellingen/keuken' },
      { id: 'settings-reserveringen', label: 'Reserveringen', disabled: true },
      { id: 'settings-recepten', label: 'Recepten', disabled: true },
      { id: 'settings-labels', label: 'Labels & Printen', disabled: true },
      { id: 'settings-finance', label: 'Finance', disabled: true },
      { id: 'settings-hrm', label: 'HRM', disabled: true },
    ],
  },
];

export const getRouteForSidebarId = (id: string): string => ROUTE_MAP[id] || '/';

export const getActiveItemFromPath = (path: string): string | null => {
  // Check exact matches first
  for (const [id, route] of Object.entries(ROUTE_MAP)) {
    if (path === route) {
      return id;
    }
  }
  // Check prefix matches (for detail routes like /recepten/123)
  for (const [id, route] of Object.entries(ROUTE_MAP)) {
    if (route !== '/' && path.startsWith(route + '/')) {
      return id;
    }
  }
  return path === '/' ? 'dashboard' : null;
};

export const getExpandedGroupFromPath = (path: string): string | null => {
  if (
    path.startsWith('/halffabricaten') ||
    path.startsWith('/recepten') ||
    path.startsWith('/voorraad') ||
    path.startsWith('/kostprijzen') ||
    path.startsWith('/mep') ||
    path.startsWith('/inkoop')
  ) {
    return 'kitchen';
  }
  if (path.startsWith('/kaartbeheer')) return 'kaartbeheer';
  if (path.startsWith('/taken')) return 'service';
  if (path.startsWith('/instellingen')) return 'settings';
  return null;
};
