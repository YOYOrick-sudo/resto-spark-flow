

# Enterprise Design Regels Vastleggen in Documentatie

## Waarom dit nodig is

De design docs (`docs/design/`) worden automatisch geraadpleegd bij het bouwen van nieuwe modules. Op dit moment missen ze de enterprise typografie- en contrastregels die we op de Shifts-pagina hebben toegepast. Zonder deze vastlegging vallen nieuwe modules terug op het "oude" standaard SaaS-patroon (achtergrondkleuren op headers, lage opacity tekst, font-medium op data).

## Wat er concreet verandert

### 1. Nieuw bestand: `docs/design/ENTERPRISE_TYPOGRAPHY.md`

Een dedicated referentiedocument met alle enterprise regels op een plek:

- **Tekst contrast hierarchie** (3 niveaus):
  - Primair (data): `text-foreground font-semibold` -- namen, datums, tijden, bedragen
  - Secundair (metadata): `text-foreground/70` -- scope, interval, beschrijvingen
  - Tertiair (labels): `text-muted-foreground` -- kolomkoppen, hulptekst (volle kleur, nooit /60 of /70)
- **Zwevende headers**: Tabel kolomkoppen zonder achtergrondkleur (`bg-muted/40` verboden), labels zweven boven data
- **Sectie micro-labels**: `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider` als standaard voor alle sectiekoppen binnen cards
- **Panel headers**: Altijd volle `text-muted-foreground`, geen opacity modifiers
- **Rij separatie**: `divide-y divide-border/50` in plaats van zware borders of achtergrondwisseling
- **Hover patroon**: `hover:bg-accent/40` met subtiel left-accent color bar
- **Verboden patronen** met correcte alternatieven

### 2. Wijziging: `docs/design/COMPONENT_DECISION_GUIDE.md`

**Sectie 0 (Pre-build Checklist)** -- 2 nieuwe punten toevoegen:

```text
### Typografie & Contrast

- [ ] 9. Tabel/lijst headers zonder achtergrondkleur? Labels zweven boven data.
- [ ] 10. Tekst hierarchie correct? Data = text-foreground font-semibold,
        metadata = text-foreground/70, labels = text-muted-foreground
        (volle kleur, geen /60 of /70 opacity).
```

**Sectie 3 (Anti-patterns)** -- 3 nieuwe rijen:

| Anti-pattern | Waarom fout | Correct |
|---|---|---|
| `bg-muted/40` op tabel headers | Visueel gewicht, niet enterprise | Geen achtergrond, zwevende labels |
| `text-muted-foreground/70` of `/60` | Te lage opacity, onleesbaar | Volle `text-muted-foreground` of `text-foreground/70` |
| `font-medium` op data-waarden | Te licht, data moet opvallen | `font-semibold` voor primaire data |

**Nieuwe Sectie 10** toevoegen na Sectie 9 (Badges) -- verwijzing naar `ENTERPRISE_TYPOGRAPHY.md` met samenvatting van de kernregels.

### 3. Wijziging: `docs/design/INLINE_DATA_TABLES.md`

Header row styling op regel 56 en 121 updaten:

Van:
```
text-xs text-muted-foreground
```

Naar:
```
text-[11px] font-semibold text-muted-foreground uppercase tracking-wider
```

En achtergrondkleur expliciet uitsluiten. Checklist onderaan uitbreiden met:
- Header row zonder achtergrondkleur (zwevende labels)
- Data tekst met `font-semibold` en `text-foreground`

### 4. Wijziging: `docs/design/COLOR_PALETTE.md`

Nieuwe sectie "Enterprise Tekst Hierarchie" toevoegen bij de TEXT COLORS, zodat de 3-niveau contrast hierarchie ook in het kleurendocument staat:

| Niveau | Tailwind | Wanneer |
|---|---|---|
| Primair | `text-foreground font-semibold` | Data die moet opvallen |
| Secundair | `text-foreground/70` | Metadata, beschrijvingen |
| Tertiair | `text-muted-foreground` | Labels, hulptekst (nooit met /60 of /70) |

---

## Technische samenvatting

| Bestand | Actie |
|---|---|
| `docs/design/ENTERPRISE_TYPOGRAPHY.md` | Nieuw -- dedicated enterprise typografie referentie |
| `docs/design/COMPONENT_DECISION_GUIDE.md` | Checklist +2, anti-patterns +3, nieuwe Sectie 10 |
| `docs/design/INLINE_DATA_TABLES.md` | Header styling update, checklist uitbreiding |
| `docs/design/COLOR_PALETTE.md` | Enterprise tekst hierarchie sectie toevoegen |

## Resultaat

Na deze wijzigingen worden bij het bouwen van elke nieuwe module (Recepten, Kaartbeheer, Inkoop, etc.) automatisch de enterprise typografie- en contrastregels gevolgd via de pre-build checklist en component catalogus. Geen handmatige correcties meer nodig.
