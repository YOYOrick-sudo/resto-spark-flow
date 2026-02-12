

# ConfigStep Redesign: Tabs in plaats van Scroll

## Probleem

De configuratie-stap toont 7 secties (Tafeltijd, Groepsgrootte, Pacing, Seating, Gebieden, Squeeze, Weergave) in een lange verticale lijst. Je moet scrollen om alles te zien, wat onoverzichtelijk voelt en niet enterprise-waardig is.

## Oplossing: Interne tabs per ticket

De 7 secties worden gegroepeerd in **3 tabs** binnen elk ticket-panel. Zo past alles zonder scrollen in het zichtbare gebied.

```text
Ticket "Reservering"
  [Basis]  [Capaciteit]  [Geavanceerd]
  ─────────────────────────────────────
  Tafeltijd & buffer     (alleen bij Basis)
  Groepsgrootte          (alleen bij Basis)
```

### Tab-indeling

| Tab | Secties | Waarom samen |
|-----|---------|--------------|
| **Basis** | Tafeltijd & buffer, Groepsgrootte | Meest aangepaste velden, altijd relevant |
| **Capaciteit** | Pacing, Seating limieten, Gebieden | Allemaal over hoeveel gasten/waar |
| **Geavanceerd** | Squeeze, Weergave | Optionele power-user instellingen |

### Extra verbeteringen

1. **1 ticket = geen collapsible**: Als er maar 1 ticket geselecteerd is, wordt het ticket-panel direct getoond zonder de klik-om-te-openen wrapper. Minder nesting = cleaner.

2. **Compactere tabs**: Gebruik een kleinere tab-variant (text-[13px], gap-4, pb-2) zodat het past binnen het ticket-panel zonder te dominant te zijn.

3. **Pacing interval referentie**: Bij de pacing sectie wordt het gekozen arrival interval uit stap 1 getoond als context-tekst: "Per slot van X minuten" (waar X het interval is).

## Technische wijzigingen

### Bestand: `src/components/settings/shifts/ShiftWizard/steps/ConfigStep.tsx`

**TicketConfigPanel** wordt herschreven:
- Nieuwe state: `activeTab` ("basis" | "capaciteit" | "geavanceerd")
- Tabs renderen met een compacte inline tab-bar (geen NestoTabs component, want die heeft border-bottom en is te groot voor nested gebruik)
- Elke tab toont alleen zijn eigen 2-3 secties
- Bij 1 ticket: skip de Collapsible wrapper, render direct de tab-content

**ConfigStep** wrapper:
- Check `activeTickets.length === 1` om de collapsible te skippen
- Arrival interval uit context (`useShiftWizard`) doorpipen naar pacing sectie

### Wat NIET verandert

- ShiftWizardContext, Footer, Sidebar, ShiftWizard.tsx -- intact
- Alle velden en overrides -- exact dezelfde functionaliteit
- Andere wizard steps -- geen wijzigingen
- De `bg-secondary/50 rounded-card p-4` grouping per sectie blijft binnen elke tab
