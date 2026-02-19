

# Fase 4.10 — Stap 1: Database Migratie

## Wat er gebeurt

Een enkele database migratie die twee dingen doet:

1. **`widget_settings` tabel aanmaken** -- configuratie voor de publieke bookingwidget per locatie
2. **`reservations.tags` kolom toevoegen** -- opslag voor booking questions met `target: "reservation_tags"`

Geen UI, geen Edge Functions, geen frontend wijzigingen in deze stap.

---

## 1. Nieuwe tabel: widget_settings

| Kolom | Type | Default | Nullable |
|-------|------|---------|----------|
| id | UUID PK | gen_random_uuid() | Nee |
| location_id | UUID UNIQUE FK | -- | Nee |
| widget_enabled | boolean | false | Nee |
| location_slug | text UNIQUE | -- | Ja |
| widget_primary_color | text | '#10B981' | Nee |
| widget_logo_url | text | -- | Ja |
| widget_welcome_text | text | -- | Ja |
| widget_success_redirect_url | text | -- | Ja |
| unavailable_text | text | 'vol' | Nee |
| show_end_time | boolean | true | Nee |
| show_nesto_branding | boolean | true | Nee |
| booking_questions | jsonb | '[]' | Nee |
| google_reserve_url | text | -- | Ja |
| created_at | timestamptz | now() | Nee |
| updated_at | timestamptz | now() | Nee |

### Validation triggers (geen CHECK constraints)

- **Slug format**: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (of NULL)
- **unavailable_text**: moet in ('vol', 'walk_in_only', 'bel_ons')

### RLS policies

- SELECT: `user_has_location_access(auth.uid(), location_id)` -- operators kunnen lezen
- INSERT: `user_has_role_in_location(auth.uid(), location_id, '{owner, manager}')` -- alleen owner/manager
- UPDATE: zelfde als INSERT
- DELETE: zelfde als INSERT

Geen publieke SELECT policy nodig -- de Edge Function (stap 2, later) gebruikt `service_role`.

### updated_at trigger

Conform bestaand patroon (`update_*_updated_at`).

---

## 2. Reservations tags kolom

```text
ALTER TABLE reservations ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
```

Dit maakt het mogelijk om booking questions met `target: "reservation_tags"` op te slaan op de reservering zelf, terwijl `target: "customer_tags"` naar de bestaande `customers.tags` kolom gaat.

---

## Booking questions target-mapping (voor referentie)

```text
booking_questions: [
  {
    "id": "allergies",
    "type": "multi_select",
    "label": "Allergieen of dieetwensen",
    "target": "customer_tags",      --> opslaan in customers.tags
    "options": [...]
  },
  {
    "id": "occasion",
    "type": "single_select",
    "label": "Gelegenheid",
    "target": "reservation_tags",   --> opslaan in reservations.tags
    "options": [...]
  }
]
```

---

## Verificatie na migratie

- `widget_settings` tabel bestaat met alle kolommen
- `reservations.tags` kolom bestaat met default `'[]'::jsonb`
- Validation triggers werken (ongeldige slug of unavailable_text wordt geweigerd)
- RLS policies correct: operator kan lezen, owner/manager kan schrijven
- Bestaande reserveringen krijgen automatisch `tags = '[]'`

---

## Wat NIET in deze stap zit

- Edge Functions (stap 2 + 3)
- Frontend componenten (stap 4-7)
- Routes in App.tsx (stap 8)
- Performance targets en SEO (genoteerd, komt later)

