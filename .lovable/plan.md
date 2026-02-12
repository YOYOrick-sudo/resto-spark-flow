

# Fix: ShiftWizard Scroll + Layout

## Probleem

De ShiftWizard dialog heeft `max-h-[90vh] flex flex-col` op de `DialogContent`, maar de binnenste wrapper (`div.flex.flex-col` op regel 203) mist `h-full` waardoor de flex layout chain breekt. Het content-area heeft `overflow-y-auto` maar krijgt geen hoogte-constraint van zijn parent, dus scroll werkt niet. De footer verdwijnt onder het scherm.

## Oorzaak

```text
DialogContent (max-h-[90vh] flex flex-col)       -- heeft hoogte
  └─ div (flex flex-col)                          -- MIST h-full/flex-1 + min-h-0
       ├─ Header (shrink-0)
       ├─ div (flex flex-1 min-h-0 overflow-hidden)
       │    ├─ Sidebar
       │    └─ Content (flex-1 overflow-y-auto)   -- scroll werkt niet want parent is onbegrensd
       └─ Footer (shrink-0)
```

## Fix

Eenvoudige one-line fix in `ShiftWizard.tsx`:

**Regel 203:** Verander `flex flex-col` naar `flex flex-col h-full min-h-0`

Dit zorgt dat:
- De binnenste wrapper de volledige hoogte van `DialogContent` pakt (`h-full`)
- Het content-area daadwerkelijk een bounded hoogte heeft en kan scrollen
- Header en footer sticky blijven (was al correct met flex layout)
- De dialog niet meer voorbij het scherm groeit

Daarnaast voeg `shrink-0` toe aan de header (regel 204) en footer wrapper om te voorkomen dat die mee-krimpen bij lange content.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/settings/shifts/ShiftWizard/ShiftWizard.tsx` | `h-full min-h-0` op outer wrapper + `shrink-0` op header |

