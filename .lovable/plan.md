

# Reserveringen List View omzetten naar tabel-layout

## Probleem 1: Check-in/out iconen
De quick-action knoppen (inchecken, uitchecken, reset) verschijnen alleen bij specifieke statussen (`confirmed` en `seated`). Bij andere statussen is er geen knop zichtbaar, waardoor de kolom "verspringt". Dit maakt het onoverzichtelijk.

**Oplossing:** Een vaste actie-kolom rechts met altijd dezelfde breedte. De knoppen verschijnen alleen wanneer relevant, maar de ruimte blijft gereserveerd zodat niets verspringt.

## Probleem 2: Data staat niet netjes onder elkaar
Het huidige flexbox-layout zorgt ervoor dat kolommen (personen, tafel, status, etc.) niet verticaal uitlijnen. Elke rij heeft variabele breedtes.

**Oplossing:** Omzetten naar een tabel-structuur met:
- Vaste kolomkoppen bovenaan (floating header style conform enterprise design pattern)
- CSS Grid per rij met vaste kolombreedtes zodat alles netjes uitlijnt

## Visueel voorbeeld

```text
         Naam             Pers  Tafel  Kanaal  Shift        Status        Acties
  -------|----------------|-----|------|-------|------------|-------------|-------
  o      Jan de Vries      4p    T12    phone   Diner        Bevestigd    [v] ...
  o      Lisa Bakker       2p    T5     web     Diner        Ingecheckt   [<][x] ...
  o      Piet Jansen       6p    T8     walk    Lunch        Afgerond
```

## Technische wijzigingen

### `src/components/reserveringen/ReservationListView.tsx`

1. **Kolomheader toevoegen** boven de eerste tijdslot-groep
   - Floating style: `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
   - Geen achtergrond (conform enterprise table pattern)

2. **Rij omzetten naar CSS Grid**
   - Grid template: `grid-cols-[12px_1fr_50px_60px_24px_100px_100px_90px_32px]`
   - Kolommen: status-dot | naam | pers | tafel | kanaal | shift | status-badge | acties | menu

3. **Vaste actie-kolom (90px)**
   - Altijd dezelfde breedte gereserveerd
   - `confirmed`: toont inchecken-knop (UserCheck)
   - `seated`: toont reset-knop (RotateCcw) + uitchecken-knop (LogOut)  
   - Andere statussen: lege ruimte (kolom blijft staan)

4. **Tijdslot-headers** blijven als groepering bestaan (sticky), maar de kolomheader staat erboven

5. **Risk score en guest notes** verplaatsen naar het detail panel (te veel kolommen maakt het rommelig)

