import {
  ChefHat,
  Carrot,
  BookOpen,
  Package,
  Thermometer,
  UtensilsCrossed,
  BarChart3,
  LayoutDashboard,
  Megaphone,
  Users,
  UserCircle,
  Calendar,
  Share2,
  Star,
  MessageSquare,
} from "lucide-react";
import type { ModuleSubNavItem } from "@/components/polar/ModuleSubNav";

/**
 * Sub-navigatie configuratie per hoofdmodule.
 * Single source of truth — wijzigingen werken door op alle pagina's binnen de module.
 */

export const KEUKEN_SUBNAV: ModuleSubNavItem[] = [
  { path: "/mep", label: "MEP", icon: ChefHat },
  { path: "/taken", label: "Taken & HACCP", icon: Thermometer },
  { path: "/recepten", label: "Halffabricaten", icon: BookOpen },
  { path: "/voorraad", label: "Ingrediënten", icon: Carrot },
  { path: "/inkoop", label: "Voorraad & Inkoop", icon: Package },
];

export const KAARTBEHEER_SUBNAV: ModuleSubNavItem[] = [
  { path: "/kaartbeheer", label: "Gerechten", icon: UtensilsCrossed },
  { path: "/kaartbeheer/menus", label: "Menu's", icon: BookOpen },
  { path: "/kaartbeheer/menu-engineering", label: "Menu Engineering", icon: BarChart3 },
];

export const MARKETING_SUBNAV: ModuleSubNavItem[] = [
  { path: "/marketing", label: "Dashboard", icon: LayoutDashboard },
  { path: "/marketing/campagnes", label: "Campagnes", icon: Megaphone },
  { path: "/marketing/segmenten", label: "Doelgroepen", icon: Users },
  { path: "/marketing/contacten", label: "Gasten", icon: UserCircle },
  { path: "/marketing/kalender", label: "Content Kalender", icon: Calendar },
  { path: "/marketing/social", label: "Social Posts", icon: Share2 },
  { path: "/marketing/reviews", label: "Reviews", icon: Star },
  { path: "/marketing/popup", label: "Website Popup", icon: MessageSquare },
];
