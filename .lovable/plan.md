

# Fix recalculateKostprijs + twee verbeterpunten

## 1. Fix: kostprijs_per_portie toevoegen (blokkerend)

In `src/hooks/useReceptMutations.ts`, de `recalculateKostprijs` mutation aanpassen:

- Eerst `porties` ophalen uit de recepten tabel
- `kostprijs_per_portie` berekenen en meesturen in de `.update()` call

## 2. Verbetering: allergenen pills tonen naam_nl (cosmetisch)

In `src/pages/Recepten.tsx`, in de allergenen kolom render: `a.allergenen?.code` vervangen door `a.allergenen?.naam_nl`.

## 3. Notitie: hoeveelheidswijziging triggert geen herberekening

Bekend punt — de `useEffect` in IngredintenTab luistert alleen op `recept_ingredienten.length`, niet op individuele hoeveelheidswijzigingen. Wordt niet in deze wijziging meegenomen (zoals aangegeven: later oppakken).

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/hooks/useReceptMutations.ts` | `recalculateKostprijs` mutation: porties ophalen + kostprijs_per_portie meesturen |
| `src/pages/Recepten.tsx` | Allergenen badge: `code` → `naam_nl` |

