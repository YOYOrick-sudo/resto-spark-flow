
# Fix: datum en tijd niet selecteerbaar in CreateReservationSheet

## Oorzaak

De `NestoPanel` op desktop rendert als een custom `div` met `z-[70]` en een backdrop overlay ook op `z-[70]`. De datumpicker (Calendar in een Popover) en het tijdslot (Select) gebruiken Radix UI Portal-componenten die **buiten de panel DOM** renderen — standaard op `z-50`. Ze verschijnen daarmee:

- **achter de backdrop overlay** (`z-[70]`)
- of worden geblokkeerd door de panel's eigen stacking context

Gevolg: de dropdowns openen wel (of lijken te openen), maar klikken erop werkt niet of ze zijn onzichtbaar.

## Oplossing

Twee kleine maar gerichte fixes:

### 1. PopoverContent z-index verhogen (datum)

In `src/components/reservations/CreateReservationSheet.tsx`, de `PopoverContent` voor de kalender krijgt een expliciete hogere z-index mee:

```tsx
<PopoverContent className="w-auto p-0 z-[80]" align="start">
```

### 2. SelectContent z-index verhogen (tijdslot)

De `SelectContent` voor het tijdslot (en alle andere Selects in de sheet) krijgt ook `z-[80]`:

```tsx
<SelectContent className="z-[80]">
```

Dit geldt voor alle Select-dropdowns in de details-stap: Tijdslot, Ticket, Kanaal, Status, Tafelmodus.

### 3. pointer-events-auto bevestigen op Calendar

De Calendar heeft al `className="p-3 pointer-events-auto"` — dat is correct. Geen wijziging nodig.

---

## Technisch overzicht

Alleen z-index aanpassingen op de portals in `CreateReservationSheet.tsx`. Geen logica, geen nieuwe componenten, geen database.

```text
src/components/reservations/CreateReservationSheet.tsx
  - PopoverContent (datum kalender): + className="w-auto p-0 z-[80]"
  - SelectContent (tijdslot, ticket, kanaal, status, tafelmodus): + className="z-[80]"
```

Alle portals (Popover en Select) krijgen `z-[80]` — één stap boven de panel/backdrop `z-[70]`, zodat ze altijd bovenaan renderen en klikbaar zijn.
