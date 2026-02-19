

# Live Preview vereenvoudigen: visuele mockup + externe preview link

## Probleem

De huidige live preview gebruikt geschaalde iframes binnen de settings pagina, wat niet smooth werkt en een slechte ervaring geeft. De iframe-in-iframe aanpak is traag en visueel niet betrouwbaar.

## Oplossing

De `WidgetLivePreview` wordt omgebouwd naar twee onderdelen:

1. **Statische visuele mockup** -- een lichtgewicht simulatie zonder iframes die laat zien waar de knop/widget komt
2. **"Open preview" knop** -- opent een volledige demo-pagina in een nieuw tabblad waar de widget echt werkt

### Wat verandert

**`WidgetLivePreview.tsx`** -- Herschrijven:
- Verwijder alle iframes uit de preview
- **Button mode**: Toon het mock-browservenster (dots + URL-balk) met placeholder content en de floating knop in de juiste positie/kleur/tekst. Geen overlay meer bij klik -- in plaats daarvan een "Open preview" knop onder de mockup
- **Inline mode**: Toon het mock-browservenster met een placeholder card waar de widget zou staan (gestileerde outline met "Nesto Widget" label), plus een "Open preview" knop
- **Link mode**: Blijft zoals het is (URL + Open link)

**Nieuwe pagina: `/widget-preview`** -- Een standalone demo-pagina die:
- Een nep-restaurantwebsite simuleert (hero, tekst, navigatie)
- Het `widget.js` script dynamisch laadt met de geconfigureerde parameters (slug, mode, label, position, color)
- Zo toont de operator exact wat hun gasten zullen zien op een echte website
- Query params: `?slug=xxx&mode=button&label=Reserveer&position=bottom-right&color=%231d979e`

### Flow voor de operator

1. Kies embed mode in de settings
2. Zie een lichtgewicht mockup van de positionering
3. Klik "Open preview" -- nieuw tabblad opent met een volledige simulatie
4. De floating knop of inline widget werkt daar echt, met overlay en alles

## Technische details

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/settings/widget/WidgetLivePreview.tsx` | Herschrijven -- iframes verwijderen, statische mockup + "Open preview" knop |
| `src/pages/WidgetPreviewDemo.tsx` | Nieuw -- standalone demo-pagina met nep-restaurant + widget.js |
| `src/App.tsx` | Route toevoegen: `/widget-preview` |

### WidgetLivePreview (nieuw)

- Mock browser chrome (dots + URL balk) blijft behouden
- Button mode: placeholder content + absolute-positioned knop (puur CSS, geen iframe)
- Inline mode: placeholder content + gestileerde container met label
- Onder elke mockup: een "Open preview" knop die `/widget-preview?slug=...&mode=...&label=...&position=...&color=...` opent in een nieuw tabblad

### WidgetPreviewDemo pagina

- Geen sidebar, geen Nesto chrome -- ziet eruit als een externe restaurantwebsite
- Simpele hero sectie, wat tekst, een menu-sectie
- Laadt `widget.js` dynamisch via een `<script>` element met de juiste data-attributen uit de URL query params
- De floating knop verschijnt echt rechtsonder, de overlay werkt echt
- Of bij inline mode: een `<div id="nesto-booking">` container waar de widget in rendert

