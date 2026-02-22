
# Sticky bar finetuning: padding, knop, titel en sluitknop

De Enterprise Design Guide heeft geen specifieke regels voor de externe marketing widget — die regels gelden voor de in-app UI. De widget CSS is een op zichzelf staand systeem. De voorgestelde aanpassingen zijn dus vrij en conflicteren nergens mee.

## Vier wijzigingen

| # | Wat | Was | Wordt |
|---|-----|-----|-------|
| 1 | Bar padding (content naar midden) | `14px 80px` | `14px 120px` |
| 2 | Knop dunner | `6px 14px` | `5px 12px` |
| 3 | Titel groter | `font-size:14px` | `font-size:15px` |
| 4 | Sluitknop groter | `font-size:18px` | `font-size:22px` |

## Bestanden

| Bestand | Wat |
|---|---|
| `src/pages/PopupPreviewDemo.tsx` | Regels 54, 58, 60, 62 — alle 4 de CSS waarden aanpassen |
| `supabase/functions/marketing-popup-widget/index.ts` | Regels 85, 89, 91, 93 — zelfde aanpassingen |

De `marketing-popup-widget` backend function wordt opnieuw gedeployed.
