

# Website Popup Verbeteringen

## Drie wijzigingen

### 1. Popup preview centreren

De live preview in PopupSettingsTab toont de popup al gecentreerd (`flex items-center justify-center`), maar het preview-venster zelf mist visuele context. We voegen een gesimuleerde "browser viewport" toe zodat de popup duidelijk in het midden van een pagina staat — net zoals een bezoeker het zal zien.

**Wijzigingen in `PopupSettingsTab.tsx`:**
- Preview container krijgt een min-height van 320px en een subtiel raster/dot-patroon als achtergrond (simuleert een webpagina)
- De popup card blijft gecentreerd via flex
- Voor de sticky bar preview: toon de bar aan de boven- of onderkant van het preview-venster (relatief gepositioneerd) in plaats van ook gecentreerd

### 2. Voorbeeld-link toevoegen

Onder de embed code sectie komt een "Preview openen" knop die een volledige popup demo opent in een nieuw browsertabblad. Dit wordt een simpele preview-pagina die het widget-script inlaadt.

**Wijzigingen:**
- Nieuwe edge function `marketing-popup-preview` die een volledige HTML-pagina serveert met het widget-script ingeladen — zo kun je de popup live testen
- In `PopupSettingsTab.tsx`: een "Preview openen" knop naast "Kopieer code" die de preview URL opent in een nieuw tabblad
- De preview URL wordt: `{SUPABASE_URL}/functions/v1/marketing-popup-preview?slug={slug}`

### 3. Uitgelicht ticket koppelen aan popup

De popup kan een reserveringsticket uitlichten als extra conversie-element. Een "featured card" sectie toont het ticket met naam, korte beschrijving en een "Reserveer" knop.

**Database wijziging:**
- Nieuwe kolom `featured_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL` op `marketing_popup_config`

**Wijzigingen in PopupSettingsTab.tsx:**
- Nieuwe sectie "Uitgelicht item" met een dropdown om een actief ticket te selecteren (of "Geen")
- De tickets worden opgehaald via de bestaande `useTickets` hook
- Preview toont een mini ticket-card onder het email formulier wanneer een ticket geselecteerd is

**Wijzigingen in edge functions:**
- `marketing-popup-config`: haalt het featured ticket op (titel, beschrijving, kleur) en stuurt het mee in de response
- `marketing-popup-widget`: rendert een featured ticket card in de popup wanneer aanwezig, met een "Reserveer" link naar de booking widget

De architectuur is bewust uitbreidbaar: het veld heet `featured_ticket_id` nu, maar in de toekomst kan dit uitgebreid worden met een `featured_type` enum (ticket, gerecht, etc.) wanneer de keukenmodule operationeel is.

---

## Technische details

| Bestand | Actie |
|---------|-------|
| `src/components/marketing/settings/PopupSettingsTab.tsx` | Edit: centered preview met viewport simulatie, sticky bar positionering, preview link knop, featured ticket selector + mini preview |
| `supabase/functions/marketing-popup-preview/index.ts` | Nieuw: HTML pagina die het widget-script demonstreert |
| `supabase/functions/marketing-popup-config/index.ts` | Edit: featured ticket data ophalen en meesturen |
| `supabase/functions/marketing-popup-widget/index.ts` | Edit: featured ticket card renderen in popup |
| Database migratie | `ALTER TABLE marketing_popup_config ADD COLUMN featured_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL` |

