

# Toast V7 — Subtiele kleurindicatie zonder border-accent

## Concept

Geen gekleurde rand, geen gekleurde achtergrond. In plaats daarvan twee ultra-subtiele kleur-hints:

1. **Titel kleur** — de titel krijgt een heel lichte tint van de variant-kleur (bijv. `text-success` voor succes, `text-error` voor error), maar gedempt met opacity (`/80`)
2. **Klein bolletje** — een tiny 6px dot voor de titel in de variant-kleur (`/50` opacity), als enige visuele indicator

De card zelf blijft volledig wit/neutraal — geen gekleurde borders, geen gekleurde achtergrond. Het effect is dat je de kleur "voelt" maar niet "ziet" als een blok.

## Specificaties

| Element | Styling |
|---------|---------|
| Card | Ongewijzigd: `bg-card rounded-2xl shadow-[0_8px_40px...]` |
| Dot | `w-1.5 h-1.5 rounded-full` in variant-kleur met `/50` opacity |
| Titel | `text-[14px] font-semibold` in variant-kleur met `/80` opacity |
| Beschrijving | Ongewijzigd: `text-foreground/70` |
| Close button | Ongewijzigd: hover-only |

## Kleurmapping

| Variant | Dot kleur | Titel kleur |
|---------|-----------|-------------|
| Success | `bg-success/50` | `text-success/80` |
| Error | `bg-error/50` | `text-error/80` |
| Warning | `bg-warning/50` | `text-warning/80` |
| Info | `bg-primary/50` | `text-primary/80` |

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `src/pages/TestToasts.tsx` | Variant A vervangen: `nestoToast` wordt `nestoToast(variant, title, desc)` met dot + gekleurde titel. Variant B (border-accent) verwijderen, alleen de nieuwe variant tonen. |

