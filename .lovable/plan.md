

# Sessie 1.2 — Marketing Settings UI

## Overzicht

Nieuwe pagina `/marketing/instellingen` met 5 tabs (Algemeen, Brand Kit, Email, Automation Flows, GDPR). Navigatie-uitbreiding, database migratie voor ontbrekende kolommen, en 4 data hooks.

## Database migratie

6 kolommen toevoegen aan `marketing_brand_kit`:

| Kolom | Type | Default |
|-------|------|---------|
| `gdpr_consent_text` | TEXT | NULL |
| `double_opt_in_enabled` | BOOLEAN NOT NULL | true |
| `marketing_sender_name` | TEXT | NULL |
| `marketing_reply_to` | TEXT | NULL |
| `max_email_frequency_days` | INTEGER NOT NULL | 7 |
| `default_send_time` | TIME NOT NULL | '10:00' |

## Navigatie

**`src/lib/navigation.ts`**
- Nieuw menu-item "Marketing" met `Megaphone` icon in sectie `OPERATIE` (na Reserveringen)
- Sub-item: "Instellingen" -> `/marketing/instellingen`
- ROUTE_MAP entry: `'marketing-instellingen': '/marketing/instellingen'`
- `getExpandedGroupFromPath`: case voor `/marketing`

**`src/App.tsx`**
- Route `/marketing/instellingen` -> `MarketingSettings` component

## Data hooks (4 nieuwe bestanden)

**`src/hooks/useMarketingBrandKit.ts`**
- `useMarketingBrandKit()` — query via `.maybeSingle()` op location_id
- `useUpdateMarketingBrandKit()` — upsert mutation met `onConflict: 'location_id'`
- Zelfde pattern als `useCommunicationSettings`

**`src/hooks/useMarketingFlows.ts`**
- `useMarketingFlows()` — query `marketing_automation_flows` voor locatie
- `useUpdateFlow(flowId)` — update is_active, trigger_config, template_id

**`src/hooks/useMarketingTemplates.ts`**
- `useMarketingTemplates(category?)` — query templates (location + platform-breed waar location_id IS NULL)

**`src/hooks/useMarketingGDPR.ts`**
- `useGDPRStats()` — count uit `marketing_contact_preferences` gegroepeerd op channel en opted_in status

## Logo upload

**`src/hooks/useMarketingLogoUpload.ts`**
- Hergebruikt pattern van `useLogoUpload` maar schrijft naar `marketing_brand_kit.logo_url`
- Pad: `{location_id}/marketing-logo.{ext}` in bucket `communication-assets`

## Pagina en tabs

**`src/pages/marketing/MarketingSettings.tsx`**
- `SettingsDetailLayout` met breadcrumbs: Instellingen > Marketing
- Permission gate: `marketing.view` voor toegang, `marketing.manage` voor edit
- 5 tabs via `NestoTabs`

### Tab 1: Algemeen (nieuw, eerste tab)
**`src/components/marketing/settings/AlgemeenTab.tsx`**

- **Marketing module status**: read-only indicator met NestoBadge (actief/inactief op basis van `useEntitlement('marketing')`)
- **Maximale email frequentie**: NestoSelect dropdown met opties:
  - 1 per 3 dagen / 1 per 5 dagen / 1 per 7 dagen (default) / 1 per 14 dagen
  - Opgeslagen als `max_email_frequency_days` INTEGER
- **Standaard verzendtijd**: time input (HH:MM), default 10:00
  - Opgeslagen als `default_send_time` TIME
- Autosave met debounce (800ms)

### Tab 2: Brand Kit
**`src/components/marketing/settings/BrandKitTab.tsx`**

- Logo upload via `useMarketingLogoUpload`
- 3 kleurenpickers (primary, secondary, accent) — zelfde color picker pattern als SettingsCommunicatie
- 2 font dropdowns (heading + body): Inter, Playfair Display, Lora, Merriweather, Montserrat, Open Sans, Poppins, Raleway, Roboto, Source Serif Pro
- Tone of voice: 4 radio buttons (formal/friendly/casual/playful) met beschrijving
- Tone beschrijving: textarea
- Default greeting + signature: 2 tekstvelden
- Social handles: 3 tekstvelden (Instagram, Facebook, TikTok)
- Autosave met debounce

### Tab 3: Email Instellingen
**`src/components/marketing/settings/EmailSettingsTab.tsx`**

- Marketing afzendernaam (eigen veld op brand_kit)
- Marketing reply-to email met validatie
- Read-only email footer preview (toont data uit `communication_settings`)
- Link naar `/instellingen/communicatie` voor gedeelde instellingen

### Tab 4: Automation Flows
**`src/components/marketing/settings/AutomationFlowsTab.tsx`**

- Lijst van flows uit `marketing_automation_flows`
- Per flow: naam, type badge, active/inactive Switch toggle
- Per flow: timing aanpassing (inline edit trigger_config.days/hours)
- Per flow: template dropdown (gefilterd op category)
- "Systeem" NestoBadge voor non-custom flows

### Tab 5: GDPR
**`src/components/marketing/settings/GDPRTab.tsx`**

- Consent tekst textarea (`gdpr_consent_text`)
- Double opt-in toggle (`double_opt_in_enabled`, default aan)
- Suppressielijst: read-only stats card met count per status
- Initieel "Nog geen data" — vult zich bij campagne gebruik

## Bestanden overzicht

| Bestand | Type | Doel |
|---------|------|------|
| DB migratie | SQL | 6 kolommen op marketing_brand_kit |
| `src/lib/navigation.ts` | Edit | Marketing menu-item |
| `src/App.tsx` | Edit | Route toevoegen |
| `src/hooks/useMarketingBrandKit.ts` | Nieuw | Brand kit CRUD |
| `src/hooks/useMarketingFlows.ts` | Nieuw | Automation flows |
| `src/hooks/useMarketingTemplates.ts` | Nieuw | Templates query |
| `src/hooks/useMarketingGDPR.ts` | Nieuw | GDPR stats |
| `src/hooks/useMarketingLogoUpload.ts` | Nieuw | Logo upload |
| `src/pages/marketing/MarketingSettings.tsx` | Nieuw | Hoofdpagina |
| `src/components/marketing/settings/AlgemeenTab.tsx` | Nieuw | Algemeen tab |
| `src/components/marketing/settings/BrandKitTab.tsx` | Nieuw | Brand Kit tab |
| `src/components/marketing/settings/EmailSettingsTab.tsx` | Nieuw | Email config |
| `src/components/marketing/settings/AutomationFlowsTab.tsx` | Nieuw | Flows lijst |
| `src/components/marketing/settings/GDPRTab.tsx` | Nieuw | GDPR settings |

## Design keuzes

- Social Accounts en Review Platforms tabs worden **niet** toegevoegd — komen in Sprint 2.1 en 3.2
- Email tab toont link naar communicatie-instellingen, geen duplicatie van data
- Algemeen tab bevat frequentie/timing die de automation engine in Sprint 1.5 nodig heeft
- Alle componenten gebruiken enterprise calm density (p-4 padding, NestoCard, bg-secondary/50 sections)
