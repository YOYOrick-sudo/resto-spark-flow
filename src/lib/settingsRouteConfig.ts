import {
  Gauge,
  LayoutGrid,
  Clock,
  Bell,
  Building2,
  MapPin,
  Link2,
  Ticket,
  Shield,
  type LucideIcon,
} from "lucide-react";

// ============================================
// Settings Route Configuration Types
// ============================================

export interface SettingsSubsection {
  id: string;
  label: string;
  path: string;
  description?: string;
  icon?: LucideIcon;
}

export interface SettingsSection {
  id: string;
  label: string;
  path: string;
  description?: string;
  icon?: LucideIcon;
  /** If defined, this section has subsections and will render a Niveau 3 page */
  subsections?: SettingsSubsection[];
}

export interface SettingsModuleConfig {
  id: string;
  label: string;
  basePath: string;
  description?: string;
  icon?: LucideIcon;
  sections: SettingsSection[];
}

// ============================================
// Reserveringen Module Config
// ============================================

export const reserveringenConfig: SettingsModuleConfig = {
  id: "reserveringen",
  label: "Reserveringen",
  basePath: "/instellingen/reserveringen",
  description: "Pacing, tafels, shifts en notificaties",
  sections: [
    {
      id: "pacing",
      label: "Pacing",
      path: "/instellingen/reserveringen/pacing",
      description: "Beheer gasten per kwartier",
      icon: Gauge,
    },
    {
      id: "tafels",
      label: "Tafelbeheer",
      path: "/instellingen/reserveringen/tafels",
      description: "Areas, tafels en combinaties",
      icon: LayoutGrid,
      subsections: [
        {
          id: "locatie",
          label: "Locatie-instellingen",
          path: "/instellingen/reserveringen/tafels/locatie",
          description: "Multi-table booking, auto-assign en meer",
          icon: Building2,
        },
        {
          id: "areas",
          label: "Areas",
          path: "/instellingen/reserveringen/tafels/areas",
          description: "Ruimtes en tafels beheren",
          icon: MapPin,
        },
        {
          id: "tafelgroepen",
          label: "Tafelcombinaties",
          path: "/instellingen/reserveringen/tafels/tafelgroepen",
          description: "Tafels groeperen voor grote gezelschappen",
          icon: Link2,
        },
      ],
    },
    {
      id: "tickets",
      label: "Tickets",
      path: "/instellingen/reserveringen/tickets",
      description: "Reserveringsproducten beheren",
      icon: Ticket,
    },
    {
      id: "beleid",
      label: "Beleid",
      path: "/instellingen/reserveringen/beleid",
      description: "Betalings- en annuleringsbeleid",
      icon: Shield,
    },
    {
      id: "shifts",
      label: "Shifts",
      path: "/instellingen/reserveringen/shifts",
      description: "Beheer shifts en tijdvensters",
      icon: Clock,
    },
    {
      id: "notificaties",
      label: "Notificaties",
      path: "/instellingen/reserveringen/notificaties",
      description: "E-mail en SMS instellingen",
      icon: Bell,
    },
  ],
};

// ============================================
// All Module Configs
// ============================================

export const settingsModules: SettingsModuleConfig[] = [
  reserveringenConfig,
  // TODO: Add more modules as they are migrated
  // keukenConfig,
  // voorkeurenConfig,
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get a module config by its ID
 */
export function getModuleConfig(moduleId: string): SettingsModuleConfig | undefined {
  return settingsModules.find((m) => m.id === moduleId);
}

/**
 * Get a section config within a module
 */
export function getSectionConfig(
  moduleId: string,
  sectionId: string
): SettingsSection | undefined {
  const module = getModuleConfig(moduleId);
  return module?.sections.find((s) => s.id === sectionId);
}

/**
 * Get a subsection config within a section
 */
export function getSubsectionConfig(
  moduleId: string,
  sectionId: string,
  subsectionId: string
): SettingsSubsection | undefined {
  const section = getSectionConfig(moduleId, sectionId);
  return section?.subsections?.find((s) => s.id === subsectionId);
}

/**
 * Build breadcrumb items from route path
 */
export function buildBreadcrumbs(
  moduleId: string,
  sectionId?: string,
  subsectionId?: string,
  itemLabel?: string
): Array<{ label: string; path?: string }> {
  const crumbs: Array<{ label: string; path?: string }> = [
    { label: "Settings", path: "/instellingen/voorkeuren" },
  ];

  const module = getModuleConfig(moduleId);
  if (!module) return crumbs;

  crumbs.push({
    label: module.label,
    path: sectionId ? module.basePath : undefined,
  });

  if (sectionId) {
    const section = getSectionConfig(moduleId, sectionId);
    if (section) {
      crumbs.push({
        label: section.label,
        path: subsectionId || itemLabel ? section.path : undefined,
      });
    }
  }

  if (subsectionId) {
    const subsection = getSubsectionConfig(moduleId, sectionId!, subsectionId);
    if (subsection) {
      crumbs.push({
        label: subsection.label,
        path: itemLabel ? subsection.path : undefined,
      });
    }
  }

  if (itemLabel) {
    crumbs.push({ label: itemLabel });
  }

  return crumbs;
}
