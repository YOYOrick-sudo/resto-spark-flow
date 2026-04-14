

# NestoDatePicker — Systeem-eigen datumpicker

## Probleem

De app gebruikt op ~8 plekken `<Input type="date" />` (native browser datepicker). Dit geeft een inconsistente, lelijke UI die per browser verschilt (zie screenshot). Er bestaat wel een ShadCN `Calendar` component en die wordt al op 2 plekken correct gebruikt (ShiftExceptionModal, ScheduleStep) met Popover + Nederlandse locale. Maar er is geen herbruikbare wrapper — elke plek implementeert het zelf.

## Oplossing

Maak een `NestoDatePicker` component in het Polar design system die overal herbruikt kan worden, en vervang alle `type="date"` inputs.

## Component: `src/components/polar/NestoDatePicker.tsx`

- Popover + Calendar (ShadCN) wrapper
- Props: `value: Date | undefined`, `onChange: (date: Date | undefined) => void`, `label?: string`, `placeholder?: string`, `disabled?: boolean`, `className?: string`, `minDate?: Date`, `maxDate?: Date`
- Nederlandse locale (`date-fns/locale/nl`)
- Trigger: NestoButton outline met CalendarIcon + geformatteerde datum ("d MMMM yyyy")
- Minimale hoogte 44px (touch-first)
- Export toevoegen aan `src/components/polar/index.ts`

## Vervangingen (8 plekken)

| Bestand | Huidige code |
|---|---|
| `src/components/inkoop/OrderhistorieTab.tsx` | 2x `<Input type="date">` (dateFrom, dateTo) |
| `src/components/inkoop/FactuurDetailPanel.tsx` | 1x `<Input type="date">` (factuurdatum) |
| `src/components/inkoop/WasteOverzicht.tsx` | 2x `<Input type="date">` (date range) |
| `src/pages/ManageReservation.tsx` | 1x `<input type="date">` |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | 1x `<input type="date">` |
| `src/components/interne-bestellingen/NieuweAanvraagPanel.tsx` | 1x `<Input type="date">` |

Elke vervanging converteert van string (`yyyy-MM-dd`) naar `Date` object en vice versa, met `onBlur` bewaard waar nodig.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/components/polar/NestoDatePicker.tsx` | Nieuw |
| `src/components/polar/index.ts` | Export toevoegen |
| 6 bestanden hierboven | `type="date"` → `NestoDatePicker` |

