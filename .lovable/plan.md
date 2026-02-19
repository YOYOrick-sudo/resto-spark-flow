

# Fix: Button logo verschijnt niet in de widget preview

## Probleem

De `WidgetPreviewDemo.tsx` pagina leest de `buttonLogo` URL-parameter niet uit en zet deze niet als `data-button-logo` attribuut op het dynamisch geïnjecteerde widget.js script. Daardoor toont de floating knop altijd de accent dot in plaats van het geüploade logo.

## Oplossing

In `src/pages/WidgetPreviewDemo.tsx`:

1. **Lees de `buttonLogo` parameter** uit de URL search params (regel 12)
2. **Zet `data-button-logo` attribuut** op het script element als de parameter aanwezig is (na regel 25)
3. **Voeg `buttonLogo` toe aan de dependency array** van het useEffect (regel 38)

## Wat verandert

| Onderdeel | Huidig | Nieuw |
|---|---|---|
| `buttonLogo` param | Genegeerd | Uitgelezen en doorgezet |
| Floating knop in preview | Accent dot (altijd) | Logo silhouet als geüpload |

## Technisch

Enige bestand: `src/pages/WidgetPreviewDemo.tsx`

Drie kleine wijzigingen:
- Variabele toevoegen: `const buttonLogo = params.get('buttonLogo') || '';`
- Attribuut zetten: `if (buttonLogo) script.setAttribute('data-button-logo', buttonLogo);`
- Dependency array uitbreiden met `buttonLogo`

