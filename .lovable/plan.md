
# Ronde 1: Widget V2 Foundation

## Overzicht

Dit is de eerste van drie implementatierondes voor de Guest Widget V2 Enterprise Redesign. We leggen het fundament: database, API, slide-in panel, en de basis widget-container.

---

## Wat verandert

### 1. Database: `widget_style` kolom + validatie trigger

Nieuw veld op `widget_settings`:

```sql
ALTER TABLE public.widget_settings
  ADD COLUMN widget_style text NOT NULL DEFAULT 'auto';

CREATE OR REPLACE FUNCTION validate_widget_style()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.widget_style NOT IN ('auto', 'showcase', 'quick') THEN
    RAISE EXCEPTION 'widget_style must be auto, showcase, or quick';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_widget_style
  BEFORE INSERT OR UPDATE ON widget_settings
  FOR EACH ROW EXECUTE FUNCTION validate_widget_style();
```

### 2. API: `/config` endpoint uitbreiden

Het `public-booking-api/index.ts` `/config` endpoint wordt uitgebreid:

- **Bug fix**: `.eq('is_active', true)` naar `.eq('status', 'active')` (tickets tabel heeft geen `is_active` kolom)
- **Nieuw**: `widget_accent_color` en `widget_style` ophalen uit widget_settings
- **Nieuw**: Tickets array met `id`, `name`, `display_title`, `description`, `short_description`, `image_url`, `min_party_size`, `max_party_size` retourneren
- **Nieuw**: `active_ticket_count` veld
- **Nieuw**: `accent_color` in response

Response wordt:
```text
{
  ...bestaande velden...
  accent_color: "#14B8A6",
  widget_style: "auto",
  active_ticket_count: 2,
  tickets: [
    { id, name, display_title, description, short_description, 
      image_url, min_party_size, max_party_size }
  ]
}
```

### 3. `widget.js`: Slide-in panel i.p.v. centered modal

Het huidige centered modal overlay wordt vervangen door een rechter slide-in panel:

**Desktop (>=768px)**:
- Panel: `position: fixed; right: 0; top: 0; bottom: 0; width: 420px; z-index: 99999`
- Geen border-radius (edge-to-edge rechts)
- Animatie: `translateX(100%) -> translateX(0)` in 300ms ease-out
- Donkere backdrop links (`rgba(0,0,0,0.4)`)
- X-knop rechtsboven (40x40 touch target)

**Mobiel (<768px)**:
- Fullscreen: `position: fixed; inset: 0; z-index: 99999`
- X-knop rechtsboven (geen drag handle -- eenvoudiger en betrouwbaarder)
- Animatie: `translateY(100%) -> translateY(0)` op mobiel

**Gedeeld**:
- Body scroll lock
- ESC toets + backdrop click + `nesto:close` postMessage
- `nesto:resize` voor inline mode (ongewijzigd)

### 4. `BookingWidget.tsx`: Container redesign

De pagina wordt aangepast voor het panel-formaat:

- `?embed=true`: verbergt logo + naam header en "Powered by Nesto" footer (al zo)
- Panel header met logo (32px) + restaurant naam + X knop
- Progress pill-dots worden verplaatst naar de header
- Content krijgt panel padding (20px)
- Geen `max-w-md` meer, widget vult beschikbare ruimte

### 5. `BookingContext.tsx`: Nieuwe velden

- `WidgetConfig` uitbreiden met `accent_color`, `widget_style`, `tickets`, `active_ticket_count`
- `BookingStep` type wordt `1 | 2 | 3 | 4 | 5` (5 voor showcase mode)
- Nieuwe state: `selectedTicket` (voor showcase mode, stap 1)
- Auto-detectie logica: als `widget_style === 'auto'`, bepaal op basis van `active_ticket_count >= 2`
- `effectiveStyle`: computed `'showcase' | 'quick'` waarde

### 6. `BookingProgress.tsx`: Pill-dots

- Geen genummerde cirkels meer, maar pill-dots
- Actieve stap: 24px breed, bg-primary
- Afgeronde stap: 8px breed, bg-primary/60
- Toekomstige stap: 8px breed, bg-gray-200
- Labels verwijderd
- Dynamisch 4 of 5 dots afhankelijk van effectiveStyle

### 7. Settings UI: Widget stijl selector

In `SettingsReserveringenWidget.tsx`, nieuwe sectie in de "Weergave" card:

- "Widget stijl" selector met 3 opties:
  - **Auto** (standaard): "Automatisch gekozen op basis van aantal tickets"
  - **Showcase**: "Gasten kiezen eerst een ticket (ticket-first)"
  - **Quick**: "Direct naar datum en tijd (datum-first)"
- Opgeslagen als `widget_style` in de database

### 8. `useWidgetSettings.ts`

- `widget_style` toevoegen aan de `WidgetSettings` interface

---

## Bestanden overzicht

| Bestand | Actie | Wijziging |
|---------|-------|-----------|
| Migratie SQL | Nieuw | `widget_style` kolom + validatie trigger |
| `supabase/functions/public-booking-api/index.ts` | Wijzigen | Config endpoint: tickets, accent, style + `is_active` bug fix |
| `public/widget.js` | Wijzigen | Slide-in panel i.p.v. centered modal |
| `src/pages/BookingWidget.tsx` | Wijzigen | Panel header, padding, embed awareness |
| `src/contexts/BookingContext.tsx` | Wijzigen | `WidgetConfig` uitbreiden, 5-stap support, `selectedTicket` |
| `src/components/booking/BookingProgress.tsx` | Wijzigen | Pill-dots, dynamisch 4/5 stappen |
| `src/hooks/useWidgetSettings.ts` | Wijzigen | `widget_style` in interface |
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Wijzigen | Widget stijl selector in Weergave card |

---

## Niet in deze ronde

- TicketSelectStep.tsx (Ronde 2: visuele redesign)
- Kalender NL locale (Ronde 2)
- Tijdslot grid redesign (Ronde 2)
- Formulier redesign (Ronde 2)
- Bevestiging animatie (Ronde 2)
- Skeleton loading states (Ronde 3)
- Micro-interacties (Ronde 3)
