
# Fix Booking Widget: Gasten-getal Onzichtbaar + Layout Terugdraaien

## Analyse Resultaten

### Probleem 1: Getal aantal gasten onzichtbaar
De `<span>` die het getal toont heeft:
- `w-5` (20px breed) — te krap voor grotere getallen
- **Geen expliciete tekstkleur** — de kleur wordt geerfd van de parent, maar in de widget-context (met custom styling/theming) kan dit onzichtbaar worden
- De knoppen (+/-) zijn WEL zichtbaar want die hebben `text-gray-600` expliciet gezet

### Probleem 2: Gasten buiten dropdown (ongewenst)
De vorige wijziging verplaatste de gasten-selector naar een eigen card boven het dropdown-paneel. Dit moet teruggedraaid worden: gasten hoort terug BINNEN het inklapbare paneel, samen met datum en tijd.

### Probleem 3: Geen tijden beschikbaar
Dit is GEEN bug maar correct gedrag:
- **Vandaag (za 21 feb, 20:20+)**: De shift draait wel (17:00-22:30, alle dagen), maar de booking window check blokkeert slots die minder dan 60 minuten in de toekomst liggen. Omdat het al laat op de avond is, zijn (bijna) alle slots verlopen.
- **Morgen (zo 22 feb)**: Alle slots 17:00-21:00 zijn beschikbaar (getest en bevestigd via API)
- **Ma 23 feb**: Geblokkeerd door een **locatiebreed gesloten uitzondering** (`shift_exceptions` met `shift_id = null`). Er staan veel van deze exceptions in de database (bulk-gegenereerd eerder). Dat is een data-issue, geen code-bug.

## Wijzigingen

### Bestand: `src/components/booking/SelectionStep.tsx`

**1. Verwijder de losse gasten-card (regels 202-223)**
Het hele `{/* Guests - always visible */}` blok wordt verwijderd.

**2. Voeg gasten terug binnen het dropdown-paneel**
Na de datum-sectie en voor de tijd-sectie (binnen `{selectorOpen && ...}`), wordt de gasten-selector opnieuw toegevoegd als een `bg-gray-50 rounded-2xl` blok — exact zoals de originele code.

**3. Fix zichtbaarheid getal**
- `w-5` wordt `w-8` (32px breed, genoeg voor "10" of meer)
- Expliciete kleur: `text-gray-900` toegevoegd aan de party size span
- Dit garandeert dat het getal altijd zichtbaar is

**4. Herstel collapsed summary**
De samengevatte tekst wanneer het paneel dicht is toont weer het aantal gasten:
```
Wo 26 feb · 2 gasten · 17:00
```

In code verandert regel 242 van:
```
{' · '}{data.selectedSlot?.time ?? '—'}
```
naar:
```
{' · '}{data.party_size} gasten{' · '}{data.selectedSlot?.time ?? '—'}
```

**5. Header terug naar "Je selectie"**
Regel 233 verandert van `Datum & tijd` terug naar `Je selectie` zodat het logisch is dat gasten er ook bij zit.

## Geen verdere wijzigingen nodig

| Onderdeel | Status |
|-----------|--------|
| Shift configuratie | Correct: alle 7 dagen actief |
| Ticket koppeling | Correct: "Reservering" gekoppeld aan "Ealy dinenr" |
| Tafels | Correct: 3 tafels actief en online bookable |
| Availability engine | Correct: retourneert beschikbare slots voor toekomstige data |
| Gesloten uitzonderingen | Data-issue: veel locatiebrede sluitingsdagen actief — dit is configuratie, geen bug |
