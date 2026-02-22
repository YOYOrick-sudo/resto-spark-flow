
# Sessie 1.3 — Segment Builder + Contact Management

## Overzicht

Twee nieuwe pagina's: `/marketing/segmenten` (segment overzicht + visuele builder) en `/marketing/contacten` (contactlijst met opt-in management). Plus twee database RPC functies voor server-side segment filtering.

## Database migratie

### RPC 1: `count_segment_customers`

Server-side functie die `filter_rules` JSONB toepast op `customers` en een count retourneert. Ondersteunt de 7 condities met AND/OR logica.

Parameters: `_location_id UUID`, `_filter_rules JSONB`
Returns: `INTEGER`
Security: `SECURITY DEFINER` met `user_has_location_access` check

### RPC 2: `list_segment_customers`

Zelfde filterlogica maar retourneert customer rijen met paginatie.

Parameters: `_location_id UUID`, `_filter_rules JSONB` (nullable), `_limit INTEGER DEFAULT 100`, `_offset INTEGER DEFAULT 0`
Returns: `TABLE` met customer velden

### Kolom toevoegen

`marketing_segments.last_campaign_at TIMESTAMPTZ NULL` -- wordt later gevuld door campagne engine

### Filter engine logica (in beide RPCs)

Elke conditie wordt vertaald naar een SQL WHERE clause:

| Veld | SQL mapping |
|------|-------------|
| total_visits | `total_visits <op> value` |
| days_since_last_visit | `(CURRENT_DATE - last_visit_at::date) <op> value` |
| average_spend | `average_spend <op> value` |
| no_show_count | `total_no_shows <op> value` |
| birthday_month | `EXTRACT(MONTH FROM birthday) = value` |
| tags | `tags @> to_jsonb(value::text)` |
| dietary_preferences | `dietary_preferences @> ARRAY[value]` |

Operators: `gte` (>=), `lte` (<=), `eq` (=), `contains` (@>)
Conditions gecombineerd met AND of OR op basis van `logic` veld.

## Navigatie

### `src/lib/navigation.ts`
- Nieuw top-level menu-item "Marketing" met `Megaphone` icon in sectie `OPERATIE`
- Expandable met sub-items:
  - "Segmenten" -> `/marketing/segmenten`
  - "Contacten" -> `/marketing/contacten`
- ROUTE_MAP entries: `'marketing-segmenten'`, `'marketing-contacten'`
- `getExpandedGroupFromPath`: case voor `/marketing`

### `src/App.tsx`
- 2 nieuwe routes: `/marketing/segmenten` en `/marketing/contacten`

## Data hooks (3 nieuwe bestanden)

### `src/hooks/useMarketingSegments.ts`
- `useMarketingSegments()` -- query `marketing_segments` voor locatie, order by `is_system DESC, name`
- `useCreateSegment()` -- insert mutation
- `useUpdateSegment()` -- update mutation (naam, beschrijving, filter_rules)
- `useDeleteSegment()` -- delete mutation (alleen non-system)

### `src/hooks/useSegmentPreview.ts`
- `useSegmentPreview(filterRules)` -- calls RPC `count_segment_customers` via `supabase.rpc()`
- Debounced met 500ms delay
- Retourneert `{ count: number | null, isLoading: boolean }`

### `src/hooks/useMarketingContacts.ts`
- `useMarketingContacts(filterRules?, search?, limit?, offset?)` -- calls RPC `list_segment_customers` of directe customers query bij null filter
- `useContactPreferences(customerId)` -- query `marketing_contact_preferences` voor specifieke klant
- `useUpdateContactPreference()` -- upsert opt-in/out per kanaal
- `useNewContactsThisMonth()` -- count customers WHERE `created_at >= date_trunc('month', CURRENT_DATE)`

## Pagina's en componenten

### `src/pages/marketing/SegmentsPage.tsx`
- PageHeader: "Segmenten" met "Nieuw segment" actie knop
- Permission gate op `marketing.view` / `marketing.manage`
- Grid van segment cards (2 kolommen desktop, 1 mobiel)
- Per card: naam, beschrijving, gastenaantal badge, "Systeem" NestoBadge, laatste campagne datum
- Klik op card -> opent SegmentBuilderModal in edit-modus
- Delete knop per custom segment (met ConfirmDialog)

### `src/pages/marketing/ContactsPage.tsx`
- PageHeader: "Contacten" met subtitle
- StatCard bovenaan: "Nieuwe contacten deze maand" met count
- Filter bar: segment dropdown (NestoSelect) + SearchBar
- NestoTable met kolommen:
  - Naam (first_name + last_name)
  - Email
  - Bezoeken (total_visits)
  - Laatste bezoek (last_visit_at, relatieve datum)
  - Gem. besteding (average_spend, valuta format)
  - Opt-in status (NestoBadge per kanaal)
- Klik op rij -> opent ContactOptInSheet
- CSV import knop: disabled placeholder met tooltip

### `src/components/marketing/segments/SegmentBuilderModal.tsx`
- NestoModal size="lg"
- Naam + beschrijving invoervelden
- AND/OR toggle (radio group) bovenaan condities
- Lijst van ConditionRow componenten
- "Conditie toevoegen" knop
- Live preview badge: "Dit segment bevat XX gasten" via `useSegmentPreview`
- Footer: Annuleren + Opslaan knoppen

### `src/components/marketing/segments/ConditionRow.tsx`
- Veld dropdown (7 opties)
- Operator dropdown (contextafhankelijk per veld)
- Waarde input (number, text, of month select -- afhankelijk van veld)
- Verwijder knop (Trash2 icon)

### `src/components/marketing/contacts/ContactOptInSheet.tsx`
- Sheet panel voor opt-in management per gast
- Toont naam en email
- Toggle per kanaal (email, sms) met huidige status
- Consent bron en datum weergave
- Upsert via `useUpdateContactPreference`

## Bestanden overzicht

| Bestand | Type | Doel |
|---------|------|------|
| DB migratie | SQL | 2 RPCs + last_campaign_at kolom |
| `src/lib/navigation.ts` | Edit | Marketing operatie menu-item |
| `src/App.tsx` | Edit | 2 routes toevoegen |
| `src/hooks/useMarketingSegments.ts` | Nieuw | Segmenten CRUD |
| `src/hooks/useSegmentPreview.ts` | Nieuw | Live count preview |
| `src/hooks/useMarketingContacts.ts` | Nieuw | Contacten + opt-in |
| `src/pages/marketing/SegmentsPage.tsx` | Nieuw | Segmenten overzicht |
| `src/pages/marketing/ContactsPage.tsx` | Nieuw | Contacten lijst |
| `src/components/marketing/segments/SegmentBuilderModal.tsx` | Nieuw | Filter builder |
| `src/components/marketing/segments/ConditionRow.tsx` | Nieuw | Conditie-rij |
| `src/components/marketing/contacts/ContactOptInSheet.tsx` | Nieuw | Opt-in sheet |

## Technische details

### filter_rules JSONB structuur

```text
{
  "conditions": [
    { "field": "total_visits", "operator": "gte", "value": 3 },
    { "field": "days_since_last_visit", "operator": "gte", "value": 60 }
  ],
  "logic": "AND"
}
```

### Veld-naar-operator mapping

| Veld | Operators | Input type |
|------|-----------|------------|
| total_visits | gte, lte, eq | number |
| days_since_last_visit | gte, lte | number |
| average_spend | gte, lte | number |
| no_show_count | gte, lte | number |
| birthday_month | eq | month select (1-12) |
| tags | contains | text |
| dietary_preferences | contains | text |

### Navigatie structuur

De OPERATIE sectie krijgt nu het "Marketing" menu-item met operationele sub-pagina's. Dit is conform de discussie: OPERATIE = werkpagina's, INSTELLINGEN = configuratie. Segmenten en Contacten zijn operationele pagina's, niet instellingen.

### RLS

Bestaande RLS policies op `marketing_segments`, `marketing_contact_preferences` en `customers` zijn al correct geconfigureerd. De RPCs gebruiken `SECURITY DEFINER` met expliciete `user_has_location_access` check.
