

# "Nog X plekken" indicator op TimeTicketStep

## Wat verandert

Per shift wordt het aantal `available: true` + `slot_type: 'normal'` slots geteld. Als dat aantal **3 of minder** is, krijgt elk van die normale slots een subtiel label "Nog X plekken" (of "Nog 1 plek") eronder.

## Logica

```text
Per shift:
  normalSlotsLeft = shift.slots.filter(s => s.available && s.slot_type !== 'squeeze').length

  Per slot-button:
    if normalSlotsLeft <= 3 AND slot.slot_type !== 'squeeze':
      toon "Nog {normalSlotsLeft} plek(ken)"
```

- Het getal is per shift, niet per individueel slot -- want de engine geeft beschikbaarheid per shift
- Squeeze slots krijgen het label niet (die bestaan juist omdat het vol is)
- Tekst: "Nog 1 plek" (enkelvoud) vs "Nog 2 plekken" / "Nog 3 plekken"

## Visueel

```text
  +-------------+
  |   [clock]   |
  |    18:00    |
  | Nog 2 plekken|  <- text-[10px] text-orange-600 font-medium
  +-------------+
```

- Styling: `text-[10px] font-medium` met kleur `text-orange-600` (niet-selected) / `opacity-80` (selected, want witte tekst op gekleurde achtergrond)
- Positie: onder de tijd, boven eventuele "kortere zittijd" of eindtijd labels

## Wijziging

Alleen **1 bestand**: `src/components/booking/TimeTicketStep.tsx`

### Technische details

In de shift-map loop (regel 82-124), voor elke shift:

```tsx
const normalAvailableCount = shift.slots.filter(
  s => s.available && s.slot_type !== 'squeeze'
).length;
const showScarcity = normalAvailableCount <= 3;
```

In de slot-button (rond regel 111), een nieuw label toevoegen:

```tsx
{showScarcity && slot.slot_type !== 'squeeze' && (
  <span
    className="text-[10px] font-medium"
    style={{ color: selected ? 'rgba(255,255,255,0.8)' : '#ea580c' }}
  >
    Nog {normalAvailableCount} {normalAvailableCount === 1 ? 'plek' : 'plekken'}
  </span>
)}
```

Geen nieuwe dependencies, geen backend wijzigingen. Puur frontend op bestaande data.

