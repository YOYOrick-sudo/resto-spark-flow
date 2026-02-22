
# Sessie 3.4 — Engagement Coaching

## Samenvatting

Drie onderdelen: (1) `marketing_coaching_tips` tabel + `marketing-generate-coaching` edge function die na de wekelijkse brand analyse max 3 actionable tips genereert, (2) coaching tips card op het marketing dashboard, en (3) `marketing-generate-ideas` edge function met seizoensintelligentie en weer-suggesties.

## Status: ✅ Geïmplementeerd

### Wat is gedaan:

- [x] `marketing_coaching_tips` tabel met RLS + validatie trigger
- [x] `marketing-generate-coaching` edge function (getriggerd vanuit analyze-brand)
- [x] `marketing-generate-ideas` edge function (dagelijks 05:30 UTC via pg_cron)
- [x] `marketing-analyze-brand` uitgebreid met coaching trigger
- [x] `useCoachingTips` hook + `useDismissCoachingTip` mutation
- [x] `CoachingTipsCard` component op dashboard (tussen weekplan en KPI tiles)
- [x] `ContentIdeasSection` uitgebreid met 'weather' source badge
- [x] pg_cron job: ideas dagelijks 05:30 UTC (30 min voor weekplan op maandag)

### Feedback verwerkt:
- Ideas draait om 05:30 UTC ipv 06:00, zodat seizoens/weer-ideas klaar zijn voor het weekplan op maandag
- Weer API gebruikt locatie naam (restaurant naam) ipv hardcoded Amsterdam, met fallback naar Amsterdam als de naam niet matcht
