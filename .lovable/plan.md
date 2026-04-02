

# ReservationDetailPanel — UX Redesign

## Problemen in het huidige ontwerp

1. **Acties domineren het paneel** — Drie grote gekleurde knoppen (Inchecken, No-show, Annuleren) nemen ~25% van de zichtbare ruimte in. De rode destructieve knoppen trekken meer aandacht dan de nuttige data.
2. **Essentiële info verborgen achter tabs** — Telefoonnummer en allergieën zitten in de "Gast" tab. Een restaurantmedewerker moet die info direct zien zonder te klikken.
3. **Details tab is leeg** — Na tafel + 1 badge is er enorme lege ruimte.
4. **Actie-knoppen te groot en te kleurrijk** — De destructieve knoppen (rood) schreeuwen. In een enterprise tool moet de focus op data liggen, niet op destructieve acties.

## Oplossing

### 1. Header uitbreiden met essentiële gast-info

Direct onder de naam/metadata, **voor de acties**, een compacte "quick info" strip toevoegen:

```text
Yorick Mulder
2p · Early dinner · Tafel 111 · 17:15–18:45
● Bevestigd

📞 +31 6 1234 5678          ⚠️ Glutenvrij, Noten
```

- Telefoon: clickable `tel:` link, `text-sm text-muted-foreground`
- Allergieën: oranje pills inline, compact, dezelfde stijl als in de lijst-view

### 2. Acties drastisch inkrimpen

Weg met de grote gekleurde knoppen. Vervang door:
- **Primaire actie**: subtielere `NestoButton primary size="sm"` — niet full-width, gewoon inline
- **Alle overige acties**: in een compact rij van kleine outline/ghost knoppen, of direct in de `···` dropdown
- Destructieve acties (No-show, Annuleren) gaan **altijd** in de overflow dropdown — ze horen niet prominent in beeld

```text
[Inchecken]  [···]
```

Alleen 1 primaire knop zichtbaar + overflow menu. Dat is genoeg.

### 3. Tabs herstructureren

Nu de header al telefoon + allergieën toont, worden de tabs efficiënter:

**Details tab**: Tafel + Notities + Badges + Betaling (zoals nu, maar compacter)
**Gast tab**: Volledige klantkaart (stats, bezoekhistorie, notities) — voor wie dieper wil kijken
**Activiteit tab**: Risicoscore + audit log (ongewijzigd)

### 4. Badges compacter in header

Verplaats de belangrijkste badges (squeeze, VIP, hoog risico) naar de header naast de status badge. Dan is de aparte badges-sectie in Details tab niet meer nodig als standalone blok — alleen channel/payment badges blijven daar.

## Technische wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/components/reservations/ReservationDetailPanel.tsx` | Quick-info strip (telefoon + allergieën) in header. Badges deels naar header. Acties compacter: alleen 1 primaire knop + overflow. |
| `src/components/reservations/ReservationActions.tsx` | Refactor: alle secondary + destructieve acties naar overflow dropdown. Primary button `size="sm"` niet full-width. |

## Volgorde
1. ReservationActions — compact naar 1 knop + dropdown
2. ReservationDetailPanel — quick-info strip + header badges

