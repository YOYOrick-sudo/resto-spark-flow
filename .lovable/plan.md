
# Fix: Verkeerde navigatie-URL voor marketing instellingen

## Probleem

De "Naar instellingen" knoppen in de Social pagina's navigeren naar `/marketing/instellingen`, maar die route bestaat niet. De correcte route is `/instellingen/marketing` (zoals gedefinieerd in App.tsx regel 151).

## Oplossing

Verander `/marketing/instellingen` naar `/instellingen/marketing` in drie bestanden:

| Bestand | Regels |
|---------|--------|
| `src/pages/marketing/SocialPostsPage.tsx` | Regel 135 en 207 |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | Regel 370 |
| `src/components/marketing/social/UGCGrid.tsx` | Regel 22 |

Puur een URL-fix, geen andere wijzigingen nodig.
