

# Sessie 2.6 — Website Popup & Sticky Bar

## Samenvatting

Embeddable email opt-in widgets (exit-intent popup, timed popup, sticky bar) voor de restaurant website. Bevat een nieuwe database tabel, twee publieke edge functions (config + subscribe), een embeddable JavaScript widget met Shadow DOM, en een settings tab in de marketing instellingen met live preview.

---

## Architectuur

```text
Restaurant Website              Edge Functions (publiek)            Database
+-----------------+             +-------------------------+         +---------------------+
| <script> tag    |  GET config | marketing-popup-config  | ------> | marketing_popup_    |
| widget.js       | ----------> | /[location-slug]        |         | config              |
|                 |             +-------------------------+         | marketing_brand_kit |
| Shadow DOM      |  POST sub   +-------------------------+         +---------------------+
| - popup/bar UI  | ----------> | marketing-popup-        | ------> | customers           |
|                 |             | subscribe               |         | marketing_contact_  |
+-----------------+             +-------------------------+         | preferences         |
                                                                    +---------------------+

Nesto Settings UI
+-----------------+
| Marketing       |
| Instellingen    |
| Tab: Popup      |
| - Toggles       |
| - Teksten       |
| - Live preview  |
| - Embed code    |
+-----------------+
```

---

## Stap 1: Database — marketing_popup_config

### SQL Migration

```sql
CREATE TABLE public.marketing_popup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Exit-intent popup (desktop only)
  exit_intent_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Timed popup (desktop + mobile)
  timed_popup_enabled BOOLEAN NOT NULL DEFAULT false,
  timed_popup_delay_seconds INTEGER NOT NULL DEFAULT 15,

  -- Sticky bar (desktop + mobile)
  sticky_bar_enabled BOOLEAN NOT NULL DEFAULT false,
  sticky_bar_position TEXT NOT NULL DEFAULT 'bottom',

  -- Content
  headline TEXT NOT NULL DEFAULT 'Mis geen enkele actie!',
  description TEXT NOT NULL DEFAULT 'Schrijf je in voor onze nieuwsbrief en ontvang exclusieve aanbiedingen.',
  button_text TEXT NOT NULL DEFAULT 'Aanmelden',
  success_message TEXT NOT NULL DEFAULT 'Bedankt voor je inschrijving!',
  gdpr_text TEXT NOT NULL DEFAULT 'Door je aan te melden ga je akkoord met onze privacy policy.',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT marketing_popup_config_location_unique UNIQUE (location_id)
);

-- RLS
ALTER TABLE public.marketing_popup_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY popup_config_select ON public.marketing_popup_config
  FOR SELECT USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY popup_config_insert ON public.marketing_popup_config
  FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY popup_config_update ON public.marketing_popup_config
  FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
```

---

## Stap 2: Edge Function — marketing-popup-config

### `supabase/functions/marketing-popup-config/index.ts` (nieuw)

**Publiek endpoint, geen auth.** Retourneert popup config + brand kit kleuren voor een location slug.

**Route:** `GET ?slug=[location-slug]`

**Flow:**
1. Parse `slug` uit query params
2. Lookup `locations` by slug (service role)
3. Fetch `marketing_popup_config` by `location_id`
4. Fetch `marketing_brand_kit` by `location_id` (logo_url, primary_color, secondary_color)
5. Return merged config JSON (zonder interne IDs)

**Response:**
```json
{
  "is_active": true,
  "exit_intent_enabled": true,
  "timed_popup_enabled": true,
  "timed_popup_delay_seconds": 15,
  "sticky_bar_enabled": true,
  "sticky_bar_position": "bottom",
  "headline": "Mis geen enkele actie!",
  "description": "Schrijf je in...",
  "button_text": "Aanmelden",
  "success_message": "Bedankt!",
  "gdpr_text": "Door je aan te melden...",
  "logo_url": "https://...",
  "primary_color": "#1d979e",
  "restaurant_name": "Restaurant X"
}
```

**Config.toml:**
```toml
[functions.marketing-popup-config]
verify_jwt = false
```

---

## Stap 3: Edge Function — marketing-popup-subscribe

### `supabase/functions/marketing-popup-subscribe/index.ts` (nieuw)

**Publiek endpoint, geen auth.** Verwerkt email opt-in submissions.

**Route:** `POST` met body `{ slug, email }`

**Flow:**
1. Valideer email (regex)
2. Lookup location by slug
3. Rate limiting: in-memory Map met IP+location als key, max 10 per uur. Bij overschrijding: 429
4. Upsert `customers` (email + location_id), get customer_id
5. Upsert `marketing_contact_preferences`:
   - `channel = 'email'`
   - `opted_in = true` (of `false` als double opt-in)
   - `consent_source = 'website_popup'`
   - `opted_in_at = now()`
6. Als `marketing_brand_kit.double_opt_in_enabled`: genereer token, stuur bevestigingsemail via Resend (hergebruik patroon van `marketing-confirm-optin`)
7. Return `{ success: true, double_opt_in: boolean }`

**Config.toml:**
```toml
[functions.marketing-popup-subscribe]
verify_jwt = false
```

---

## Stap 4: Embeddable Widget Script

### `supabase/functions/marketing-popup-widget/index.ts` (nieuw)

Edge function die het JavaScript widget script serveert. Dit is de `<script src="...">` die restaurant websites laden.

**Route:** `GET ?slug=[location-slug]`
**Response:** `Content-Type: application/javascript`

Het script:
1. Haalt config op via `marketing-popup-config?slug=...`
2. Als `is_active === false`: exit (geen widget)
3. Creëert een Shadow DOM container op de pagina
4. Rendert de actieve widget types:

**Exit-intent popup (desktop only):**
- `document.addEventListener('mouseout', ...)` detectie op `e.clientY <= 0`
- 1x per sessie: `sessionStorage.setItem('nesto_popup_exit_shown', '1')`
- Centered overlay met achtergrond dim
- Logo, headline, description, email input, submit knop, GDPR tekst

**Timed popup (desktop + mobile):**
- `setTimeout(() => show(), delay * 1000)`
- 1x per sessie: `sessionStorage.setItem('nesto_popup_timed_shown', '1')`
- Zelfde UI als exit-intent

**Sticky bar (desktop + mobile):**
- Vaste balk boven of onder (`position: fixed`)
- Compact: headline + email input + submit knop op 1 rij
- Dismiss knop (x), dismissed voor sessie: `sessionStorage.setItem('nesto_bar_dismissed', '1')`

**Alle widget types:**
- Shadow DOM (voorkomt CSS conflicten)
- Submit: POST naar `marketing-popup-subscribe`
- Success state: vervangt form met success_message + checkmark
- Kleuren: `primary_color` uit brand kit voor submit knop
- Logo: `logo_url` uit brand kit
- Responsive: popup past zich aan op mobiel (full-width, kleinere padding)

**Config.toml:**
```toml
[functions.marketing-popup-widget]
verify_jwt = false
```

---

## Stap 5: Settings Tab — Website Popup

### `src/components/marketing/settings/PopupSettingsTab.tsx` (nieuw)

Nieuwe tab component voor de Marketing instellingen pagina.

**Layout:** Volgt exact het patroon van bestaande tabs (AlgemeenTab, GDPRTab):
- `NestoCard className="p-6"` wrapper
- Auto-save via `useDebouncedCallback`
- "Opgeslagen" indicator (Check icon)

**Secties:**

1. **Master toggle** (bg-secondary/50 block):
   - Switch: `is_active`
   - Label: "Website Popup actief"
   - Beschrijving: "Schakel alle popup widgets in of uit op je website."

2. **Widget types** (bg-secondary/50 block, border-t dividers):
   - **Exit-intent popup:**
     - Switch: `exit_intent_enabled`
     - Label: "Exit-intent popup"
     - Beschrijving: "Toon een popup wanneer bezoekers de pagina dreigen te verlaten (alleen desktop)."
   - **Timed popup:**
     - Switch: `timed_popup_enabled`
     - Label: "Timed popup"
     - Beschrijving: "Toon een popup na een ingesteld aantal seconden."
     - Slider of NestoInput (type=number): `timed_popup_delay_seconds` (5-60, default 15)
     - Suffix: "seconden"
   - **Sticky bar:**
     - Switch: `sticky_bar_enabled`
     - Label: "Sticky bar"
     - Beschrijving: "Toon een vaste balk boven of onder de pagina."
     - NestoSelect: `sticky_bar_position` (opties: "Boven" / "Onder")

3. **Teksten** (bg-secondary/50 block):
   - Input: `headline` (label: "Koptekst")
   - Textarea: `description` (label: "Beschrijving")
   - Input: `button_text` (label: "Knoptekst")
   - Input: `success_message` (label: "Succesmelding")
   - Textarea: `gdpr_text` (label: "GDPR tekst")

4. **Live preview** (bg-secondary/50 block):
   - NestoOutlineButtonGroup met 3 opties: "Popup" / "Sticky bar"
   - Rendert een visuele preview van het geselecteerde type met de huidige teksten en brand kit kleuren
   - Preview container: `border border-border rounded-card bg-background p-4 min-h-[200px]`

5. **Embed code** (bg-secondary/50 block):
   - Read-only code block met kopieerknop (hergebruik patroon van `EmbedCodePreview`)
   - Code: `<script src="https://[supabase-url]/functions/v1/marketing-popup-widget?slug=[location-slug]"></script>`
   - Instructie: "Plak dit in de `<head>` van je website."

### `src/pages/marketing/MarketingSettings.tsx` (edit)

- Voeg `{ id: 'popup', label: 'Website Popup' }` toe aan TABS array (7e tab)
- Import en render `PopupSettingsTab` bij `activeTab === 'popup'`

---

## Stap 6: Hook — usePopupConfig

### `src/hooks/usePopupConfig.ts` (nieuw)

```typescript
// usePopupConfig() -> query marketing_popup_config by location_id
// useUpdatePopupConfig() -> upsert mutation with debounced save
```

Volgt exact het patroon van `useMarketingBrandKit` / `useUpdateMarketingBrandKit`.

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| SQL Migration | Nieuw: marketing_popup_config tabel + RLS |
| `supabase/functions/marketing-popup-config/index.ts` | Nieuw: publieke config endpoint |
| `supabase/functions/marketing-popup-subscribe/index.ts` | Nieuw: email subscribe endpoint |
| `supabase/functions/marketing-popup-widget/index.ts` | Nieuw: JS widget server |
| `supabase/config.toml` | Edit: 3 nieuwe function configs |
| `src/hooks/usePopupConfig.ts` | Nieuw: config CRUD hook |
| `src/components/marketing/settings/PopupSettingsTab.tsx` | Nieuw: settings tab |
| `src/pages/marketing/MarketingSettings.tsx` | Edit: nieuwe tab |

---

## Design compliance

- Settings tab: volgt exact AlgemeenTab/GDPRTab patroon (NestoCard p-6, bg-secondary/50 blocks, auto-save)
- Widget script: Shadow DOM isolatie, geen CSS leakage
- Popup UI: centered overlay, afgeronde hoeken (16px), brand kit primary_color voor knop
- Sticky bar: compact single-row layout, fixed positioning
- Embed code: hergebruikt `EmbedCodePreview` patroon (copy knop, read-only code block)
- Rate limiting: 10 submits per IP per uur (in-memory counter in edge function)
- Session tracking: `sessionStorage` voor 1x per sessie logica

---

## Wat NIET in deze sessie

- A/B testing van popup varianten
- Popup analytics (impression count, conversion rate)
- Custom CSS theming voor de popup
- Multi-step signup flows
- Exit-intent op mobiel (technisch niet betrouwbaar)

