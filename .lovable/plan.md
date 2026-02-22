
# Sessie 3.2 — Instagram Onboarding + Slimme Content Generatie ✅ AFGEROND

## Wat is gedaan

1. **marketing-onboard-instagram** edge function: importeert 30 posts, haalt insights op, classificeert content types via AI batch call, triggert brand analyse
2. **marketing-generate-content** uitgebreid: photo_suggestion + content_type in tool schema, engagement_baseline + learning_stage context in prompt
3. **marketing-sync-social-stats** uitgebreid: heranalyse trigger als posts_analyzed verschil >= 5
4. **useInstagramOnboarding** hook: mutation voor frontend trigger
5. **useGenerateContent** interface: photo_suggestion + content_type toegevoegd
6. **SocialPostsPage** feedback card: auto-dismiss na 7 dagen na onboarding
7. **config.toml** bijgewerkt met marketing-onboard-instagram

## Volgende sessie: 3.3 — Weekplan generatie
