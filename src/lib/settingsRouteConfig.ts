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
  Globe,
  ListOrdered,
  CreditCard,
  Settings2,
  Palette,
  Mail,
  Workflow,
  ShieldCheck,
  Share2,
  Star,
  Users,
  FileText,
  BellRing,
  BookOpen,
  Bot,
  MessagesSquare,
  MessageSquare,
  ShoppingCart,
  Thermometer,
  ClipboardCheck,
  Printer,
  CalendarClock,
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
      description: "E-mail instellingen",
      icon: Bell,
    },
    {
      id: "widget",
      label: "Widget",
      path: "/instellingen/reserveringen/widget",
      description: "Publieke boekingswidget configureren",
      icon: Globe,
    },
    {
      id: "wachtlijst",
      label: "Wachtlijst",
      path: "/instellingen/reserveringen/wachtlijst",
      description: "Wachtlijst en auto-invite configuratie",
      icon: ListOrdered,
    },
  ],
};

// ============================================
// All Module Configs
// ============================================

export const marketingConfig: SettingsModuleConfig = {
  id: "marketing",
  label: "Marketing",
  basePath: "/instellingen/marketing",
  description: "Branding, email, automation en social media",
  sections: [
    { id: "algemeen", label: "Algemeen", path: "/instellingen/marketing/algemeen", description: "Module status, email frequentie en verzendtijd", icon: Settings2 },
    { id: "brand-kit", label: "Brand Kit", path: "/instellingen/marketing/brand-kit", description: "Huisstijl, logo en branding", icon: Palette },
    { id: "email", label: "Email", path: "/instellingen/marketing/email", description: "E-mail configuratie en templates", icon: Mail },
    { id: "flows", label: "Automation Flows", path: "/instellingen/marketing/flows", description: "Geautomatiseerde marketing flows", icon: Workflow },
    { id: "gdpr", label: "GDPR", path: "/instellingen/marketing/gdpr", description: "Privacy, consent en dataverwerking", icon: ShieldCheck },
    { id: "social", label: "Social Accounts", path: "/instellingen/marketing/social", description: "Social media koppelingen", icon: Share2 },
    { id: "popup", label: "Website Popup", path: "/instellingen/marketing/popup", description: "Pop-up widget configuratie", icon: Globe },
    { id: "reviews", label: "Review Platforms", path: "/instellingen/marketing/reviews", description: "Review platformen en monitoring", icon: Star },
  ],
};

export const onboardingConfig: SettingsModuleConfig = {
  id: "onboarding",
  label: "Onboarding",
  basePath: "/instellingen/onboarding",
  description: "Pipeline, team, templates en herinneringen",
  sections: [
    { id: "fasen", label: "Fasen", path: "/instellingen/onboarding/fasen", description: "Onboarding pipeline en stappen", icon: ListOrdered },
    { id: "team", label: "Team", path: "/instellingen/onboarding/team", description: "Team beheer en rollen", icon: Users },
    { id: "templates", label: "E-mailtemplates", path: "/instellingen/onboarding/templates", description: "E-mail templates voor kandidaten", icon: FileText },
    { id: "reminders", label: "Reminders", path: "/instellingen/onboarding/reminders", description: "Automatische herinneringen", icon: BellRing },
    { id: "sollicitatiepagina", label: "Sollicitatiepagina", path: "/instellingen/onboarding/sollicitatiepagina", description: "Publieke werken-bij pagina configureren", icon: Globe },
  ],
};

export const assistentConfig: SettingsModuleConfig = {
  id: "assistent",
  label: "Assistent",
  basePath: "/instellingen/assistent",
  description: "AI-kennis, persoonlijkheid en autonomie",
  sections: [
    { id: "knowledge", label: "Knowledge Base", path: "/instellingen/assistent/knowledge", description: "Veelgestelde vragen en restaurant kennis", icon: BookOpen },
    { id: "agent", label: "AI Assistent", path: "/instellingen/assistent/agent", description: "Persoonlijkheid, toon en gedrag", icon: Bot },
    { id: "permissions", label: "Bevoegdheden", path: "/instellingen/assistent/permissions", description: "Autonomie per taak instellen", icon: Shield },
  ],
};

export const communicatieConfig: SettingsModuleConfig = {
  id: "communicatie",
  label: "Communicatie",
  basePath: "/instellingen/communicatie",
  description: "Email opmaak, branding, gastberichten en WhatsApp",
  sections: [
    { id: "email-opmaak", label: "E-mail opmaak", path: "/instellingen/communicatie/email-opmaak", description: "Lay-out en styling van emails", icon: Mail },
    { id: "branding", label: "Branding", path: "/instellingen/communicatie/branding", description: "Logo, kleuren en footer", icon: Palette },
    { id: "gastberichten", label: "Gastberichten", path: "/instellingen/communicatie/gastberichten", description: "Berichten naar gasten configureren", icon: MessagesSquare },
    { id: "whatsapp", label: "WhatsApp", path: "/instellingen/communicatie/whatsapp", description: "WhatsApp kanaal instellingen", icon: MessageSquare },
  ],
};

export const keukenConfig: SettingsModuleConfig = {
  id: "keuken",
  label: "Keuken",
  basePath: "/instellingen/keuken",
  description: "Inkoop, HACCP, categorieën, assistent en taken",
  sections: [
    { id: "inkoop", label: "Inkoop & Voorraad", path: "/instellingen/keuken/inkoop", description: "Buffer-percentage voor besteladvies", icon: ShoppingCart },
    { id: "haccp", label: "HACCP Temperatuur", path: "/instellingen/keuken/haccp", description: "Temperatuurgrenzen koeling, vriezer en kerntemperatuur", icon: Thermometer },
    { id: "categorieen", label: "Categorieën", path: "/instellingen/keuken/categorieen", description: "Ingrediënt-, recept- en gerechtcategorieën", icon: LayoutGrid },
    { id: "assistent", label: "Assistent", path: "/instellingen/keuken/assistent", description: "Autonomie en meldingsdrempels van de keuken-assistent", icon: Bot },
    {
      id: "taken",
      label: "Taken & HACCP",
      path: "/instellingen/keuken/taken",
      description: "Checklist-templates, bevriestijd en standaard-tijden",
      icon: ClipboardCheck,
      subsections: [
        {
          id: "templates",
          label: "Templates",
          path: "/instellingen/keuken/taken/templates",
          description: "Beheer checklist-templates",
          icon: FileText,
        },
      ],
    },
    { id: "medewerkers", label: "Medewerkers", path: "/instellingen/keuken/medewerkers", description: "Koks, sous-chefs en labels", icon: Users },
    { id: "printer", label: "Printer & Labels", path: "/instellingen/keuken/printer", description: "Zebra-printer en label-templates", icon: Printer },
  ],
};

export const algemeenConfig: SettingsModuleConfig = {
  id: "algemeen",
  label: "Algemeen",
  basePath: "/instellingen/algemeen",
  description: "Algemene instellingen voor deze locatie",
  sections: [
    {
      id: "openingstijden",
      label: "Openingstijden",
      path: "/instellingen/algemeen/openingstijden",
      description: "Reguliere week en bijzondere dagen",
      icon: CalendarClock,
    },
  ],
};

export const settingsModules: SettingsModuleConfig[] = [
  algemeenConfig,
  reserveringenConfig,
  marketingConfig,
  onboardingConfig,
  assistentConfig,
  communicatieConfig,
  keukenConfig,
];

// ============================================
// Standalone Settings Pages (not in module)
// ============================================

export const standaloneSettingsPages = [
  {
    id: "betalingen",
    label: "Betalingen",
    path: "/instellingen/betalingen",
    description: "Mollie verbinding en betalingsinstellingen",
    icon: CreditCard,
  },
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
    { label: "Instellingen", path: "/instellingen/voorkeuren" },
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
