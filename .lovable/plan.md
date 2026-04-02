

# ReservationDetailPanel — Intuitiviteitsanalyse + Redesign

## Wat niet intuïtief is

**1. Te veel in één scroll — geen structuur**
Het paneel dumpt 6 secties onder elkaar: header → acties (5+ knoppen) → tafel → betaling → klantgegevens (met stats, bezoekhistorie, allergieën, notities) → risicoscore (met factoren, bar, shift gemiddelde) → audit log. Een gebruiker die snel een klant wil checken of een tafel wil wijzigen moet door alles scrollen.

**2. Acties zijn overweldigend**
`ReservationActions` toont tot 5-6 knoppen naast elkaar in `flex-wrap`, plus een "Andere actie..." link. Sommige zijn disabled met tooltips. Voor een druk restaurant wil je: één duidelijke volgende stap, niet een knoppenbalk.

**3. Dubbele tafel-secties**
Er zit een "Tafel wijzigen" knop in de acties EN een apart tafel-blok met auto-assign/handmatig kiezen. Verwarrend.

**4. Klantkaart is te lang**
ContactInfo + allergieën + 3 stats + bezoekhistorie (tot 5+ items) + notities — allemaal in één sectie. Dit is 40% van het paneel.

**5. Risicoscore neemt veel ruimte in**
Score + progress bar + 5 factor-bars + shift gemiddelde + disabled "Bevestiging sturen" knop. Belangrijk voor managers, maar niet voor dagelijks gebruik.

## Oplossing: Tabs + compactere acties

### Layout

```text
┌──────────────────────────────────┐
│ Reservering                   ✕  │
│ Yorick Mulder                    │
│ 2p · Early dinner · T4 · 17:15  │
│ ● Bevestigd                      │
│                                  │
│ [██ Inchecken ██]                │
│ [No-show]  [Annuleren]  [···]   │
├──────────────────────────────────┤
│  Details  │  Gast  │  Activiteit │
├──────────────────────────────────┤
│ (tab content)                    │
└──────────────────────────────────┘
```

### Wat verandert

**Header (altijd zichtbaar, boven tabs):**
- Naam, metadata, status badge — blijft
- Acties vereenvoudigd: 1 primaire full-width knop + max 2 secundaire + overflow `···` dropdown voor de rest
- "Tafel wijzigen" verhuist ALLEEN naar de Details tab (weg uit acties)

**Tab "Details":**
- Tafel toewijzing (auto-assign / handmatig / wijzigen)
- Notities (gast + intern) — compacter, inline
- Badges (squeeze, kanaal, betaling)
- Betaling/refund sectie

**Tab "Gast":**
- Contactgegevens (naam, email, telefoon)
- Allergieën & dieet badges
- Bezoekstats (3-grid)
- Bezoekhistorie
- Klantnotities

**Tab "Activiteit":**
- Risicoscore (compacter: score + level, factoren collapsed by default)
- Audit log timeline

### NestoPanel: ronde hoeken verwijderen
`rounded-l-2xl` weg van desktop container — strak zijpaneel, edge-to-edge.

## Technische details

| Bestand | Wijziging |
|---|---|
| `src/components/polar/NestoPanel.tsx` | Verwijder `rounded-l-2xl` |
| `src/components/reservations/ReservationDetailPanel.tsx` | Herstructureer met NestoTabs: Details/Gast/Activiteit. Header + acties boven tabs. |
| `src/components/reservations/ReservationActions.tsx` | Refactor: 1 primaire knop full-width, 2 secundaire, rest in DropdownMenu. Verwijder "Tafel wijzigen" uit acties. |
| `src/components/reservations/CustomerCard.tsx` | Verwijder `<h3>Klantgegevens</h3>` wrapper (tab is al "Gast") |
| `src/components/reservations/RiskScoreSection.tsx` | Factoren default collapsed, compactere layout |

## Volgorde
1. NestoPanel — ronde hoeken weg
2. ReservationActions — compactere actie-layout met dropdown
3. ReservationDetailPanel — tabs + herstructurering
4. Minor polish op CustomerCard en RiskScoreSection

