
# Booking Widget - Diagnose en Fix Plan

## Gevonden Problemen

### Probleem 1: Aantal personen niet zichtbaar
De party size selector (gasten +/- knoppen) zit verstopt in een inklapbaar dropdown-paneel ("Je selectie"). Dit paneel start dicht en klapt automatisch dicht zodra er een volledige selectie is gemaakt. Omdat er maar 1 actief ticket is ("Reservering"), wordt dat ticket automatisch geselecteerd, waardoor de gebruiker het paneel nooit open ziet.

**Oorzaak**: De gasten-selector is alleen zichtbaar als de gebruiker actief op het dropdown-paneel klikt. Er is geen altijd-zichtbare party size picker.

### Probleem 2: Geen tijden beschikbaar
De enige actieve shift ("Ealy dinenr") draait op **dagen 1-5 (ma-vr)**. Vandaag is **zaterdag** (dag 6). Daarom retourneert de availability engine 0 slots.

**Oorzaak**: Geen configuratiefout - de shift is gewoon niet actief op zaterdag/zondag. De widget toont dan "Geen tijden beschikbaar" zonder uit te leggen waarom, en biedt geen suggestie om een andere dag te kiezen.

---

## Oplossing

### Fix 1: Party size altijd zichtbaar maken
De gasten-selector uit het inklapbare paneel halen en altijd tonen bovenaan de SelectionStep, naast de datum-selector. Dit maakt de flow intuiever:

**Nieuwe layout SelectionStep:**
1. Datum strip (altijd zichtbaar, zoals nu)
2. Gasten selector (altijd zichtbaar, nieuw!)
3. Inklapbaar paneel met alleen Tijd-selector
4. Ticket keuze (zoals nu)

### Fix 2: Betere feedback bij geen beschikbaarheid
In plaats van alleen "Geen tijden beschikbaar" tonen, een hint geven dat de gebruiker een andere datum kan proberen. Optioneel: de eerste beschikbare datum highlighten in de date strip.

---

## Technische Details

### Bestand: `src/components/booking/SelectionStep.tsx`

**Party size naar buiten verplaatsen:**
- De gasten-selector (regels 333-354) verplaatsen van binnen `{selectorOpen && ...}` naar buiten, direct na de datum-strip
- Compact horizontaal formaat behouden (bg-gray-50 rounded-2xl)
- Datum en gasten worden altijd zichtbare top-controls

**Lege slots feedback verbeteren:**
- De tekst "Geen tijden beschikbaar" (regel 367) vervangen door een informatievere melding
- Tekst wordt: "Geen tijden beschikbaar op deze dag. Kies een andere datum."

### Geen database wijzigingen nodig
De shift-configuratie is correct. De shift draait bewust alleen op werkdagen. Het probleem is puur UX: de widget geeft onvoldoende feedback en verbergt essentiële controls.

---

## Samenvatting

| Wat | Wijziging |
|-----|-----------|
| `SelectionStep.tsx` | Party size selector altijd zichtbaar buiten dropdown |
| `SelectionStep.tsx` | Betere "geen beschikbaarheid" melding met hint |
| Database | Geen wijzigingen |
| Edge Functions | Geen wijzigingen |
