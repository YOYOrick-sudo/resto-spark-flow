

# Fix NestoDatePicker — minimalistisch inline gedrag

## Probleem
De NestoDatePicker wrapper div heeft `w-full` waardoor het altijd de volle breedte pakt en filters onder elkaar staan in plaats van naast elkaar (zie screenshot).

## Oplossing

### 1. `NestoDatePicker.tsx` — wrapper fix
- Verwijder `w-full` van de buitenste `<div>` (regel 61)
- Verplaats `className` prop naar de buitenste div in plaats van de button, zodat `w-40` etc. op de container werkt
- Button krijgt gewoon `w-full` om binnen de container te vullen

### 2. `ScheduleStep.tsx` — migreren naar NestoDatePicker
- Vervang de handmatige Popover+Calendar implementatie door `<NestoDatePicker>`, consistent met de rest van het systeem

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/polar/NestoDatePicker.tsx` | `w-full` verwijderen van wrapper, className naar wrapper |
| `src/components/marketing/campaigns/ScheduleStep.tsx` | Raw Calendar → NestoDatePicker |

