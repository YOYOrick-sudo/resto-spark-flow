
# Fix: Dag-badge spacing en styling

## Probleem
De dag-badges in de Shifts tabel en wizards plakken aan elkaar (links in je screenshot). Ze missen horizontale padding en hebben te weinig gap. De correcte versie (rechts) toont losse pills met duidelijke ruimte ertussen.

## Betrokken componenten

### 1. Interactieve toggles (moeten pill-shaped worden)

| Bestand | Huidige styling | Fix |
|---------|----------------|-----|
| `TimesStep.tsx` (regel 114, 123) | `gap-1.5`, `w-9 h-9 rounded-button` | `gap-2`, verwijder `w-9 h-9`, voeg `px-3 py-1.5 rounded-control` toe |
| `ShiftModal.tsx` (regel 268, 277) | `gap-1.5`, `w-10 h-10 rounded-button` | `gap-2`, verwijder `w-10 h-10`, voeg `px-3 py-1.5 rounded-control` toe |

### 2. Tabelrij badges (moeten leesbaar zijn)

| Bestand | Huidige styling | Fix |
|---------|----------------|-----|
| `SortableShiftRow.tsx` (regel 118, 123) | `gap-[3px]`, `w-[18px] h-[18px] rounded-[4px]` | `gap-1`, `px-1.5 py-0.5 rounded-control` (verwijder fixed w/h) |
| `ShiftsTable.tsx` (gearchiveerd, regel 234, 239) | `gap-0.5`, `px-1 py-0.5 rounded` | `gap-1`, `px-1.5 py-0.5 rounded-control` |

### 3. Read-only overzicht (kleine aanpassing)

| Bestand | Huidige styling | Fix |
|---------|----------------|-----|
| `ReviewStep.tsx` (regel 94, 101) | `gap-1`, `w-6 h-6 rounded-full` | `gap-1.5`, `px-2 py-1 rounded-control` (verwijder `w-6 h-6`, pill in plaats van cirkel) |

### NIET gewijzigd
- `ShiftsLivePreviewPanel.tsx` — ronde selectorknoppen, ander UI-patroon (dag picker)

## Resultaat

| Eigenschap | Oud (broken) | Nieuw |
|------------|-------------|-------|
| Badge breedte | Fixed (w-9/w-10/w-[18px]) | Auto (content + padding) |
| Padding | Geen of minimaal | px-3 py-1.5 (interactive), px-1.5 py-0.5 (tabel) |
| Gap | 3-6px | 8px (interactive), 4px (tabel) |
| Border-radius | Mix van rounded-button/rounded-[4px]/rounded-full | `rounded-control` (6px) overal |

Totaal: 5 bestanden, alleen styling classes aangepast.
