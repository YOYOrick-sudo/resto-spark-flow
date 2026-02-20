

# Widget Flow Omdraaien: Datum-first in plaats van Ticket-first

## Waarom

De huidige volgorde (Ticket > Datum > Tijd > Gegevens) creëert teleurstelling: een gast kiest "Chef's Table", ontdekt dat het vol is, en moet terug. De Guestplan-aanpak is psychologisch beter: eerst wanneer en hoeveel gasten, dan wat er beschikbaar is.

## Nieuwe volgorde

```text
Oud:   Ticket (1) → Datum+Gasten (2) → Tijd (3) → Gegevens (4) → Bevestiging (5)
Nieuw: Datum+Gasten (1) → Tijd (2) → Ticket (3) → Gegevens (4) → Bevestiging (5)
```

## Wijzigingen per bestand

### 1. `src/components/widget-mockups/mockData.ts`
- Toevoegen: `TICKET_AVAILABILITY` map die per tijdslot aangeeft welke tickets beschikbaar zijn
- Bijv. om 19:30 is alleen "diner" beschikbaar, om 17:00 zijn alle drie beschikbaar
- Dit simuleert de filtering die in productie door de availability engine gebeurt

### 2. `src/components/widget-mockups/MockWidgetA.tsx`
- **Step 1** wordt Datum+Gasten (was step 2)
- **Step 2** wordt Tijd (was step 3)
- **Step 3** wordt Ticket kiezen -- met filtering op basis van `selectedTime`
  - Tickets die niet beschikbaar zijn voor het gekozen tijdslot worden grijs/disabled getoond met "Niet beschikbaar" label
  - Als maar 1 ticket beschikbaar is: auto-select en skip naar step 4
- **Step 4** blijft Gegevens
- **Step 5** blijft Bevestiging
- `canNext()` logica updaten: step 1 checkt datum, step 2 checkt tijd, step 3 checkt ticket
- Ambient background verschijnt nu pas vanaf step 3 (wanneer ticket gekozen wordt)
- Progress dots blijven 4 stappen

### 3. `src/components/widget-mockups/MockWidgetB.tsx`
- Zelfde flow-wijziging als Mockup A
- **stepLabels** array updaten van `['Ervaring', 'Datum', 'Tijd', 'Gegevens']` naar `['Datum', 'Tijd', 'Ervaring', 'Gegevens']`
- Step nummering en content herschikken
- Dezelfde ticket-filtering en auto-skip logica
- Stepper visueel toont de nieuwe volgorde

### Auto-skip logica (beide mockups)
Wanneer de gast een tijd kiest en er is maar 1 ticket beschikbaar voor dat tijdslot:
- Ticket wordt automatisch geselecteerd
- Flow springt direct van step 2 naar step 4 (gegevens)
- Stap 3 wordt overgeslagen -- de gast hoeft geen keuze te maken die er niet is

### Ticket-filtering visueel (step 3)
- Beschikbare tickets: normaal klikbaar, zoals nu
- Niet-beschikbare tickets: `opacity-50`, niet klikbaar, met een klein "Niet beschikbaar om [tijd]" label
- Header wijzigt naar "Beschikbaar voor jouw selectie" (Guestplan-stijl)

