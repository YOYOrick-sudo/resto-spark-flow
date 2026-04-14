

# Navigatie & Structuur Opschoning — Volledig Plan met Code

## Overzicht
Sidebar opschonen (Keuken, Kaartbeheer, Instellingen), Recepten pagina aanpassen voor alleen halffabricaten, placeholder pagina's voor Menu's en Menu Engineering, en Service/Finance/Takeaway groepen verwijderen.

---

## Stap 1: `src/lib/navigation.ts`

Volledige herschrijving van ROUTE_MAP, menuItems en getExpandedGroupFromPath.

```typescript
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
      { id: 'kitchen-recipes', label: 'Recepten', path: '/recepten' },
      { id: 'kitchen-voorraad', label: 'Ingrediënten', path: '/voorraad' },
      { id: 'kitchen-orders', label: 'Voorraad & Inkoop', path: '/inkoop' },
      { id: 'kitchen-transfers', label: 'Interne Bestellingen', path: '/interne-bestellingen' },
      { id: 'kitchen-taken', label: 'Taken & HACCP', path: '/taken' },
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
```

---

## Stap 2: `src/lib/navigationBuilder.ts`

Opschonen van verwijderde items.

```typescript
import type { UserContext, ModuleKey } from '@/types/auth';
import { menuItems, type MenuItem, type SubMenuItem } from './navigation';

const MENU_MODULE_MAP: Record<string, ModuleKey> = {
  'reservations': 'reservations',
  'kitchen': 'kitchen',
  'kitchen-mep': 'kitchen',
  'kitchen-recipes': 'kitchen',
  'kitchen-voorraad': 'kitchen',
  'kitchen-orders': 'kitchen',
  'kitchen-transfers': 'kitchen',
  'kitchen-taken': 'kitchen',
  'kaartbeheer': 'kitchen',
  'kaartbeheer-gerechten': 'kitchen',
  'kaartbeheer-menus': 'kitchen',
  'kaartbeheer-menu-engineering': 'kitchen',
  'settings': 'settings',
  'settings-voorkeuren': 'settings',
  'settings-keuken': 'settings',
  'settings-reserveringen': 'settings',
  'settings-assistent': 'settings',
  'settings-communicatie': 'settings',
  'settings-marketing': 'settings',
  'settings-onboarding': 'settings',
};

const MENU_PERMISSION_MAP: Record<string, string> = {
  'reservations': 'reservations.view',
  'kitchen': 'kitchen.view',
  'kitchen-mep': 'kitchen.mep.view',
  'kitchen-recipes': 'kitchen.recipes.view',
  'kitchen-voorraad': 'kitchen.ingredients.view',
  'kitchen-orders': 'kitchen.orders.view',
  'kitchen-transfers': 'kitchen.orders.view',
  'kitchen-taken': 'kitchen.view',
  'kaartbeheer': 'kitchen.view',
  'kaartbeheer-gerechten': 'kitchen.recipes.view',
  'kaartbeheer-menus': 'kitchen.view',
  'kaartbeheer-menu-engineering': 'kitchen.view',
  'settings': 'settings.view',
  'settings-voorkeuren': 'settings.general.view',
  'settings-keuken': 'settings.general.view',
  'settings-reserveringen': 'reservations.settings',
  'settings-assistent': 'settings.general.view',
  'settings-communicatie': 'settings.general.view',
  'settings-marketing': 'settings.general.view',
  'settings-onboarding': 'settings.general.view',
};

// ... rest of the file stays identical (isModuleEnabled, hasPermission, filterSubItems, buildNavigation, getDefaultRoute)
```

---

## Stap 3: `src/components/layout/NestoSidebar.tsx`

Verwijder de `isMultiLocation` filter op regel 277. Wijzig:

```typescript
// Oud (regel 276-277):
{item.subItems
  .filter((sub) => sub.id !== 'kitchen-transfers' || isMultiLocation)
  .map((subItem) => {

// Nieuw:
{item.subItems
  .map((subItem) => {
```

---

## Stap 4: `src/hooks/useRecepten.ts`

Voeg `.eq("type", "halffabricaat")` toe aan de query. Verwijder type uit client-side filters.

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface ReceptAllergeenRow {
  id: string;
  allergeen_id: string;
  status: string;
  allergenen: {
    id: string;
    code: string;
    naam_nl: string;
    naam_en: string;
    sort_order: number;
  };
}

export interface ReceptRow {
  id: string;
  naam: string;
  categorie: string;
  type: string;
  porties: number;
  actieve_bereidingstijd: number | null;
  passieve_bereidingstijd: number | null;
  bereiding: string | null;
  arbeidskostprijs: number;
  totale_ingredientkostprijs: number;
  totale_kostprijs: number;
  kostprijs_berekend_op: string | null;
  verkoopprijs: number | null;
  is_archived: boolean;
  archived_at: string | null;
  location_id: string;
  created_at: string;
  updated_at: string;
  recept_allergenen: ReceptAllergeenRow[];
}

export interface ReceptenFilters {
  search: string;
  categorie: string;
  showArchived: boolean;
}

export function useRecepten(filters: ReceptenFilters) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["recepten", locationId, filters.showArchived],
    queryFn: async () => {
      let query = supabase
        .from("recepten")
        .select(`
          *,
          recept_allergenen(
            id,
            allergeen_id,
            status,
            allergenen(id, code, naam_nl, naam_en, sort_order)
          )
        `)
        .eq("location_id", locationId!)
        .eq("type", "halffabricaat")
        .order("naam", { ascending: true });

      if (!filters.showArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ReceptRow[];
    },
    enabled: !!locationId,
  });
}

export function filterRecepten(
  data: ReceptRow[] | undefined,
  filters: ReceptenFilters
): ReceptRow[] {
  if (!data) return [];
  let result = [...data];

  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.naam.toLowerCase().includes(s) ||
        r.categorie.toLowerCase().includes(s)
    );
  }

  if (filters.categorie) {
    result = result.filter((r) => r.categorie === filters.categorie);
  }

  return result;
}
```

---

## Stap 5: `src/pages/Recepten.tsx`

Verwijder type toggle, type kolom, en pas subtitle aan.

```tsx
import * as React from "react";
import {
  PageHeader,
  SearchBar,
  NestoSelect,
  NestoButton,
  NestoBadge,
  DataTable,
  Spinner,
} from "@/components/polar";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus } from "lucide-react";
import { useRecepten, filterRecepten, ReceptRow, ReceptenFilters } from "@/hooks/useRecepten";
import { NieuwReceptModal } from "@/components/recepten/NieuwReceptModal";
import { ReceptDetailPanel } from "@/components/recepten/ReceptDetailPanel";
import type { DataTableColumn } from "@/components/polar";

const CATEGORIE_FILTER_OPTIONS = [
  { value: "", label: "Alle categorieën" },
  { value: "sauzen", label: "Sauzen" },
  { value: "bijgerechten", label: "Bijgerechten" },
  { value: "hoofdgerechten", label: "Hoofdgerechten" },
  { value: "desserts", label: "Desserts" },
  { value: "bases", label: "Bases" },
  { value: "marinades", label: "Marinades" },
  { value: "overig", label: "Overig" },
];

export default function Recepten() {
  const [filters, setFilters] = React.useState<ReceptenFilters>({
    search: "",
    categorie: "",
    showArchived: false,
  });
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data, isLoading } = useRecepten(filters);
  const filtered = filterRecepten(data, filters);

  const columns: DataTableColumn<ReceptRow>[] = [
    {
      key: "naam",
      header: "Naam",
      sortable: true,
      render: (r) => <span className="font-medium text-foreground">{r.naam}</span>,
    },
    {
      key: "categorie",
      header: "Categorie",
      render: (r) => (
        <span className="text-muted-foreground capitalize">{r.categorie}</span>
      ),
    },
    {
      key: "porties",
      header: "Porties",
      render: (r) => <span className="text-muted-foreground">{r.porties}</span>,
    },
    {
      key: "kostprijs",
      header: "Kostprijs/portie",
      render: (r) => {
        const kpp = r.porties > 0 ? r.totale_kostprijs / r.porties : 0;
        return <span className="font-medium text-foreground">€{kpp.toFixed(2)}</span>;
      },
    },
    {
      key: "allergenen",
      header: "Allergenen",
      render: (r) => {
        const actief = (r.recept_allergenen || []).filter(
          (a) => a.status === "bevat" || a.status === "kan_bevatten"
        );
        if (actief.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex gap-1 flex-wrap">
            {actief.slice(0, 4).map((a) => (
              <NestoBadge
                key={a.id}
                variant={a.status === "bevat" ? "error" : "warning"}
                size="sm"
              >
                {a.allergenen?.naam_nl ?? "?"}
              </NestoBadge>
            ))}
            {actief.length > 4 && (
              <NestoBadge variant="default" size="sm">
                +{actief.length - 4}
              </NestoBadge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recepten"
        subtitle="Beheer je halffabricaten en bereidingen."
        actions={
          <NestoButton
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowNewModal(true)}
            className="min-h-[48px]"
          >
            Nieuw recept
          </NestoButton>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchBar
          value={filters.search}
          onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
          placeholder="Zoek op naam..."
          className="w-full sm:w-64"
        />
        <NestoSelect
          value={filters.categorie}
          onValueChange={(v) => setFilters((f) => ({ ...f, categorie: v }))}
          options={CATEGORIE_FILTER_OPTIONS}
          size="sm"
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={filters.showArchived}
            onCheckedChange={(v) =>
              setFilters((f) => ({ ...f, showArchived: v }))
            }
          />
          <span className="text-xs text-muted-foreground">Gearchiveerd</span>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyMessage="Nog geen recepten toegevoegd"
          emptyIcon={BookOpen}
        />
      )}

      <NieuwReceptModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onCreated={(id) => setSelectedId(id)}
      />

      <ReceptDetailPanel
        receptId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
```

---

## Stap 6: Placeholder pagina's

### `src/pages/KaartbeheerMenus.tsx`

```tsx
import { PageHeader, EmptyState } from "@/components/polar";
import { BookOpen } from "lucide-react";

export default function KaartbeheerMenus() {
  return (
    <div className="space-y-6">
      <PageHeader title="Menu's" subtitle="Stel menu's samen voor je restaurant." />
      <EmptyState
        icon={BookOpen}
        title="Menu's"
        description="Hier kun je binnenkort menu's samenstellen en beheren."
      />
    </div>
  );
}
```

### `src/pages/KaartbeheerMenuEngineering.tsx`

```tsx
import { PageHeader, EmptyState } from "@/components/polar";
import { BarChart3 } from "lucide-react";

export default function KaartbeheerMenuEngineering() {
  return (
    <div className="space-y-6">
      <PageHeader title="Menu Engineering" subtitle="Analyseer de prestaties van je menukaart." />
      <EmptyState
        icon={BarChart3}
        title="Menu Engineering"
        description="Hier kun je binnenkort de populariteit en winstgevendheid van je gerechten analyseren."
      />
    </div>
  );
}
```

---

## Stap 7: `src/App.tsx`

Wijzigingen:
1. Voeg imports toe voor `KaartbeheerMenus` en `KaartbeheerMenuEngineering`
2. Voeg 2 routes toe na de kaartbeheer routes
3. Verwijder `/halffabricaten` routes (redirect naar `/recepten`)
4. Verwijder `/kostprijzen` route
5. Verplaats `/taken` comment van "Service" naar "Keuken"

Concrete wijzigingen in routes sectie:

```tsx
// Imports toevoegen:
import KaartbeheerMenus from "./pages/KaartbeheerMenus";
import KaartbeheerMenuEngineering from "./pages/KaartbeheerMenuEngineering";

// Routes sectie wordt:

{/* Keuken */}
<Route path="/mep" element={<MepTaken />} />
<Route path="/halffabricaten" element={<Navigate to="/recepten" replace />} />
<Route path="/halffabricaten/:id" element={<Navigate to="/recepten" replace />} />
<Route path="/recepten" element={<Recepten />} />
<Route path="/recepten/:id" element={<ReceptenDetail />} />
<Route path="/voorraad" element={<Ingredienten />} />
<Route path="/inkoop" element={<Inkoop />} />
<Route path="/inkoop/leveranciers" element={<Leveranciers />} />
<Route path="/interne-bestellingen" element={<InterneBestellingen />} />
<Route path="/taken" element={<Taken />} />

{/* Kaartbeheer */}
<Route path="/kaartbeheer" element={<Kaartbeheer />} />
<Route path="/kaartbeheer/:id" element={<KaartbeheerDetail />} />
<Route path="/kaartbeheer/menus" element={<KaartbeheerMenus />} />
<Route path="/kaartbeheer/menu-engineering" element={<KaartbeheerMenuEngineering />} />
```

Verwijder de `/kostprijzen` route. De `Kostprijzen` import kan ook verwijderd worden.

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/lib/navigation.ts` | Volledig herschrijven |
| `src/lib/navigationBuilder.ts` | Maps opschonen |
| `src/components/layout/NestoSidebar.tsx` | isMultiLocation filter verwijderen |
| `src/hooks/useRecepten.ts` | Filter op halffabricaat, type uit filters |
| `src/pages/Recepten.tsx` | Type toggle + kolom verwijderen, subtitle |
| `src/pages/KaartbeheerMenus.tsx` | Nieuw — placeholder |
| `src/pages/KaartbeheerMenuEngineering.tsx` | Nieuw — placeholder |
| `src/App.tsx` | Routes + imports aanpassen |

