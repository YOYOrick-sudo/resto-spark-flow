

# Fix: Dubbele Card Effect Verwijderen

## Probleem
Sonner's `toast.custom()` rendert de content binnen een wrapper `<li>` element dat standaard eigen styling heeft (achtergrond, border, shadow, padding). Jouw custom toast-div voegt daar nog een card overheen — dus je ziet twee geneste kaarten.

## Oplossing
De Sonner wrapper volledig transparant maken via CSS, zodat alleen de custom card zichtbaar is. Dit doen we door de `.nesto-toast` class in `src/index.css` te overriden met `background: transparent`, `border: none`, `box-shadow: none`, en `padding: 0`.

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `src/index.css` | `.nesto-toast` class toevoegen/aanpassen: `background: transparent; border: none; box-shadow: none; padding: 0;` |

De toast functies in `TestToasts.tsx` blijven ongewijzigd — alleen de wrapper wordt onzichtbaar gemaakt.
