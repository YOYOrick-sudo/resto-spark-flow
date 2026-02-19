

# Check-in knop altijd zichtbaar + naam langer

## Wat verandert

### 1. Check-in knop — altijd zichtbaar, touch + muis
De check-in knop wordt een permanent zichtbare knop (geen hover nodig) aan de rechterkant van het reserveringsblok. Alleen voor reserveringen met status `confirmed`. De knop:
- Is altijd zichtbaar (geen `opacity-0 group-hover:opacity-100`)
- Werkt met touch (iPad) en muis
- Gebruikt het `LogIn` icoon in een emerald/groen stijl
- Stopt event propagation zodat het blok niet opent bij klik op de knop

### 2. Naam meer ruimte
De gastnaam krijgt `flex-1` zodat deze alle beschikbare ruimte pakt voordat hij afkapt.

## Technisch

### `src/components/reserveringen/ReservationBlock.tsx`

1. **Check-in knop toevoegen** — Nieuwe `button` element naast de unassigned-knop (rond regel 280):
   - Conditie: `canCheckIn` (status === confirmed en onCheckIn prop aanwezig)
   - Styling: `absolute right-1 top-1/2 -translate-y-1/2` met emerald achtergrond, altijd `opacity-100`
   - `onClick`: stopt propagation, roept `onCheckIn(reservation)` aan
   - `LogIn` icoon (al geimporteerd)

2. **Naam meer ruimte** (regel 249-251):
   - Voeg `flex-1` toe aan de naam-span
   - Behoud `truncate` voor overflow maar geef de naam prioriteit over optionele elementen

3. **Content padding aanpassen**: wanneer canCheckIn actief is, voeg `pr-7` toe aan de content-div zodat de naam niet onder de knop verdwijnt

Totaal: 1 bestand, ~8 regels aangepast/toegevoegd.

