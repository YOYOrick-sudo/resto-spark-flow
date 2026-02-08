

## NestoCard: border verwijderen, shadow-only stijl (Polar.sh patroon)

### Keuze

De borderless variant met een sterkere shadow geeft het cleanste, modernste resultaat. De huidige border (#ECEDED) heeft te weinig contrast met zowel de card (wit) als de page achtergrond (#F4F5F6). Een donkerdere border zou werken, maar de shadow-only aanpak sluit beter aan bij het Polar.sh design system waar Nesto naar verwijst.

### Wat verandert er

**Bestand: `src/components/polar/NestoCard.tsx`**

- Verwijder `border border-border` uit de className
- Verhoog de base shadow van `0 1px 2px rgba(0, 0, 0, 0.04)` naar `0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)`
- Hover shadow blijft `0 2px 8px rgba(0, 0, 0, 0.06)`
- Hoverable cards verliezen ook `hover:border-primary` (geen border meer om te highlighten)
- Nested cards: shadow blijft `none` (geen verandering)

### Technisch detail

Regel 19: `"bg-card text-card-foreground"` (border classes verwijderd)

Regel 28: `hoverable && !nested && "cursor-pointer hover:-translate-y-px"` (hover:border-primary verwijderd)

Regel 36: shadow wordt `"0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)"`

Hover shadow (regel 40): wordt ook verhoogd naar `"0 4px 12px rgba(0, 0, 0, 0.08)"` voor meer contrast bij hover.

Leave shadow (regel 44): matcht de nieuwe base shadow.

