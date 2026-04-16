

# Plan: Vervang Panel door Full-Page Navigatie in Orderhistorie

## Samenvatting

Vervang het `BestellingDetailPanel` in `OrderhistorieTab.tsx` door `useNavigate()` navigatie naar `/inkoop/bestellingen/:id`. Verwijder het panel-bestand — het wordt nergens anders gebruikt.

## Wijzigingen

### 1. `src/components/inkoop/OrderhistorieTab.tsx`

- Verwijder `import { BestellingDetailPanel }` en `useState` voor `selectedId`
- Voeg `import { useNavigate } from "react-router-dom"` toe
- `onRowClick` wordt `(b) => navigate(\`/inkoop/bestellingen/\${b.id}\`)`
- Verwijder `<BestellingDetailPanel ... />` rendering

### 2. `src/components/inkoop/BestellingDetailPanel.tsx`

- **Verwijder bestand** — geen andere imports gevonden

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/inkoop/OrderhistorieTab.tsx` | Refactor: panel → navigate |
| `src/components/inkoop/BestellingDetailPanel.tsx` | **Verwijderen** |

