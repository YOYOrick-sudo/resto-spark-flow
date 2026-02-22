

# Popup Automatisch Tonen + Sticky Bar Fix + Timed Slider

## 1. Timed popup slider aanpassen

De slider gaat van 5-60s (stappen van 5) naar **2-30s** (stappen van 1).

**Bestand:** `PopupPage.tsx` regel 479
- `min={5}` naar `min={2}`
- `max={60}` naar `max={30}`
- `step={5}` naar `step={1}`

## 2. Popup automatisch tonen als actief (edge function widget)

Wanneer een popup actief is maar geen exit-intent en geen timed popup aan staat, verschijnt de popup nu nooit voor bezoekers. Dat is niet logisch.

**Bestand:** `marketing-popup-widget/index.ts`
- Na de bestaande exit-intent en timed popup logica, voeg een fallback toe:
- Als `is_active` en geen timed popup en geen exit-intent: roep `showPopup()` aan na 500ms

## 3. Sticky bar fix in Live preview

De sticky bar werkt in de mockup-preview (tab "Sticky bar"), maar in de **Live iframe** preview kan het probleem zijn dat de popup overlay de sticky bar bedekt of dat de sticky bar buiten beeld valt in het iframe.

Na inspectie van `PopupPreviewDemo.tsx`: de `renderPopupInShadow` functie rendert zowel de popup overlay (met `position:fixed; inset:0`) als de sticky bar. De popup overlay bedekt het hele scherm met een semi-transparante achtergrond, waardoor de sticky bar erachter verdwijnt.

**Fix in `PopupPreviewDemo.tsx`:**
- Geef de sticky bar een hogere `z-index` dan de overlay (999999 vs 999998) zodat deze altijd zichtbaar blijft bovenop de popup

## 4. Console warning fixen

Er is een React warning: "Function components cannot be given refs" voor `PopupEditor`. Dit is geen crash maar moet opgelost worden.

**Fix:** Wrap `PopupEditor` met `React.forwardRef` of verwijder de ref-doorgifte als die niet nodig is (de `iframeRef` leeft al binnen de component zelf, dus er wordt geen externe ref doorgegeven -- de warning komt waarschijnlijk van een andere bron).

## Samenvatting bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/marketing/PopupPage.tsx` | Slider min/max/step aanpassen |
| `supabase/functions/marketing-popup-widget/index.ts` | Fallback: popup direct tonen als geen trigger actief |
| `src/pages/PopupPreviewDemo.tsx` | Sticky bar z-index verhogen zodat deze boven de overlay blijft |

