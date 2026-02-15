# Nesto Module Checklist

Interne handleiding voor het bouwen van nieuwe modules. Volg deze stappen in volgorde.

---

## 1. Types definiëren

- Maak `src/types/{module}.ts`
- Exporteer interfaces voor het hoofdmodel + gerelateerde types
- Gebruik bestaande base types waar mogelijk (`Location`, `Organization`, etc.)
- **Referentie:** `src/types/shifts.ts`

## 2. Query Keys registreren

- Voeg keys toe aan `src/lib/queryKeys.ts`
- Patroon:
  ```ts
  module: {
    all: ['module'] as const,
    detail: (id: string) => ['module', id] as const,
    byLocation: (locId: string) => ['module', 'location', locId] as const,
  }
  ```

## 3. Hook bouwen

- Maak `src/hooks/use{Module}.ts`
- Volg het `useShifts.ts` patroon:
  - `useQuery` voor data ophalen met `queryKeys`
  - `useMutation` voor create/update/delete
  - `onSuccess`: `invalidateQueries` + `nestoToast.success()`
  - `onError`: `nestoToast.error()`
  - Return: `{ data, isLoading, create, update, delete }`
- Queries altijd met `enabled: !!locationId` guard
- Gebruik `exact: false` bij `invalidateQueries`
- **Referentie:** `src/hooks/useShifts.ts`

## 4. Pagina bouwen

- Gebruik **ALLEEN** Polar UI componenten:
  - `NestoButton` (nooit shadcn `Button`)
  - `NestoCard` (nooit raw div met shadow)
  - `NestoInput` / `NestoSelect` (nooit raw input/select)
  - `NestoBadge` met variant prop
- Verplichte componenten per pagina:
  - `<PageHeader title="..." subtitle="..." />` — op elke pagina
  - `<TableSkeleton />` / `<CardSkeleton />` / `<ContentSkeleton />` / `<PageSkeleton />` — loading states
  - `<EmptyState />` — wanneer geen data
  - `<Spinner />` — inline loading
  - `<ConfirmDialog />` — voor destructieve acties
- Typography tokens: `text-h1`, `text-h2`, `text-body`, `text-secondary`, `text-small`, `text-label`, `text-caption`
- Feedback via `nestoToast.success()` / `nestoToast.error()` / `nestoToast.warning()`
- **Referentie:** `src/pages/Ingredienten.tsx`

## 5. Permissies koppelen

- `usePermission('module.action')` voor actie-niveau checks
- `useEntitlement('module_key')` voor module-niveau checks
- Voeg toe aan `navigationBuilder.ts` voor sidebar filtering
- Permissies volgen: `module.resource.actie` (bijv. `finance.invoices.create`)

## 6. Route toevoegen

- Voeg import toe bovenaan `src/App.tsx`:
  ```ts
  import Finance from "./pages/Finance";
  ```
- Voeg route toe binnen de `<ProtectedRoute>` wrapper:
  ```tsx
  <Route path="/finance" element={<Finance />} />
  ```
- **Let op:** het project gebruikt momenteel directe imports, geen `lazy()`. Lazy loading is een toekomstige optimalisatie (Fase 14).

## 7. Navigatie toevoegen

- Voeg menu item toe in `src/lib/navigation.ts` (`menuItems` array)
- Map module key + permissions in `src/lib/navigationBuilder.ts`:
  - `MENU_MODULE_MAP` — module key koppeling
  - `MENU_PERMISSION_MAP` — permission koppeling

## 8. Settings pagina (indien nodig)

- Gebruik `SettingsModuleLayout` voor de module settings wrapper
- Gebruik `SettingsDetailLayout` voor detail pagina's
- Registreer route in `src/lib/settingsRouteConfig.ts`

## 9. Database checklist (per nieuwe tabel)

- [ ] `location_id` kolom aanwezig
- [ ] RLS ingeschakeld
- [ ] SELECT / INSERT / UPDATE / DELETE policies
- [ ] `get_user_context()` bijgewerkt bij nieuwe permissions
- [ ] Indexes op `location_id` + filter-kolommen
- [ ] Types geregenereerd

## 10. Testen & pre-flight check

- [ ] Alle CRUD operaties werken
- [ ] Module werkt met permissies aan EN uit
- [ ] Loading → skeletons, empty → EmptyState, error → toast
- [ ] Dark mode werkt
- [ ] Keyboard navigatie / focus-visible states
- [ ] Nederlandse teksten overal
- [ ] Geen hardcoded hex-kleuren of font-sizes
- [ ] Geen `console.log` of `FASE`-comments in nieuwe code
- [ ] Types, query keys, navigatie en permissions geregistreerd

---

## NOOIT gebruiken

| ❌ Niet doen | ✅ Wel doen |
|---|---|
| Hardcoded hex-kleuren | Tokens: `text-primary`, `bg-card` |
| `text-[14px]` | `text-body`, `text-small` |
| `bg-white` | `bg-card` (werkt in dark mode) |
| `console.log` als handler | Echte implementatie of `nestoToast` |
| Engelse UI-tekst | Nederlandse tekst |
| shadcn `Button` | `NestoButton` |
| Raw `<input>` | `NestoInput` |
