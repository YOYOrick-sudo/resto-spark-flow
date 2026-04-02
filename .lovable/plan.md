

# Footer Redesign — Notities inline + horizontaal verdeeld

## Probleem
Alles staat links geplakt. Notities zitten achter een klik verborgen — je ziet niet of er een notitie is tenzij je op de knop klikt.

## Oplossing

Footer wordt `justify-between`: links de notitie, rechts de stats + density toggle.

```text
┌──────────────────────────────────────────────────────────────────┐
│  📝 "Vanavond 2 VIP gasten, tafel 8 vrij houden"  [✏️]    4 gasten | 0 wachtend | 🟢 Open | ≡ ☰ │
└──────────────────────────────────────────────────────────────────┘
```

**Links**: Dag-notitie tekst inline zichtbaar (truncated op 1 regel, `truncate max-w-md`). Als er geen notitie is: klikbare placeholder "Notitie toevoegen…" in muted tekst. Klik opent nog steeds de popover om te bewerken.

**Rechts**: Stats (gasten, wachtend), status (Open/Gesloten), density toggle — zoals nu maar met `ml-auto`.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/Reserveringen.tsx` | Footer container `justify-between`, linker/rechter groep |
| `src/components/reserveringen/DayNotePopover.tsx` | Toon `note.content` inline als tekst (truncated), klik opent popover. Verwijder knop-stijl, wordt inline tekst element |
| `src/components/reserveringen/ReservationFooter.tsx` | Geen `flex-1`, wordt rechter blok |

