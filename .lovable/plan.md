

# Optie B: Wachtlijst Inline Merge in Reserveringslijst

## Concept

Wachtlijst-entries verschijnen **tussen** de reserveringen, gesorteerd op hun tijdvoorkeur. Visueel onderscheidbaar met een dashed amber rand. Directe "Uitnodigen" actie in de rij. De AI-agent kan straks dezelfde `waitlist_entries.status` en `waitlist_invites` tabel gebruiken — de inline weergave toont real-time de status die de agent zet (pending → invited → booked).

## Agent-compatibiliteit

De agent werkt al via `waitlist-invite-engine` Edge Function die `waitlist_invites` aanmaakt en `waitlist_entries.status` naar `invited` zet. De inline merge **leest** dezelfde data — geen schema-wijzigingen nodig. Wanneer de agent automatisch uitnodigt:
- De rij wisselt real-time van "Wachtend" (amber dashed) naar "Uitgenodigd" (amber badge met countdown)
- Wanneer gast accepteert: entry verdwijnt uit wachtlijst-stijl en verschijnt als normale reservering (via de bestaande `waitlist-accept` flow die een reservering aanmaakt)

## Wijzigingen

### 1. `ReservationListView.tsx` — Gemengde tijdlijn

- Accepteer een nieuwe prop `waitlistEntries: WaitlistEntryWithInvites[]`
- In `groupByTimeSlot`: merge wachtlijst-entries erbij op basis van `preferred_time_from`. Entries zonder tijdvoorkeur komen in een "Geen voorkeur" groep onderaan
- Wachtlijst-rijen krijgen een aparte `WaitlistInlineRow` component:
  - `border-l-2 border-dashed border-amber-400 bg-amber-50/5`
  - Kolommen: status dot (amber) | naam | party size | — (geen tafel) | tijdvoorkeur | status badge | "Uitnodigen" knop
  - Als status `invited`: badge toont "Uitgenodigd" + countdown tot `expires_at`
  - Cancel via hover `X` knop

### 2. `Reserveringen.tsx` — Data doorvoeren

- `useWaitlistEntries(dateString)` data doorgeven als prop aan `ReservationListView`
- `WaitlistSection` component verwijderen uit de render (niet meer nodig als aparte sectie)
- Optioneel: ook aan `ReservationGridView` doorgeven (later)

### 3. `useWaitlistEntries.ts` — Invite mutatie toevoegen

- Nieuwe `useInviteWaitlistEntry()` mutatie die de `waitlist-invite-engine` Edge Function aanroept voor een specifieke entry (handmatige invite door operator)
- Invalidate queries na succes

### 4. `WaitlistSection.tsx` — Kan verwijderd worden

De collapsible sectie onderaan is niet meer nodig.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/reserveringen/ReservationListView.tsx` | `waitlistEntries` prop, `WaitlistInlineRow`, merge in tijdgroepen |
| `src/pages/Reserveringen.tsx` | Waitlist data doorgeven, `WaitlistSection` verwijderen |
| `src/hooks/useWaitlistEntries.ts` | `useInviteWaitlistEntry()` mutatie toevoegen |
| `src/components/reserveringen/WaitlistSection.tsx` | Verwijderen |

## Volgorde
1. Hook: invite mutatie toevoegen
2. ReservationListView: WaitlistInlineRow + merge logic
3. Reserveringen.tsx: data doorvoeren, WaitlistSection verwijderen

