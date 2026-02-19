

# Fix: Rode NU-lijn moet WEL door het tijdlijn-gedeelte lopen

## Wat ik begrijp

Je ziet nu dat de rode "NU"-lijn nergens meer door de "Niet toegewezen" rij loopt. Maar dat is te veel: de lijn moet **wel degelijk zichtbaar zijn in het tijdlijn-gedeelte rechts** (waar de uren en reserveringsblokken staan), net zoals bij alle andere rijen. De lijn mag alleen **niet door de linkerkolom** lopen (waar "Niet toegew." staat, en ook niet door area-headers of tafelnamen).

Kort gezegd:
- **Linkerkolom (140px, tafelnamen/labels):** GEEN rode lijn -- dat klopt nu al
- **Rechtergedeelte (tijdlijn met uren):** WEL rode lijn -- dat is nu kapot

## Oorzaak

De hele tijdlijn-kant zit in een `CollapsibleContent` (regel 322). Wanneer de sectie is ingeklapt, wordt die `CollapsibleContent` verborgen en is er simpelweg geen element meer in het rechtergedeelte. De buitenste wrapper krimpt dan tot alleen de linkerkolom-breedte. Maar zelfs uitgeklapt blokkeert de `bg-secondary` achtergrond + `z-40` de rode lijn (die `z-20` heeft).

Het probleem is tweeledig:
1. Bij **inklappen**: het rechtergedeelte verdwijnt volledig, dus geen achtergrond en geen lijn
2. Bij **uitklappen**: de opaque achtergrond + hogere z-index blokkeert de rode lijn ook in het tijdlijn-gedeelte

## Oplossing

De tijdlijn-achtergrond moet altijd gerenderd worden (zodat de oranje tint zichtbaar blijft), maar de rode lijn moet er doorheen kunnen in dat rechtergedeelte. De truc: alleen de **linkerkolom** blokkeert de lijn (met z-40 + opaque bg), het **tijdlijn-gedeelte** laat de lijn door (lagere z-index of geen opaque achtergrond nodig daar).

Concreet:

### Stap 1: Tijdlijn-div altijd renderen (niet in CollapsibleContent)
Verplaats de timeline-div BUITEN de `CollapsibleContent`. De div met `width: gridWidth` wordt altijd gerenderd. Alleen de reserveringsblokken erin worden gewrapped in `CollapsibleContent`.

### Stap 2: Achtergrond splitsen
- **Buitenste wrapper (regel 304):** Verwijder `bg-secondary` en de warning-overlay. Deze div is alleen een sticky positioneringscontainer.
- **Linkerkolom (regel 309):** Behoud `bg-secondary` + `bg-warning/5` overlay + `z-40`. Dit blokkeert de rode lijn in de labelkolom.
- **Tijdlijn-div:** Geef deze `bg-warning/5` (transparant, geen opaque basis). De rode lijn (z-20) schijnt hier doorheen -- dat is precies de bedoeling.

### Resultaat

```text
                   Linkerkolom (140px)     Tijdlijn (rechts)
                   ────────────────────    ─────────────────────
Rode lijn:         GEBLOKKEERD             ZICHTBAAR
                   (bg-secondary + z-40)   (bg-warning/5, transparant)
Oranje tint:       JA                      JA
Blocks:            n.v.t.                  Zichtbaar (uitgeklapt)
```

### Wijzigingen in `ReservationGridView.tsx` -- UnassignedGridRow

1. **Regel 304 (buitenste div):** Verwijder `bg-secondary relative` en de warning-overlay div. Behoud `sticky top-[72px] z-40 border-b-2 border-border`.
2. **Regel 309 (linkerkolom):** Behoud alles zoals het is (opaque + warning overlay).
3. **Regel 322-351:** Haal `CollapsibleContent asChild` weg van de timeline-div. De div wordt altijd gerenderd met `bg-warning/5` als achtergrond. Wrap alleen de map van reserveringsblokken in `CollapsibleContent`.

