

# Sessie 4.4 -- Final Polish + Kwaliteitstest (definitief)

## Samenvatting

Quality gate sessie: 5 technische fixes + gestructureerde testlijst + document updates. Geen nieuwe features.

---

## Deel 1: Toast Consistency

Vier bestanden gebruiken `import { toast } from 'sonner'` i.p.v. `nestoToast`:

| Bestand | Actie |
|---|---|
| `src/hooks/useReviews.ts` | `toast` -> `nestoToast` |
| `src/hooks/useCoachingTips.ts` | `toast` -> `nestoToast` |
| `src/components/marketing/settings/ReviewPlatformsTab.tsx` | `toast` -> `nestoToast` |
| `src/pages/marketing/ReviewsPage.tsx` | `toast` -> `nestoToast` |

---

## Deel 2: staleTime voor Marketing Queries

Voeg `staleTime: 5 * 60 * 1000` toe aan:

| Hook | Queries |
|---|---|
| `src/hooks/useMarketingDashboard.ts` | Alle 6 queries |
| `src/hooks/useBrandIntelligence.ts` | 1 query |
| `src/hooks/useReviews.ts` | useReviews, useReviewStats, useFeaturedReviews, useGoogleBusinessAccount |
| `src/hooks/useCoachingTips.ts` | useCoachingTips |

---

## Deel 3: Clipboard API Fallback

Nieuw: `src/lib/clipboard.ts` met `copyToClipboard()` functie (navigator.clipboard + textarea/execCommand fallback).

Integreren in:
- `src/pages/marketing/ReviewsPage.tsx`
- `src/components/marketing/settings/PopupSettingsTab.tsx`
- `src/components/settings/widget/EmbedCodePreview.tsx`
- `src/components/settings/tickets/TicketCard.tsx`

---

## Deel 4: Platform Kleuren Centraliseren

Nieuw: `src/lib/platformColors.ts` met `PLATFORM_COLORS` constante (instagram: #E1306C, facebook: #1877F2, google_business: #34A853).

Importeren in:
- `src/pages/marketing/SocialPostCreatorPage.tsx`
- `src/components/marketing/calendar/WeekView.tsx`
- `src/components/marketing/social/SocialPreviewPanel.tsx`
- `src/components/marketing/calendar/DayPanel.tsx`
- `src/pages/analytics/tabs/SocialAnalyticsTab.tsx`
- `src/components/marketing/calendar/QuickCreatePost.tsx`

---

## Deel 5: Gestructureerde Testlijst

Na de fixes, doorloop elk item en fix wat niet klopt.

### 5.1 NestoSelect _all Fix Verificatie
- [ ] Reviews pagina (`/marketing/reviews`) laadt zonder crash
- [ ] Alle drie filters (platform, rating, status) werken: selectie + terug naar "Alle"
- [ ] ContentSeriesManager NestoSelect dropdowns werken (frequentie, voorkeursdag)
- [ ] Andere pagina's met NestoSelect: geen crash bij lege-string opties

### 5.2 Email Flow
- [ ] Campaign builder: maak campagne aan met alle bloktypen (header, text, image, button, menu_item, reserve_button, review_quote)
- [ ] Verstuur of sla op als draft
- [ ] Check dat `content_html` correct wordt opgebouwd uit alle bloktypes in `handleConfirm()`
- [ ] Check dat `campaign_analytics` record wordt aangemaakt bij status 'sending'

### 5.3 Social Flow
- [ ] Social > Nieuw: selecteer Instagram + Facebook
- [ ] Klik "AI schrijven" -- check dat suggestie verschijnt per platform
- [ ] Pas caption handmatig aan -- check dat `ai_original_caption` wordt bewaard
- [ ] Check dat `operator_edited` correct is: `true` als caption verschilt van `ai_original_caption`
- [ ] Plan post in voor morgen -- check dat post verschijnt in Content Kalender

### 5.4 A/B Test Flow (Sprint 4.2)
- [ ] Social > Nieuw: schakel A/B test toggle in
- [ ] Genereer variant A en variant B content
- [ ] Sla op -- check dat 2 posts worden aangemaakt met gedeelde `ab_test_id`
- [ ] Social Posts overzicht: A/B badge is zichtbaar op beide posts
- [ ] Klik op A/B post -- check dat vergelijkings-Sheet opent met beide varianten

### 5.5 Review Flow
- [ ] Reviews pagina: open een review
- [ ] Check dat AI-gesuggereerd antwoord klaarstaat (als `ai_suggested_response` gevuld is)
- [ ] Pas suggestie aan en sla op
- [ ] Check: `operator_edited = true`, `response_text` bevat aangepaste tekst
- [ ] Check dat `ai_original_response` ongewijzigd blijft

### 5.6 Analytics Flow (Sprint 4.1)
- [ ] Analytics > Marketing tab: email metrics laden (of empty state als geen campagnes)
- [ ] Analytics > Social tab: platform reach chart rendert
- [ ] Analytics > Reviews tab: sentiment trend rendert
- [ ] Dashboard: Brand Intelligence card toont `learning_stage` (onboarding/learning/optimizing/mature)

### 5.7 Signal Flow
- [ ] Als review met rating <= 3 zonder response bestaat: check dat `marketing_negative_review` signal verschijnt in Assistent
- [ ] Trigger `evaluate-signals` edge function handmatig en check dat marketing signals correct worden aangemaakt/resolved

### 5.8 Onboarding Flow (Sprint 4.3)
- [ ] Navigeer naar `/marketing` als locatie GEEN `marketing_brand_kit` record heeft
- [ ] Wizard verschijnt (stap 1: welkom)
- [ ] Doorloop stap 2: tone of voice selecteren, primary color kiezen
- [ ] Stap 3: social accounts (overslaan of koppelen)
- [ ] Stap 4: klaar -- klik "Ga naar Dashboard"
- [ ] Dashboard verschijnt (wizard niet meer zichtbaar)
- [ ] Navigeer weg en terug -- wizard verschijnt NIET meer (brand_kit bestaat nu)

### 5.9 UGC Tab (Sprint 3.6)
- [ ] Social Posts pagina: UGC tab zichtbaar
- [ ] Klik op UGC tab -- geen crash als geen Instagram account gekoppeld
- [ ] Lege state met uitleg wordt getoond

### 5.10 Content Series (Sprint 3.6)
- [ ] Content Kalender pagina: klik op "..." menu rechtsboven in de PageHeader (MoreHorizontal icoon)
- [ ] Optie "Series beheren" is zichtbaar in het dropdown menu
- [ ] Klik "Series beheren" -- Sheet opent met ContentSeriesManager
- [ ] Maak een serie aan: naam, frequentie, voorkeursdag
- [ ] Serie verschijnt in de lijst met toggle en delete opties

### 5.11 Mobile Responsive (Sprint 4.3)
- [ ] Open elke marketing pagina op 375px breed: Dashboard, Social Post Creator, Content Kalender, Reviews, Social Posts, Analytics, Campagnes, Contacten, Segmenten
- [ ] Niets overlapt of wordt afgesneden
- [ ] Tabellen zijn horizontaal scrollbaar (overflow-x-auto)
- [ ] Modals/Sheets zijn full-screen op mobiel
- [ ] Campaign Builder toont "Desktop vereist" melding
- [ ] CalendarSidebar is verborgen op mobiel (hidden lg:block)

---

## Deel 6: Document Updates

### 6.1 docs/ROADMAP.md
Voeg onder "AFGEROND" toe:
```text
- Marketing Module Sprint 1 (1.1-1.9): Email + Campagnes + Segmenten + Contacten + Analytics
- Marketing Module Sprint 2 (2.1-2.6): Social + Kalender + Popup + Brand Intelligence basis
- Marketing Module Sprint 3 (3.1-3.6): Reviews + Brand Intelligence Engine + Coaching + Weekplan
- Marketing Module Sprint 4 (4.1-4.4): Analytics + A/B Testing + Mobile + Polish
```

### 6.2 docs/MARKETING_MODULE.md
Voeg onderaan een "Sprint Status" sectie toe:
```text
## Sprint Status

- Sprint 1 (1.1-1.9): AFGEROND -- Foundation + Email
- Sprint 2 (2.1-2.6): AFGEROND -- Social + Kalender + Popup
- Sprint 3 (3.1-3.6): AFGEROND -- Brand Intelligence + Reviews + Learning Cycle + Email Verrijking
- Sprint 3.5b: AFGEROND -- Review Response Learning + Google Reply fix
- Sprint 4 (4.1-4.4): AFGEROND -- Analytics + A/B Testing + Polish
```

### 6.3 NIET wijzigen
- `docs/AI_INFRASTRUCTURE.md` -- architectuurdocument, marketing AI staat al in `docs/AI_LEARNING_CYCLE.md`
- `AI_BUILD_GUIDE.md` / `AI_OVERVIEW.md` -- bestaan niet als bestanden in het project (zijn project knowledge uploads)

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/hooks/useReviews.ts` | Edit: toast -> nestoToast, staleTime |
| `src/hooks/useCoachingTips.ts` | Edit: toast -> nestoToast, staleTime |
| `src/hooks/useMarketingDashboard.ts` | Edit: staleTime |
| `src/hooks/useBrandIntelligence.ts` | Edit: staleTime |
| `src/components/marketing/settings/ReviewPlatformsTab.tsx` | Edit: toast -> nestoToast |
| `src/pages/marketing/ReviewsPage.tsx` | Edit: toast -> nestoToast, clipboard |
| `src/lib/clipboard.ts` | Nieuw |
| `src/lib/platformColors.ts` | Nieuw |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | Edit: platformColors import |
| `src/components/marketing/calendar/WeekView.tsx` | Edit: platformColors import |
| `src/components/marketing/social/SocialPreviewPanel.tsx` | Edit: platformColors import |
| `src/components/marketing/calendar/DayPanel.tsx` | Edit: platformColors import |
| `src/pages/analytics/tabs/SocialAnalyticsTab.tsx` | Edit: platformColors import |
| `src/components/marketing/calendar/QuickCreatePost.tsx` | Edit: platformColors import |
| `src/components/marketing/settings/PopupSettingsTab.tsx` | Edit: clipboard |
| `src/components/settings/widget/EmbedCodePreview.tsx` | Edit: clipboard |
| `src/components/settings/tickets/TicketCard.tsx` | Edit: clipboard |
| `docs/ROADMAP.md` | Edit: marketing sprint status |
| `docs/MARKETING_MODULE.md` | Edit: sprint status sectie |

## Volgorde van uitvoering
1. Technische fixes (Deel 1-4)
2. Testlijst doorlopen (Deel 5) -- bij problemen direct fixen
3. Document updates (Deel 6)

## Wat NIET wordt gewijzigd
- `dutchHolidays.ts` -- algoritmisch, werkt voor alle jaren
- `AVG_REVENUE_PER_GUEST` -- bewuste default
- Email from config -- al correct via env var + brand_kit
- Edge function error handling -- al correct
- `docs/AI_INFRASTRUCTURE.md` -- niet relevant voor marketing features

