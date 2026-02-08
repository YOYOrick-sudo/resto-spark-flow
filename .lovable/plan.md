

## Fix 8, 9 en 11 in één keer

### Fix 8: Hover States Reserveringsrijen

**Bestand: `src/components/reserveringen/ReservationListView.tsx` (regel 125)**

De huidige hover is `hover:bg-secondary/50`. Dit wordt gewijzigd naar:
- `hover:bg-muted/30`
- `transition-colors duration-150` (vervangt huidige `transition-colors`)
- `cursor-pointer` (staat er al)

### Fix 9: Allergenen "Geen" Badge Verwijderen

**Bestand: `src/pages/Ingredienten.tsx` (regels 326-330)**

Het `else`-blok dat de "Geen" badge rendert wordt vervangen door `null`. Lege allergenen = lege cel.

### Fix 11: Assistent Notification Dot

**Bestand: `src/components/layout/NestoSidebar.tsx` (regels 58-63)**

Het Assistent menu-item is een regulier link-item (id: `assistent`). De aanpak:

1. Importeer `mockAssistantItems` uit `@/data/assistantMockData`
2. Bereken `hasAttentionSignals` via een `useMemo` die checkt of er items zijn met `actionable === true` en `severity === 'error' || severity === 'warning'`
3. Voeg in het reguliere link-item blok (rond regel 183) een conditionele dot toe na de label `<span>`:

```tsx
{item.id === 'assistent' && hasAttentionSignals && (
  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-auto flex-shrink-0" />
)}
```

De dot is 6px (`w-1.5 h-1.5`), `bg-orange-500`, `rounded-full`, gepositioneerd rechts via `ml-auto`.

### Documentatie

**Bestand: `docs/design/COLOR_PALETTE.md`** - Nieuwe sectie "TABLE ROW INTERACTION" met het hover-standaard.

**Bestand: `docs/design/INLINE_DATA_TABLES.md`** - Notitie toevoegen: lege waarden worden leeg gelaten, geen "Geen"/"N/A" badges.

### Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/components/reserveringen/ReservationListView.tsx` | Hover class aanpassen naar `hover:bg-muted/30 transition-colors duration-150` |
| `src/pages/Ingredienten.tsx` | "Geen" badge verwijderen, `null` teruggeven bij lege allergenen |
| `src/components/layout/NestoSidebar.tsx` | Import mock data, bereken `hasAttentionSignals`, toon 6px orange dot bij Assistent |
| `docs/design/COLOR_PALETTE.md` | Sectie "TABLE ROW INTERACTION" toevoegen |
| `docs/design/INLINE_DATA_TABLES.md` | Notitie over lege waarden toevoegen |

