
# Marketing Instellingen verplaatsen naar /instellingen/marketing

## Overzicht

De Marketing settings pagina verhuist van `/marketing/instellingen` (onder OPERATIE) naar `/instellingen/marketing` (onder BEHEER > Instellingen). Het "Marketing" menu-item in de OPERATIE sectie wordt verwijderd — dat komt pas terug in sessie 1.6 met operationele sub-pagina's.

## Wijzigingen

### 1. `src/lib/navigation.ts`

**ROUTE_MAP:**
- Verwijder: `'marketing-instellingen': '/marketing/instellingen'`
- Toevoegen: `'settings-marketing': '/instellingen/marketing'`

**menuItems:**
- Verwijder het volledige "marketing" menu-item (regels 122-130) uit de OPERATIE sectie
- Voeg `{ id: 'settings-marketing', label: 'Marketing', path: '/instellingen/marketing' }` toe als sub-item onder "settings", na "Communicatie"

**getExpandedGroupFromPath:**
- Verwijder de `if (path.startsWith('/marketing'))` regel — `/instellingen/marketing` valt al onder de bestaande `/instellingen` check

### 2. `src/App.tsx`

- Verwijder route: `/marketing/instellingen`
- Toevoegen route: `/instellingen/marketing` met dezelfde `MarketingSettings` component

### 3. `src/pages/marketing/MarketingSettings.tsx`

- Breadcrumbs path aanpassen: eerste breadcrumb blijft `{ label: 'Instellingen', path: '/instellingen/voorkeuren' }` — dit is al correct

Geen andere bestanden hoeven te wijzigen. De hooks, tab-componenten en database blijven ongewijzigd.
