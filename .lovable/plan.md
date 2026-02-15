
# UI Vertaling naar Nederlands + Opruiming

## Overzicht
Alle Engelse tekst in de UI vertalen naar Nederlands, FASE-comments verwijderen uit ~17 bestanden, en de test-toasts route opruimen.

## Wijzigingen

### 1. Navigatie labels (`src/lib/navigation.ts`)
- `'Finance'` --> `'Financien'`
- `'Settings'` --> `'Instellingen'`
- Sub-items `'Finance'`, `'Support'`, `'Documentatie'` zijn al Nederlands (behalve `'Finance'` en `'HRM'`)
- `'Finance'` sub-item --> `'Financien'`
- `'HRM'` mag blijven (internationaal begrip, net als "Dashboard")

### 2. Breadcrumbs: "Settings" --> "Instellingen" (4 bestanden)
- `src/lib/settingsRouteConfig.ts` regel 178: `"Settings"` --> `"Instellingen"`
- `src/components/polar/SettingsPageLayout.tsx` regel 41: `>Settings<` --> `>Instellingen<`
- `src/components/settings/layouts/SettingsModuleLayout.tsx` regel 31: `>Settings<` --> `>Instellingen<`
- `src/components/settings/layouts/SettingsSectionLayout.tsx` regel 43: `>Settings<` --> `>Instellingen<`

### 3. NotFound.tsx — volledige herschrijving
- Vertaal teksten naar Nederlands
- Gebruik `<NestoCard>` en `<NestoButton>` i.p.v. raw HTML
- "Pagina niet gevonden" + "Terug naar Dashboard"

### 4. Auth.tsx
- Verwijder FASE-comment header (regels 1-3)
- Tekst is al volledig Nederlands — geen vertaling nodig

### 5. FASE-comments verwijderen (17 bestanden)
Verwijder het `// ====` + `// FASE ...` + `// ====` header-blok uit:

| Bestand | Regels |
|---------|--------|
| `src/contexts/AuthContext.tsx` | 1-3 |
| `src/contexts/UserContext.tsx` | 1-3 |
| `src/pages/Auth.tsx` | 1-3 |
| `src/components/auth/ProtectedRoute.tsx` | 1-3 |
| `src/hooks/usePermission.ts` | 1-3 |
| `src/hooks/useEntitlement.ts` | 1-3 |
| `src/hooks/useShifts.ts` | 1-4 |
| `src/hooks/useShiftExceptions.ts` | 1-4 |
| `src/types/auth.ts` | 1-3 |
| `src/types/shifts.ts` | 1-4 |
| `src/types/reservations.ts` | 1-2 |
| `src/types/tickets.ts` | 1-4 |
| `src/lib/navigationBuilder.ts` | 1-3 |
| `src/lib/shiftValidation.ts` | 1-4 |
| `src/lib/bulkExceptionGenerator.ts` | 1-4 |
| `src/components/settings/shifts/exceptions/BulkExceptionModal.tsx` | 1-4 |
| `src/components/settings/shifts/exceptions/BulkExceptionPreview.tsx` | 1-4 |

**Let op:** "Fase" als UI-tekst (bijv. "Fase verwijderen" in onboarding) blijft staan — dat is functionele Nederlandse tekst, geen development comment.

### 6. Test-toasts route verwijderen
- `src/App.tsx`: verwijder import van `TestToasts` (regel 36) en de route (regel 100)
- `src/pages/TestToasts.tsx`: verwijder het bestand

### 7. Samenvatting bestanden

| Actie | Bestand |
|-------|---------|
| Bewerkt | `src/lib/navigation.ts` (labels) |
| Bewerkt | `src/lib/settingsRouteConfig.ts` (breadcrumb) |
| Bewerkt | `src/components/polar/SettingsPageLayout.tsx` (breadcrumb) |
| Bewerkt | `src/components/settings/layouts/SettingsModuleLayout.tsx` (breadcrumb) |
| Bewerkt | `src/components/settings/layouts/SettingsSectionLayout.tsx` (breadcrumb) |
| Herschreven | `src/pages/NotFound.tsx` (NL + Polar UI) |
| Bewerkt | `src/App.tsx` (route + import verwijderd) |
| Verwijderd | `src/pages/TestToasts.tsx` |
| Bewerkt (17x) | FASE-comments verwijderd uit alle bovengenoemde bestanden |

Totaal: ~22 bestanden gewijzigd, 1 verwijderd.
