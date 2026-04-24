import { ReactNode } from 'react';
import {
  Home,
  Calendar,
  ChefHat,
  UtensilsCrossed,
  ShoppingBag,
  ClipboardList,
  Banknote,
  Settings,
  UserPlus,
  Megaphone,
  BarChart3,
} from 'lucide-react';
import { AssistentIcon } from '@/components/icons/AssistentIcon';

// Route mapping: sidebar ID → route
export const ROUTE_MAP: Record<string, string> = {
  'dashboard': '/',
  'assistent': '/assistent',
  'reservations': '/reserveringen',
  'kitchen-mep': '/mep',
  'kitchen-recipes': '/recepten',
  'kitchen-voorraad': '/voorraad',
  'kitchen-orders': '/inkoop',
  'kitchen-leveringen': '/leveringen',
  'kitchen-transfers': '/interne-bestellingen',
  'kitchen-taken': '/taken',
  'kaartbeheer-gerechten': '/kaartbeheer',
  'kaartbeheer-menus': '/kaartbeheer/menus',
  'kaartbeheer-menu-engineering': '/kaartbeheer/menu-engineering',
  'marketing-dashboard': '/marketing',
  'marketing-campagnes': '/marketing/campagnes',
  'marketing-segmenten': '/marketing/segmenten',
  'marketing-contacten': '/marketing/contacten',
  'marketing-kalender': '/marketing/kalender',
  'marketing-social': '/marketing/social',
  'marketing-reviews': '/marketing/reviews',
  'marketing-popup': '/marketing/popup',
  'analytics': '/analytics',
  'settings-algemeen': '/instellingen/algemeen',
  'settings-voorkeuren': '/instellingen/voorkeuren',
  'settings-keuken': '/instellingen/keuken',
  'settings-reserveringen': '/instellingen/reserveringen',
  'settings-assistent': '/instellingen/assistent',
  'settings-communicatie': '/instellingen/communicatie',
  'settings-marketing': '/instellingen/marketing',
  'settings-onboarding': '/instellingen/onboarding',
  'onboarding': '/onboarding',
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
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  path?: string;
  disabled?: boolean;
  expandable?: boolean;
  subItems?: SubMenuItem[];
  section?: string;
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
    icon: AssistentIcon,
    path: '/assistent',
  },
  {
    id: 'reservations',
    label: 'Reserveringen',
    icon: Calendar,
    path: '/reserveringen',
    section: 'OPERATIE',
  },
  {
    id: 'kitchen',
    label: 'Keuken',
    icon: ChefHat,
    expandable: true,
    section: 'OPERATIE',
    subItems: [
      { id: 'kitchen-mep', label: 'MEP Taken', path: '/mep' },
      { id: 'kitchen-taken', label: 'Taken & HACCP', path: '/taken' },
      { id: 'kitchen-leveringen', label: 'Leveringen', path: '/leveringen' },
      { id: 'kitchen-recipes', label: 'Halffabricaten', path: '/recepten' },
      { id: 'kitchen-voorraad', label: 'Ingrediënten', path: '/voorraad' },
      { id: 'kitchen-orders', label: 'Voorraad & Inkoop', path: '/inkoop' },
      { id: 'kitchen-transfers', label: 'Interne Bestellingen', path: '/interne-bestellingen' },
    ],
  },
  {
    id: 'kaartbeheer',
    label: 'Kaartbeheer',
    icon: UtensilsCrossed,
    expandable: true,
    section: 'OPERATIE',
    subItems: [
      { id: 'kaartbeheer-gerechten', label: 'Gerechten', path: '/kaartbeheer' },
      { id: 'kaartbeheer-menus', label: "Menu's", path: '/kaartbeheer/menus' },
      { id: 'kaartbeheer-menu-engineering', label: 'Menu Engineering', path: '/kaartbeheer/menu-engineering' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    expandable: true,
    section: 'OPERATIE',
    subItems: [
      { id: 'marketing-dashboard', label: 'Dashboard', path: '/marketing' },
      { id: 'marketing-campagnes', label: 'Campagnes', path: '/marketing/campagnes' },
      { id: 'marketing-segmenten', label: 'Doelgroepen', path: '/marketing/segmenten' },
      { id: 'marketing-contacten', label: 'Gasten', path: '/marketing/contacten' },
      { id: 'marketing-kalender', label: 'Content Kalender', path: '/marketing/kalender' },
      { id: 'marketing-social', label: 'Social Posts', path: '/marketing/social' },
      { id: 'marketing-reviews', label: 'Reviews', path: '/marketing/reviews' },
      { id: 'marketing-popup', label: 'Website Popup', path: '/marketing/popup' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
    section: 'OPERATIE',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    icon: UserPlus,
    path: '/onboarding',
    section: 'BEHEER',
  },
  {
    id: 'settings',
    label: 'Instellingen',
    icon: Settings,
    expandable: true,
    section: 'BEHEER',
    subItems: [
      { id: 'settings-algemeen', label: 'Algemeen', path: '/instellingen/algemeen' },
      { id: 'settings-voorkeuren', label: 'Voorkeuren', path: '/instellingen/voorkeuren' },
      { id: 'settings-keuken', label: 'Keuken', path: '/instellingen/keuken' },
      { id: 'settings-reserveringen', label: 'Reserveringen', path: '/instellingen/reserveringen' },
      { id: 'settings-assistent', label: 'Assistent', path: '/instellingen/assistent' },
      { id: 'settings-communicatie', label: 'Communicatie', path: '/instellingen/communicatie' },
      { id: 'settings-marketing', label: 'Marketing', path: '/instellingen/marketing' },
      { id: 'settings-onboarding', label: 'Onboarding', path: '/instellingen/onboarding' },
    ],
  },
];

export const getRouteForSidebarId = (id: string): string => ROUTE_MAP[id] || '/';

export const getActiveItemFromPath = (path: string): string | null => {
  for (const [id, route] of Object.entries(ROUTE_MAP)) {
    if (path === route) return id;
  }
  for (const [id, route] of Object.entries(ROUTE_MAP)) {
    if (route !== '/' && path.startsWith(route + '/')) return id;
  }
  return path === '/' ? 'dashboard' : null;
};

export const getExpandedGroupFromPath = (path: string): string | null => {
  if (
    path.startsWith('/recepten') ||
    path.startsWith('/voorraad') ||
    path.startsWith('/mep') ||
    path.startsWith('/inkoop') ||
    path.startsWith('/interne-bestellingen') ||
    path.startsWith('/leveringen') ||
    path.startsWith('/taken')
  ) {
    return 'kitchen';
  }
  if (path.startsWith('/kaartbeheer')) return 'kaartbeheer';
  if (path.startsWith('/marketing')) return 'marketing';
  if (path.startsWith('/instellingen')) return 'settings';
  if (path.startsWith('/onboarding')) return null;
  return null;
};
