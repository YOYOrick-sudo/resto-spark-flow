
# Sticky bar: meer padding + dunnere knop

## Wijzigingen

Twee aanpassingen in beide bestanden:

1. **Padding verhogen** van `48px` naar `80px` — content schuift iets meer naar het midden
2. **Knop dunner maken** — padding van `8px 16px` naar `6px 14px` voor een slankere look

### Bestanden

| Bestand | Regels | Wat |
|---|---|---|
| `supabase/functions/marketing-popup-widget/index.ts` | 85, 91 | `padding:14px 80px` + `.nesto-btn` padding `6px 14px` |
| `src/pages/PopupPreviewDemo.tsx` | 54, 60 | Zelfde aanpassingen |

De `marketing-popup-widget` edge function wordt opnieuw gedeployed.
