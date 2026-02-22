
# Kalender Module — Enterprise Redesign + Feature Verbetering

## Wat verandert

De kalender wordt visueel opgewaardeerd naar enterprise niveau (Linear/Stripe kwaliteit) en twee features worden prominenter gemaakt: Series en content aanmaken.

---

## 1. ContentCalendarPage — Nieuwe header met "Vandaag" knop en "Nieuw bericht" CTA

**Huidige situatie:** Series zit verstopt in een "..." dropdown menu. Er is geen directe "maak bericht" knop.

**Wijzigingen:**
- Voeg een prominente **"+ Nieuw bericht"** NestoButton (primary) toe links in de header — navigeert naar `/marketing/social/nieuw`
- Voeg een **"Series"** NestoButton (outline) toe met Repeat icoon — opent direct de ContentSeriesManager
- Voeg een **"Vandaag"** knop toe naast de maandnavigatie — springt terug naar huidige maand
- Maandnaam: groter (`text-base font-semibold`) en bold
- Verwijder het "..." dropdown menu (niet meer nodig nu Series een eigen knop heeft)
- View toggle: actieve knop krijgt `bg-card shadow-sm` voor duidelijker contrast

---

## 2. CalendarGrid — Enterprise grid met NestoCard wrapper

**Huidige situatie:** Kale grid met dunne borders, geen visuele diepte.

**Wijzigingen:**
- Wrap het hele grid in een `NestoCard` (bg-card, shadow-card, rounded-card) — geeft diepte
- Dag headers: `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider` (zwevende headers volgens design guide)
- Grid borders: `border-border/40` (subtielere cellen)
- Verwijder `border-t border-l` van de grid container (NestoCard geeft al afbakening)

---

## 3. DayCell — Vandaag-cirkel en hover feedback

**Huidige situatie:** Vandaag heeft een `ring-1` die subtiel is. Geen hover-feedback behalve kleurverandering.

**Wijzigingen:**
- Vandaag: dagnummer in een `h-6 w-6 rounded-full bg-primary text-primary-foreground` cirkel (Google Calendar stijl)
- Verwijder `ring-1 ring-primary ring-inset` op vandaag-cel
- Hover: `hover:bg-accent/40` met `duration-150`
- Niet-huidige-maand: `opacity-30` (was 40)
- Platform dots: `h-2.5 w-2.5` (iets groter, beter zichtbaar)
- Overflow badge: `bg-muted rounded-md` (was rounded-full)
- Cel padding: `p-2` (was 1.5) voor meer lucht
- Min hoogte: `min-h-[90px]` (was 80px)

---

## 4. WeekView — Lichtere cards, geen dashed borders

**Huidige situatie:** NestoCard wrapper per post (te zwaar), dashed borders op lege dagen.

**Wijzigingen:**
- Elke dagkolom: `bg-card/50 rounded-xl border border-border/40` container
- Vandaag kolom: `border-primary/30` accent
- Lege dag: subtiele "Geen posts" tekst zonder border (verwijder dashed border)
- Post cards: vervang NestoCard door lichtere `bg-secondary/50 rounded-lg border border-border/40 p-2.5` met platform stripe — voorkomt card-in-card nesting (verboden per design guide)

---

## 5. CalendarSidebar — NestoCard styling

**Huidige situatie:** `bg-secondary border border-border rounded-xl` — voelt als een apart blok.

**Wijzigingen:**
- Verander naar `bg-card border border-border shadow-card rounded-card` — consistent met NestoCard
- Section headers: `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider` (zwevende headers)
- Sectie dividers: `border-border/50` (lichter)
- Stats nummers: `font-semibold` (was al goed, behouden)

---

## Technische details

| Bestand | Actie |
|---------|-------|
| `src/pages/marketing/ContentCalendarPage.tsx` | Edit: "+ Nieuw bericht" knop, "Series" knop, "Vandaag" knop, verbeterde toggle styling, verwijder dropdown |
| `src/components/marketing/calendar/CalendarGrid.tsx` | Edit: NestoCard wrapper, zwevende headers, subtielere borders |
| `src/components/marketing/calendar/DayCell.tsx` | Edit: vandaag-cirkel, hover, grotere dots, meer padding |
| `src/components/marketing/calendar/WeekView.tsx` | Edit: lichtere post cards, kolom containers, geen dashed borders |
| `src/components/marketing/calendar/CalendarSidebar.tsx` | Edit: bg-card styling, zwevende headers |

Geen nieuwe bestanden. Geen database wijzigingen. Puur visuele polish + UX verbeteringen.
