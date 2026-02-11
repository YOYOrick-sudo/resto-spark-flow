

# Shifts tabel header — Notion/Linear-stijl

## Probleem

De tabelkop heeft nu `bg-muted/40 rounded-lg` — een gekleurde balk achter de kolomlabels. Enterprise apps zoals Notion, Linear en Stripe gebruiken dit niet. Zij houden headers minimaal: alleen tekst + een subtiele bottom-border.

## Wijziging

**Bestand: `src/components/settings/shifts/ShiftsTable.tsx`**

Huidige header (regel 133):
```
bg-muted/40 rounded-lg
```

Wordt:
```
(geen achtergrond, geen rounded)
```

Daarnaast: de aparte `<div className="h-px bg-border" />` separator op regel 144 kan weg — de `divide-y` op de rij-container zorgt al voor scheiding, en de header zelf heeft geen extra lijn nodig als hij geen achtergrond meer heeft. De scheiding komt automatisch door de witruimte.

### Concreet

| Element | Huidig | Nieuw |
|---|---|---|
| Header achtergrond | `bg-muted/40 rounded-lg` | Geen |
| Header padding | `px-3 py-2` | `px-2 pb-2` (alleen onderaan ruimte) |
| Separator div | `h-px bg-border` apart element | Verwijderen |

De tekststyling (`text-[11px] text-muted-foreground font-semibold uppercase tracking-wider`) blijft exact hetzelfde — die is al goed.

## Resultaat

Schone, "zwevende" kolomlabels boven de data — precies zoals Notion en Linear het doen. De rij-dividers (`divide-y divide-border/50`) zorgen voor structuur, de header hoeft geen eigen achtergrond te hebben.

## Bestand

| Bestand | Wijziging |
|---|---|
| `src/components/settings/shifts/ShiftsTable.tsx` | Achtergrond en rounded verwijderen van header, separator div verwijderen |

