

# Fix: Popup "flashy" re-render bij config updates

## Probleem

Elke keer dat de editor een postMessage stuurt (bij elke wijziging), wordt `renderPopupInShadow` aangeroepen die:
1. `shadow.innerHTML = ''` -- alles wist
2. De overlay opnieuw aanmaakt met `opacity: 0`
3. Via `requestAnimationFrame` de class `visible` toevoegt (opacity: 1)

Dit veroorzaakt een zichtbare flash/fade-in bij elke toetsaanslag.

## Oplossing

Bij een re-render (niet de eerste keer) de transitie overslaan door de `visible` class direct mee te geven in plaats van via `requestAnimationFrame`.

### Bestand: `src/pages/PopupPreviewDemo.tsx`

**Wijziging 1**: `renderPopupInShadow` krijgt een parameter `skipAnimation: boolean`

- Als `skipAnimation` true is: overlay en sticky bar krijgen direct de class `visible` (geen fade)
- Als false: huidige gedrag met `requestAnimationFrame` behouden

**Wijziging 2**: Eerste render (via edge function widget) blijft animeren. De `handleMessage` callback roept `renderPopupInShadow` aan met `skipAnimation = true`.

Concreet:
- Regel 74: signature wordt `function renderPopupInShadow(shadow: ShadowRoot, cfg: PopupConfig, skipAnimation = false)`
- Regel 121: overlay class wordt `'nesto-overlay' + (skipAnimation ? ' visible' : '')`
- Regel 128: `requestAnimationFrame` wordt gewrapped: `if (!skipAnimation) { requestAnimationFrame(...) }`
- Regel 144: zelfde voor sticky bar class
- Regel 157: zelfde voor sticky bar `requestAnimationFrame`
- Regel 219: aanroep wordt `renderPopupInShadow(shadowRootRef.current, cfg, true)`

## Resultaat

- Eerste load: popup animeert netjes in (fade + slide)
- Config updates via editor: popup update instant zonder flash
- Sticky bar idem

