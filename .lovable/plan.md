

# Verwijder Georgia serif — gebruik Nesto's eigen Inter font

## Probleem
Op drie plekken wordt `fontFamily: 'Georgia, serif'` hardcoded gebruikt. Dit ziet er gedateerd uit en past niet bij het Nesto design system dat **Inter** als standaard font gebruikt (`--font-family: 'Inter', -apple-system, ...`).

## Oplossing
Verwijder alle `style={{ fontFamily: 'Georgia...' }}` overrides. De tekst erft automatisch het Inter font van het design system.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/booking/ConfirmationStep.tsx` | Verwijder `style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}` van "Bevestigd" heading |
| `src/pages/ManageReservation.tsx` | Verwijder `style={{ fontFamily: 'Georgia, serif' }}` van restaurantnaam (2 plekken: hero header + fallback header) |

Drie regels aanpassen, geen functionele wijzigingen.

