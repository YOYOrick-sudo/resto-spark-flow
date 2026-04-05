

# OverviewTab — Definitief ontwerp

## Wat verandert

De huidige OverviewTab heeft headers ("Vandaag geregeld"), een compact stats blok (iconen + tellingen), en NestoCard wrappers rond urgente items. Dit wordt vervangen door een minimalistisch design: alleen kaarten (als er iets is) en een kale log.

## Wijzigingen per bestand

### 1. `src/hooks/useAssistentLog.ts`

**Tijdvenster uitbreiden**: Query niet alleen vandaag maar laatste 24 uur (yesterday midnight). Voeg `isToday` boolean toe aan LogEntry zodat de component dag-scheiders kan renderen.

**Begroeting zonder activiteit**: Hook retourneert ook `hasActivityToday` flag zodat OverviewTab kan kiezen tussen "Alles loopt" en "De dag begint net".

**Stats blok verwijderen**: De `stats` return value wordt verwijderd — niet meer nodig.

### 2. `src/components/assistant/OverviewTab.tsx` — volledig herschrijven

**Weg:**
- `<h3>Vandaag geregeld</h3>` header
- Compact stats blok (berichten/reserveringen/reminders iconen)
- NestoCard wrapper rond urgente items
- EmptyState component
- Alle lucide iconen behalve Check/X

**Nieuw:**

**Begroeting** — zelfde logica maar aangepaste teksten:
- 0 urgent + activiteit: "Alles loopt. Lekker zo!"
- 0 urgent + geen activiteit: "De dag begint net. Ik hou het in de gaten."
- 1 urgent: "1 dingetje voor je:"
- 2-3: "X dingetjes voor je:"
- 4+: "X zaken die aandacht nodig hebben:"

**Actie-kaarten** — geen NestoCard, eigen styling:
- Escalaties: `bg-warning/5 border border-warning/20 rounded-xl p-4`
- Goedkeuringsverzoeken: `bg-muted border border-border rounded-xl p-4`
- Signals: `bg-warning/5 border border-warning/20 rounded-xl p-4`
- Menselijke taal in de beschrijving (emoji prefix: 💬 escalatie, 📋 goedkeuring, ⚠️ systeem)
- Knoppen: `NestoButton size="sm"`, Goedkeuren = default, Afwijzen = outline
- Fade-out animatie bij approve/reject (CSS transition op opacity)

**Log** — kale lijst, geen wrapper:
- Per regel: `[timestamp w-12] [beschrijving] [✓] [✦]`
- `hover:bg-muted/50 rounded-lg` op hele regel
- Klikbaar → navigeert
- Dag-scheider tussen vandaag en gisteren: `text-xs text-muted-foreground` met "Gisteren"
- "Toon meer..." na 10 items (state toggle, laadt volgende 10)

**Geen activiteit vandaag**: Toon gisteren-items direct (geen EmptyState component)

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/assistant/OverviewTab.tsx` | Herschrijven: kaarten met eigen styling, kale log, dag-scheiders, "toon meer", geen headers/stats |
| `src/hooks/useAssistentLog.ts` | Tijdvenster → 24 uur, `isToday` per entry, `hasActivityToday` flag, verwijder `stats` return |

