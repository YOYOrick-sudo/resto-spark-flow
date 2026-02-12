

# ShiftWizard Enterprise Polish + Info Tooltips + Popup Fix

## Probleem

De ShiftWizard configuratie-stap (stap 3) mist enterprise-kwaliteit op meerdere vlakken:

1. **Geen info tooltips** bij secties als Pacing, Squeeze, Seating Limieten
2. **Uppercase sectie-labels** (`PACING`, `SEATING LIMIETEN`) — voelt als een formulier, niet als enterprise software
3. **Geen visuele groepering** van secties (velden lopen in elkaar over)
4. **Raw HTML radio buttons** bij Gebieden (geen Radix-componenten)
5. **Popup verspringt** wanneer content-hoogte verandert (collapsibles openen, squeeze toggle) — door `translate-y-[-50%]` centering
6. **Geen scroll** in het content-area — bij meerdere tickets groeit de modal voorbij het scherm

## Oplossing

### 1. Popup verspringen fixen (ShiftWizard.tsx + dialog.tsx)

Het probleem is dat `DialogContent` verticaal gecentreerd wordt met `top-[50%] translate-y-[-50%]`. Wanneer de content-hoogte verandert (collapsible opent, squeeze velden verschijnen), herberekent de browser de positie en springt het venster.

**Fix:** De ShiftWizard dialog krijgt een vaste hoogte met intern scrollbaar content-area:

- `DialogContent` voor de wizard: verwijder centering, gebruik `top-[5vh]` met `translate-y-0`
- Wizard content-area (`flex-1 p-5`): wordt scrollbaar met `overflow-y-auto` en een `max-h` berekend op basis van viewport
- Header en footer blijven sticky (al het geval door flex layout)

Dit voorkomt dat de dialog herspringt bij content-veranderingen.

### 2. Enterprise Form Grouping in ConfigStep

Vervang de huidige platte layout door het bestaande Enterprise Form Grouping patroon:

Elke sectie (Tafeltijd & Buffer, Groepsgrootte, Pacing, etc.) wordt gewrapped in:

```text
bg-secondary/50 rounded-card p-4 space-y-3
```

Dit is consistent met hoe ShiftExceptionModal en BulkExceptionModal al werken.

### 3. Sectie-labels upgraden

Vervang de uppercase `Label` elementen door sentence-case headers met optionele FieldHelp:

**Van:**
```text
<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
  PACING
</Label>
```

**Naar:**
```text
<div className="flex items-center gap-1.5">
  <span className="text-[13px] font-medium text-foreground">Pacing</span>
  <FieldHelp>
    <p>Pacing bepaalt hoeveel gasten per tijdslot kunnen arriveren...</p>
  </FieldHelp>
</div>
```

### 4. Info tooltips toevoegen

Per sectie een FieldHelp met contextuele uitleg:

| Sectie | Tooltip tekst |
|--------|--------------|
| Tafeltijd & buffer | "Duur bepaalt hoe lang een tafel bezet is. Buffer is de opruimtijd tussen reserveringen." |
| Groepsgrootte | "Beperk het aantal gasten per reservering voor dit ticket in deze shift. Leeg = standaard van het ticket." |
| Pacing | "Pacing beperkt hoeveel gasten tegelijk kunnen arriveren per tijdslot. Dit voorkomt piekdrukte in de keuken." |
| Seating limieten | "Beperk het totaal aantal gasten of reserveringen dat tegelijk in de shift kan zitten." |
| Gebieden | "Kies in welke gebieden dit ticket beschikbaar is. Standaard: alle gebieden." |
| Squeeze | "Squeeze verkort de verblijfsduur bij hoge bezetting, zodat je extra reserveringen kunt plaatsen." |
| Weergave | "Bepaal welke informatie gasten zien in de boekingswidget." |

### 5. Raw HTML radio buttons vervangen

De Gebieden sectie gebruikt nu `<input type="radio">`. Vervang door Radix `RadioGroup` + `RadioGroupItem` voor consistentie met het design systeem.

### 6. Collapsible trigger verfijnen

De ticket-header in het collapsible panel krijgt een subtielere hover-state en een meer enterprise uitstraling:

- Achtergrond: `bg-secondary/30` in plaats van transparant
- Hover: `hover:bg-secondary/50`
- Open state: linker-border accent (`border-l-2 border-l-primary`)

## Bestanden die wijzigen

| Bestand | Actie |
|---------|-------|
| `src/components/settings/shifts/ShiftWizard/steps/ConfigStep.tsx` | Secties groeperen, labels upgraden, FieldHelp toevoegen, RadioGroup voor gebieden |
| `src/components/settings/shifts/ShiftWizard/ShiftWizard.tsx` | Scrollbaar content-area, vaste dialog hoogte |

## Wat NIET verandert

- ShiftWizardContext, Footer, Sidebar — blijven intact
- Alle andere wizard steps (Times, Tickets, Capacity, Review) — geen wijzigingen
- Bestaande functionaliteit en data-flow — puur visuele upgrade
- `dialog.tsx` base component — niet aanpassen, wizard-specifieke overrides via className

