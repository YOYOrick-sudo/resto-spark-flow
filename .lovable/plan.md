

# Fix: Reviews pagina crash

## Oorzaak

De crash is een Radix UI `Select.Item` error: **"A Select.Item must have a value prop that is not an empty string."**

De drie `NestoSelect` filter dropdowns op de Reviews pagina gebruiken `value: ''` voor de "Alle" optie (regels 235, 246, 258). Radix UI staat geen lege string toe als `SelectItem` value — dit gooit een hard error die de hele pagina crasht via de error boundary.

## Oplossing

Twee edits:

### 1. NestoSelect component (structurele fix)

**`src/components/polar/NestoSelect.tsx`**

Filter lege-string values uit de `SelectItem` rendering. Voeg een speciale `_all` sentinel value toe: als een optie `value: ''` heeft, render het niet als `SelectItem` maar als placeholder-gedrag. Concreet:

- In de `options.map()` loop (regel 82-91): filter opties met `value === ''` uit
- Voeg een `_all` transformatie toe: als een optie `value: ''` heeft, vervang met `value: '_all'`
- In `onValueChange` wrapper: als de waarde `'_all'` is, stuur `''` terug naar de parent

Dit fixt het probleem op component-niveau zodat elke pagina die `value: ''` gebruikt automatisch werkt.

### 2. ReviewsPage (geen wijziging nodig)

De `ReviewsPage` code hoeft niet te veranderen — de fix in `NestoSelect` vangt het op. De `onValueChange` handlers gebruiken al `v || undefined` waardoor de `'_all'` -> `''` transformatie correct doorwerkt.

## Technisch detail

De fix in NestoSelect:
- Wrap `onValueChange` in een handler die `'_all'` terug vertaalt naar `''`
- Map inkomende `value === ''` naar `'_all'` voor de Radix `Select` component
- Map opties met `value === ''` naar `value: '_all'` voor `SelectItem` rendering

Dit is backward-compatible: alle bestaande gebruikers van NestoSelect met lege-string opties worden automatisch gefixt.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/components/polar/NestoSelect.tsx` | Edit: empty-string value sentinel mapping |

