

# Leveranciers UX Verbetering

## Overzicht

5 wijzigingen: leveranciers naar eigen pagina, nieuwe leverancier via sidebar, inline artikelen, horizontale filters, waste kosten check.

## Wijzigingen

### 1. Leveranciers eigen pagina (`/inkoop/leveranciers`)

Nieuwe pagina `src/pages/Leveranciers.tsx`:
- PageHeader "Leveranciers" met "+ Nieuwe leverancier" knop
- Zoekbalk + actief/inactief filter (horizontaal)
- DataTable met kolommen: naam, type badge, contact, email, artikelen count, actief toggle
- Klik op rij → `LeverancierDetailPanel` opent als NestoPanel sidebar

Route toevoegen in `App.tsx`: `<Route path="/inkoop/leveranciers" element={<Leveranciers />} />`

Navigation update in `navigation.ts`: route map entry + `getExpandedGroupFromPath` match.

### 2. Inkoop pagina: knop navigeert i.p.v. modal

`src/pages/Inkoop.tsx`:
- "Leveranciers beheren" knop → `useNavigate('/inkoop/leveranciers')` i.p.v. modal state
- Verwijder `LeveranciersModal` import en state
- Verwijder `src/components/inkoop/LeveranciersModal.tsx` (niet meer nodig)

### 3. Nieuwe leverancier via NestoPanel

`src/pages/Leveranciers.tsx`:
- "+ Nieuwe leverancier" knop → opent NestoPanel met formulier (stap 1: basisgegevens)
- Na opslaan: panel blijft open, schakelt naar detail view met lege artikelen lijst
- State: `mode: 'nieuw' | 'detail'` + `selectedId`

Verwijder `src/components/inkoop/NieuwLeverancierModal.tsx` (niet meer nodig).

### 4. LeverancierDetailPanel herschrijven

`src/components/inkoop/LeverancierDetailPanel.tsx`:
- Twee modes: `create` (formulier) en `detail` (bestaande leverancier)
- Detail mode: basisgegevens (read-only of inline edit) + artikelen lijst
- Artikelen toevoegen: inline uitklapbaar formulier (accordion) binnen de sidebar
- Geen aparte modal — alles in dezelfde NestoPanel context
- Props uitbreiden: `mode: 'create' | 'detail'`, `onCreated: (id) => void`

### 5. OrderhistorieTab: horizontale filters

`src/components/inkoop/OrderhistorieTab.tsx`:
- Filters staan al horizontaal via `flex flex-wrap gap-3` — dit is correct ✅
- Geen wijziging nodig

### 6. WasteRegistreerForm: geschatte kosten

- Al geïmplementeerd en zichtbaar ✅ (regels 149-154)
- Geen wijziging nodig

## Bestanden

| Bestand | Actie |
|---|---|
| `src/pages/Leveranciers.tsx` | Nieuw — volledige leveranciers pagina |
| `src/components/inkoop/LeverancierDetailPanel.tsx` | Herschrijven — create + detail mode, inline artikelen |
| `src/pages/Inkoop.tsx` | Wijzigen — navigatie i.p.v. modal |
| `src/App.tsx` | Wijzigen — route toevoegen |
| `src/lib/navigation.ts` | Wijzigen — route map + expanded group |
| `src/components/inkoop/LeveranciersModal.tsx` | Verwijderen |
| `src/components/inkoop/NieuwLeverancierModal.tsx` | Verwijderen |

