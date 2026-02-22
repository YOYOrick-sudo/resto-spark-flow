
# Sessie 2.2 — Content Kalender

## Samenvatting

Een volledige content kalender pagina op `/marketing/kalender` met maand- en weekweergave, dag-panel via NestoPanel, quick-create formulier voor social posts, Nederlandse feestdagen, rechter sidebar met quick stats, en een slim overflow patroon (max 3 dots + "+N") voor drukke dagen.

---

## Architectuur

Geen database wijzigingen nodig. De `marketing_social_posts` tabel uit sessie 2.1 heeft alle kolommen (platform, status, scheduled_at, content_text, hashtags, media_urls, is_recurring, recurrence_rule, content_type_tag).

### Layout

```text
+-----------------------------------------------------------+
| PageHeader: "Kalender"   [Maand|Week]   [< Februari >]    |
+-----------------------------------------------------------+
| Kalender Grid (flex-1)              | Sidebar (w-72)       |
| 7 kolommen x 5-6 rijen             | Quick stats           |
| Platform dots (max 3 + "+N")        | Content ideeen        |
| Click dag -> NestoPanel rechts      | Weekplan              |
+-----------------------------------------------------------+
```

---

## Stap 1: Navigatie + Route

### `src/lib/navigation.ts`
- Nieuw subItem in marketing groep: `{ id: 'marketing-kalender', label: 'Kalender', path: '/marketing/kalender' }`
- Nieuwe ROUTE_MAP entry: `'marketing-kalender': '/marketing/kalender'`

### `src/App.tsx`
- Import + route: `<Route path="/marketing/kalender" element={<ContentCalendarPage />} />`

---

## Stap 2: Data hook

### `src/hooks/useMarketingSocialPosts.ts` (nieuw)

- `useMarketingSocialPosts(month: Date)` -- SELECT posts WHERE location_id AND scheduled_at within month range
- `useCreateSocialPost()` -- INSERT mutation
- `useUpdateSocialPost()` -- UPDATE mutation (voor drag-and-drop)
- `useDeleteSocialPost()` -- DELETE mutation
- Posts gegroepeerd per dag via helper `groupPostsByDay(posts, month)`
- Query key: `['marketing-social-posts', locationId, year, month]`

---

## Stap 3: Nederlandse feestdagen

### `src/lib/dutchHolidays.ts` (nieuw)

- Vaste feestdagen: Nieuwjaar, Koningsdag, Bevrijdingsdag (lustrumjaren), Kerst 1e+2e
- Berekende feestdagen (Pasen-gebaseerd): Goede Vrijdag, 1e+2e Paasdag, Hemelvaart, 1e+2e Pinksterdag
- Pasen-berekening via Gauss/Meeus algoritme (geen dependency)
- Export: `getHolidaysForMonth(year, month): { date: Date; name: string }[]`
- Export: `getHolidayForDate(date: Date): string | null` (voor dag-cel lookup)

---

## Stap 4: Kalender pagina

### `src/pages/marketing/ContentCalendarPage.tsx` (nieuw)

**PageHeader:**
- Titel "Kalender"
- View toggle rechts: Maand / Week (Patroon 1 toggle buttons: `bg-primary/10 text-primary border border-primary/20 shadow-sm`)
- Maandnavigatie: `ChevronLeft` / `ChevronRight` + maand/jaar label

**Body:** `flex gap-6` met grid (flex-1) en sidebar (w-72 shrink-0)

---

## Stap 5: Kalender componenten

### `src/components/marketing/calendar/CalendarGrid.tsx` (nieuw)

**Maand-view:**
- CSS Grid 7 kolommen, `grid-cols-7`
- Dag headers: Ma Di Wo Do Vr Za Zo (`text-xs text-muted-foreground uppercase`)
- Per dag-cel (`DayCell` component):
  - Dagnummer (muted voor outside-month)
  - Feestdag label (`text-[10px] text-primary truncate`)
  - Platform dots: gekleurde bolletjes (h-2 w-2 rounded-full)
    - Instagram: `bg-[#E1306C]`
    - Facebook: `bg-[#1877F2]`
    - Google Business: `bg-[#34A853]`
  - **Overflow patroon:** max 3 dots getoond. Als meer: `+N` badge (`text-[10px] text-muted-foreground bg-muted rounded-full px-1`)
  - Herhaal-icoon (Repeat, h-3 w-3 text-muted-foreground) als recurring post
  - Vandaag: `ring-1 ring-primary rounded-lg`
  - Hover: `hover:bg-accent/30 transition-colors duration-150`
  - Click: opent DayPanel
- Dag-cel is droppable target voor drag-and-drop

### `src/components/marketing/calendar/DayCell.tsx` (nieuw)

Individuele cel. Ontvangt: date, posts[], holiday, isToday, isCurrentMonth, onClick, drag-drop props.

### `src/components/marketing/calendar/WeekView.tsx` (nieuw)

- 7 kolommen met dagnaam + datum header
- Posts als mini-cards: NestoCard variant="small" nested met:
  - Links: platform kleur stripe (w-1 rounded-full, absolute left-0)
  - Caption preview (truncate, text-sm)
  - Tijd (text-xs text-muted-foreground tabular-nums)
  - Status badge (NestoBadge, compact)
- Leeg-state per dag: subtiele dashed border zone

---

## Stap 6: Dag-panel

### `src/components/marketing/calendar/DayPanel.tsx` (nieuw)

Gebruikt `NestoPanel` (w-[460px], reveal header).

**Content:**
- Titel: "Dinsdag 27 februari" (Nederlandse dag/maand via date-fns nl locale)
- Feestdag badge als van toepassing (NestoBadge variant="default")
- Posts lijst:
  - Per post: platform icoon + naam, caption preview (2 regels max), tijd, status badge
  - Click op post: inline expand met volledige tekst + edit/delete acties
- Divider (`border-t border-border/50 pt-4 mt-4`)
- "Nieuw bericht" NestoButton variant="outline" met Plus icoon
  - Toggle: toont/verbergt QuickCreatePost inline

---

## Stap 7: Quick-create formulier

### `src/components/marketing/calendar/QuickCreatePost.tsx` (nieuw)

Inline in DayPanel (geen aparte modal):

- **Platform multi-select:** Checkboxes met platform iconen
  - Alleen gekoppelde accounts actief (query `marketing_social_accounts` via bestaande hook)
  - Niet-gekoppelde: disabled + tooltip "Koppel eerst in Instellingen"
- **Caption textarea:** `NestoInput` als textarea met live character counter
  - Counter toont laagste limiet van geselecteerde platforms (IG: 2200, FB: 63206, Google: 1500)
  - Counter kleurt rood bij overschrijding
- **Hashtags input:** Tekstveld, auto-format met `#`
- **Tijd picker:** Twee NestoSelect dropdowns (uur 00-23, minuut 00/15/30/45), default 12:00
- **Content type tag:** NestoSelect (food_shot, behind_the_scenes, team, ambiance, seasonal, promo)
- **Media upload:** Placeholder dashed zone -- "Media upload beschikbaar in Sprint 3"
- **Submit:** NestoButton primary "Inplannen"
  - INSERT `marketing_social_posts` met status `'scheduled'`, scheduled_at = gekozen datum+tijd
  - `nestoToast.success('Bericht ingepland voor {tijd}')`
  - Reset formulier, invalidate posts query

---

## Stap 8: Rechter sidebar

### `src/components/marketing/calendar/CalendarSidebar.tsx` (nieuw)

Volgt SIDEBAR_PANELS.md: `w-72 bg-secondary border border-border rounded-card p-5 sticky top-6`

**Secties (gescheiden door `border-t border-border pt-4 mt-4`):**

1. **QUICK STATS** (uppercase, text-sm font-semibold)
   - Posts deze week: X
   - Posts volgende week: X
   - Ingepland totaal: X
   - Layout: label links muted, waarde rechts `font-semibold tabular-nums`

2. **CONTENT IDEEEN**
   - InfoAlert variant="info", title="Wordt slim in Sprint 3"
   - Description: "AI genereert hier content ideeen op basis van je menukaart en seizoen."

3. **WEEKPLAN**
   - InfoAlert variant="info", title="Beschikbaar na Instagram koppeling"
   - Description: "Je weekplanning met optimale posttijden."

---

## Stap 9: Drag-and-drop

Maand-view posts verslepen tussen dagen:

- `@dnd-kit/core` (al beschikbaar)
- `DndContext` in CalendarGrid
- Draggable: platform dots op DayCell
- Droppable: elke DayCell
- Bij drop: `useUpdateSocialPost` mutation -- update `scheduled_at` naar nieuwe dag (behoud tijd)
- Drag overlay: mini-card met platform kleur + caption preview
- Restrictie: alleen binnen weergegeven maand

---

## Stap 10: Barrel export

### `src/components/marketing/calendar/index.ts` (nieuw)

Export alle calendar componenten.

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/lib/navigation.ts` | Edit: marketing-kalender subitem + route map |
| `src/App.tsx` | Edit: route + import |
| `src/lib/dutchHolidays.ts` | Nieuw: feestdagen berekening |
| `src/hooks/useMarketingSocialPosts.ts` | Nieuw: CRUD hooks voor social posts |
| `src/pages/marketing/ContentCalendarPage.tsx` | Nieuw: hoofdpagina met layout |
| `src/components/marketing/calendar/CalendarGrid.tsx` | Nieuw: maand grid + DnD context |
| `src/components/marketing/calendar/DayCell.tsx` | Nieuw: individuele dag cel met overflow |
| `src/components/marketing/calendar/WeekView.tsx` | Nieuw: week weergave met post cards |
| `src/components/marketing/calendar/DayPanel.tsx` | Nieuw: NestoPanel dag detail |
| `src/components/marketing/calendar/QuickCreatePost.tsx` | Nieuw: inline post formulier |
| `src/components/marketing/calendar/CalendarSidebar.tsx` | Nieuw: rechter sidebar |
| `src/components/marketing/calendar/index.ts` | Nieuw: barrel export |

---

## Overflow patroon (jouw feedback)

Goed punt. Per dag-cel in maand-view:
- Toon max **3 platform dots**
- Als meer posts: toon `+N` pill (`text-[10px] text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5`)
- Feestdag label: altijd getoond (prioriteit boven dots bij ruimtegebrek)
- Herhaal-icoon: telt mee in de 3-dot limiet
- Alle posts zichtbaar in DayPanel bij click

---

## Design compliance

- Kalender cellen: flat grid met `divide` borders, geen card-in-card
- Shadow: alleen op post cards in week-view (NestoCard nested)
- Platform kleuren: Instagram #E1306C, Facebook #1877F2, Google #34A853
- Sidebar: SIDEBAR_PANELS.md compliant (bg-secondary, rounded-card, uppercase titles)
- Panel: NestoPanel met reveal header
- Toasts: nestoToast.success/error
- Toggle buttons: Patroon 1 (bg-primary/10 text-primary border border-primary/20 shadow-sm)
- Vandaag: ring-1 ring-primary
- Feestdagen: text-[10px] text-primary, geen badge (compact in cel)
- Dividers in panel/sidebar: border-t border-border/50 pt-4 mt-4

---

## Wat NIET in deze sessie

- Media upload naar storage (Sprint 3)
- AI content generatie (Sprint 3, sessie 3.3)
- Daadwerkelijk publiceren naar platforms
- Recurring post CRUD UI (alleen visuele indicator)
- Cross-month drag-and-drop
