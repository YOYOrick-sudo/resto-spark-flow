

# List View: sticky headers, compacter grid, en actie-iconen fix

## Analyse van de problemen

### 1. Kolomheaders scrollen weg
De `ColumnHeader` component heeft geen `sticky` positioning, waardoor je bij scrollen niet meer ziet welke kolom wat is.

### 2. Kanaal-kolom neemt onnodige ruimte
De 24px kanaal-icoon kolom voegt weinig toe in de list view maar duwt andere kolommen smaller.

### 3. Actie-iconen lijken te ontbreken
De code bevat wel alle drie de iconen (UserCheck, LogOut, RotateCcw), maar ze tonen alleen bij de juiste status:
- **Confirmed** -> UserCheck (inchecken)
- **Seated** -> RotateCcw (reset naar bevestigd) + LogOut (uitchecken)
- Andere statussen -> geen iconen, kolom klapt in

Het probleem is dat de actie-kolom **geen vaste breedte reserveert** wanneer er geen knoppen zijn. Hierdoor verspringt de layout per status en lijkt het alsof iconen ontbreken.

### 4. Tijdslot-headers zijn te zwaar
Volle backdrop-blur met shadow domineert het beeld.

## Oplossing

### Bestand: `src/components/reserveringen/ReservationListView.tsx`

**A. Grid aanpassen (kanaal eruit, shift breder)**

```
Was:  grid-cols-[12px_1fr_50px_60px_24px_100px_110px_90px_32px]  (9 kolommen)
Wordt: grid-cols-[12px_1fr_48px_56px_120px_110px_80px_32px]      (8 kolommen)
```

Kanaal-kolom verwijderd. Shift-kolom van 100px naar 120px zodat namen niet afgesneden worden.

**B. Sticky kolomheader**

`ColumnHeader` krijgt `sticky top-0 z-20 bg-card border-b border-border` zodat hij altijd zichtbaar blijft. De kolomheader wordt ook aangepast naar 8 kolommen (kanaal eruit).

**C. Subtielere tijdslot-headers**

Vervang de zware styling (`backdrop-blur-sm`, `shadow-sm`, `bg-background/95`) door een lichtgewicht separator: `bg-muted/30 border-b border-border` zonder shadow of blur.

**D. Vaste actie-kolom die niet verspringt**

De actie-kolom (80px) behoudt altijd dezelfde breedte, ongeacht de status. De knoppen worden conditioneel gerenderd maar de container-div staat er altijd. Dit voorkomt dat de layout verspringt wanneer een reservering van status wisselt.

Iconen per status:
- `confirmed`: UserCheck (inchecken)
- `seated`: RotateCcw (reset) + LogOut (uitchecken) naast elkaar
- Alle andere statussen: lege ruimte van dezelfde breedte

**E. Compactere rij-padding**

- Compact density: `py-2` (was `py-3`)
- Comfortable density: `py-3` (was `py-4`)

**F. ChannelIcon rendering verwijderen uit de rij**

De `ChannelIcon` component wordt niet meer gerenderd in de rij. De component zelf kan blijven staan voor eventueel toekomstig gebruik.

