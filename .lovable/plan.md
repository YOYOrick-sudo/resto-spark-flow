
# 1. Dag-notities + 2. Wachtlijst integratie

## 1. Dag-notities

### Huidige staat
De "Notities" knop in de footer (`ReservationFooter.tsx`) doet niets — `onNotesClick` wordt niet doorgegeven vanuit `Reserveringen.tsx`. Er bestaat geen `day_notes` tabel of functionaliteit.

### Oplossing

**Database**: Nieuwe tabel `day_notes` met `id`, `location_id`, `date`, `content` (text), `created_by`, `created_at`, `updated_at`. RLS: authenticated users, location_id match.

**UI**: Klik op "Notities" in de footer opent een compact popover (niet een sheet/modal) direct erboven. Bevat een textarea met de dag-notitie, auto-save on blur. Als er al een notitie is, toont de footer-knop een kleine indicator dot.

**Hook**: `useDayNote(date, locationId)` — query + upsert mutatie.

### Bestanden

| Bestand | Wijziging |
|---|---|
| Database migratie | `day_notes` tabel + RLS |
| `src/hooks/useDayNote.ts` | Nieuw — fetch + upsert |
| `src/components/reserveringen/DayNotePopover.tsx` | Nieuw — popover met textarea, auto-save |
| `src/components/reserveringen/ReservationFooter.tsx` | Indicator dot als notitie bestaat |
| `src/pages/Reserveringen.tsx` | DayNotePopover integreren, state doorgeven |

---

## 2. Wachtlijst integratie in hoofdview

### Huidige staat
Wachtlijst is een apart tab in de ViewToggle (`waitlist` view type). Gebruiker moet switchen van list/grid naar wachtlijst — extra handeling, context verlies.

### Oplossing

Verwijder de wachtlijst als apart tab. Integreer als een compacte sectie **onder** de reserveringslijst/grid, binnen dezelfde kaart.

**Layout**:
```text
┌─────────────────────────────────────────┐
│  [Grid] [List] [Calendar]               │  ← waitlist tab weg
│  DateNavigator   ...   Walk-in  + Res   │
│  Filters                                │
├─────────────────────────────────────────┤
│  Reserveringen lijst/grid               │
│  ...                                    │
├─────────────────────────────────────────┤
│  🕐 Wachtlijst (3)            ▾        │  ← collapsible sectie
│  ┌───────────────────────────────────┐  │
│  │ Jan de Vries · 4p · Wachtend     │  │
│  │ Lisa Bakker · 2p · Uitgenodigd   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

- Collapsible header met count badge
- Compact rijen (naam, party size, tijdvoorkeur, status badge, cancel actie)
- Alleen tonen als er entries zijn (count > 0)
- Default ingeklapt als er >0 entries zijn, volledig verborgen als count = 0

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/reserveringen/ViewToggle.tsx` | Verwijder `waitlist` uit views array |
| `src/pages/Reserveringen.tsx` | Verwijder `activeView === "waitlist"` blok. Voeg `WaitlistSection` toe onder de lijst/grid. |
| `src/components/reserveringen/WaitlistSection.tsx` | Nieuw — collapsible wachtlijst sectie (hergebruikt `useWaitlistEntries`) |
| `src/components/reserveringen/WaitlistView.tsx` | Kan verwijderd of intern hergebruikt worden |

## Volgorde
1. Database migratie (day_notes)
2. useDayNote hook + DayNotePopover
3. Footer integratie
4. ViewToggle — waitlist tab verwijderen
5. WaitlistSection — inline collapsible component
6. Reserveringen.tsx — alles samenvoegen
