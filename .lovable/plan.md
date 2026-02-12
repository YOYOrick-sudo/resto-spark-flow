
# Toast V8 — Pure Enterprise

## Concept

Geen dot, geen iconen, geen gekleurde borders. Puur typografie-gedreven — net als hoe Linear en Stripe hun notificaties doen. De enige kleur-hint zit in de titel tekst, en zelfs die is bewust ingetogen.

De card zelf is volledig neutraal. Status wordt gecommuniceerd door de titelkleur — subtiel genoeg dat het niet schreeuwt, duidelijk genoeg dat je het herkent.

## Wat verandert

| Element | V7 (nu) | V8 (nieuw) |
|---------|---------|------------|
| Dot | `w-1.5 h-1.5 rounded-full` | Verwijderd |
| Titel | `text-[14px] font-semibold` + variant kleur `/80` | `text-[13px] font-medium tracking-tight` + variant kleur (volle sterkte) |
| Beschrijving | `text-[13px] text-foreground/70` | `text-[12.5px] text-muted-foreground` — iets kleiner, meer hiërarchie |
| Card padding | `px-5 py-4` | `px-4 py-3.5` — compacter, meer enterprise density |
| Card width | `min-w-[320px] max-w-[420px]` | `min-w-[280px] max-w-[380px]` — iets smaller, minder opdringerig |
| Shadow | Groot diffuus | Iets strakker: `0_4px_24px_rgba(0,0,0,0.06)` — minder "floating", meer grounded |
| Beschrijving indent | `pl-[14px]` (dot compensatie) | `pl-0` — geen dot meer, dus geen indent |

## Kleurmapping

De titel gebruikt de volle status kleur maar door `font-medium` (niet bold) voelt het gedempter:

| Variant | Titel kleur |
|---------|-------------|
| Success | `text-success` |
| Error | `text-error` |
| Warning | `text-warning` |
| Info | `text-primary` |

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `src/pages/TestToasts.tsx` | Dot verwijderen, kleurmapping vereenvoudigen (alleen titel kleur), card compacter maken, shadow strakker, beschrijving kleiner + geen indent. Paginatitel updaten naar "Toast V8". |
