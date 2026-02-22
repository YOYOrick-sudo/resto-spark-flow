
# Live Preview — Realtime meeveranderen bij wijzigingen

## Probleem

De "Live" preview (iframe) laadt de popup config eenmalig via de edge function. Wijzigingen in headline, beschrijving, type, etc. zijn pas zichtbaar na handmatig refreshen.

De "Popup" en "Sticky bar" mockup-previews (rechts in de editor) veranderen WEL live mee — die lezen direct uit de React state. Maar de Live iframe-tab en het nieuwe tabblad niet.

## Oplossing: postMessage bridge

De meest robuuste aanpak zonder de widget edge function te herschrijven:

### Hoe het werkt

1. **PopupPage.tsx** stuurt bij elke state-wijziging een `postMessage` naar het iframe met de volledige popup config
2. **PopupPreviewDemo.tsx** luistert op `message` events en her-rendert de popup direct met de ontvangen config, zonder opnieuw de edge function aan te roepen
3. De widget wordt bij eerste load normaal geladen (via edge function), maar daarna overgenomen door de postMessage updates

### Stappen

**1. PopupPreviewDemo.tsx — message listener toevoegen**

- Luister op `window.addEventListener('message', ...)` voor berichten met type `nesto-popup-config-update`
- Bij ontvangst: verwijder bestaande popup/bar uit de shadow DOM
- Render opnieuw met de ontvangen config data (hergebruik dezelfde DOM-constructie logica die het widget al gebruikt)
- Dit vereist dat de widget-rendering logica als lokale functies in de demo page leeft (in plaats van in de edge function script)

**2. PopupPage.tsx — postMessage bij elke wijziging**

- Voeg een `useEffect` toe die bij elke `state` wijziging een `postMessage` stuurt naar het iframe via een ref
- Payload bevat alle velden die de widget nodig heeft: headline, description, button_text, popup_type, primary_color, logo_url, featured_ticket, sticky_bar config, etc.
- Dit gebeurt onmiddellijk (niet debounced), zodat de preview instant reageert

**3. Nieuw tabblad — optioneel**

Het nieuwe tabblad (via "Preview openen") kan niet via postMessage bereikt worden tenzij we een `window.open` ref bewaren. Dit is fragiel. Twee opties:
- **Optie A**: Accepteer dat het nieuwe tabblad een snapshot is (huidige edge function config)
- **Optie B**: Het nieuwe tabblad gebruikt ook dezelfde message listener, en de parent bewaart een ref naar het geopende window

Aanbeveling: Optie A — het nieuwe tabblad is voor een eindcheck, niet voor live editing.

## Technisch detail

### Message format
```text
{
  type: 'nesto-popup-config-update',
  config: {
    headline, description, button_text, popup_type,
    primary_color, logo_url, featured_ticket,
    sticky_bar_enabled, sticky_bar_position,
    exit_intent_enabled, timed_popup_enabled,
    timed_popup_delay_seconds,
    success_message, gdpr_text, custom_button_url
  }
}
```

### PopupPreviewDemo rendering

De demo page krijgt een eigen rendering engine (puur vanilla JS in een useEffect) die:
- Een shadow DOM host maakt (of hergebruikt)
- Bij elk config-update de shadow DOM content vervangt
- Dezelfde CSS en HTML structuur gebruikt als het widget

Dit betekent een stuk van de widget logica wordt gedupliceerd in de demo page. Maar dit is bewust: de demo page is puur voor preview, het echte widget blijft ongewijzigd.

### PopupPage iframe ref

```text
const iframeRef = useRef<HTMLIFrameElement>(null);

useEffect(() => {
  if (previewType === 'live' && iframeRef.current) {
    iframeRef.current.contentWindow?.postMessage({
      type: 'nesto-popup-config-update',
      config: { ...state, primary_color: primaryColor, ... }
    }, '*');
  }
}, [state, primaryColor, featuredTicket, brandKit, previewType]);
```

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/pages/PopupPreviewDemo.tsx` | Message listener + lokale popup rendering engine toevoegen |
| `src/pages/marketing/PopupPage.tsx` | iframe ref + postMessage bij state changes |

## Resultaat

- Live iframe preview verandert direct mee bij elke wijziging
- Geen extra API calls naar de edge function
- Popup/bar mockup preview blijft werken zoals nu
- Widget edge function blijft ongewijzigd
- Nieuw tabblad toont een snapshot (acceptabel)
