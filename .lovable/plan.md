

# "Niet toegewezen" in lijstweergave opschonen

## Probleem
De oranje "Niet toegewezen" tekst met Sparkles-icoon en underline in de Tafel-kolom ziet er druk en inconsistent uit. Het valt te veel op en past niet bij de rustige enterprise-stijl van de rest van de tabel.

## Drie opties

### Optie A: Subtiel streepje met warning-dot (aanbevolen)
Toon gewoon een `—` (em-dash) net als bij ontbrekende data, maar met een kleine oranje dot ervoor als visueel signaal. Klikbaar om toe te wijzen.

```
TAFEL
—          (gewone tekst, geen tafel)
·  —       (oranje dot + dash = geen tafel, actie nodig)
Tafel 1
```

- Rustig, past in de tabelstructuur
- De oranje dot geeft net genoeg urgentie zonder te schreeuwen
- Klik op de cel opent auto-assign (tooltip legt uit)

### Optie B: Compact "—" met assign-icoon bij hover
Toon een muted `—` standaard. Bij hover over de rij verschijnt een klein Wand2-icoon naast het streepje.

```
TAFEL
—              (standaard)
— [wand]       (bij hover)
Tafel 1
```

- Nog rustiger dan optie A
- Actie-icoon alleen zichtbaar wanneer relevant

### Optie C: Mini warning badge
Een kleine badge met alleen "!" of een warning-driehoek, dezelfde stijl als de ticket-afkorting badge.

```
TAFEL
[!]
Tafel 1
```

- Compact maar misschien te cryptisch

## Aanbeveling: Optie A

Een oranje dot (zelfde grootte als de status-dot links) gevolgd door een muted em-dash. Hele cel is klikbaar met tooltip "Klik om tafel toe te wijzen". Dit is:
- Visueel rustig en consistent met de rest van de tabel
- Duidelijk genoeg dat er iets mist (oranje dot = aandacht)
- Enterprise-waardig (Stripe/Linear gebruiken vergelijkbare patronen voor ontbrekende data)

## Technische wijziging

### `src/components/reserveringen/ReservationListView.tsx`
Regels 188-205 aanpassen:
- Vervang de oranje "Niet toegewezen" tekst + Sparkles-icoon door:
  - Een kleine oranje dot (`w-1.5 h-1.5 rounded-full bg-warning`)
  - Gevolgd door een muted em-dash (`text-muted-foreground`)
- Behoud de `onClick` handler voor auto-assign
- Behoud de tooltip met uitleg
- Voeg `cursor-pointer` toe zodat het klikbaar aanvoelt

