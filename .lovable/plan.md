

# Gerechten Module — Bouwen met Fixes Inbegrepen

De Gerechten module is nog niet geïmplementeerd. De 4 fixes worden direct meegenomen in de bouw.

## Wat wordt gebouwd

**Database**: `gerechten` + `gerecht_componenten` tabellen, triggers voor kostprijs/marge herberekening, RLS, `gerecht_categorieen` JSONB op locations.

**Hooks** (4 nieuw):
- `useGerechten` — lijst met filtering
- `useGerechtDetail` — single met componenten join
- `useGerechtMutations` — CRUD + **Fix 4**: `kostprijs_snapshot` vullen bij addComponent
- `useGerechtAllergenen` — aggregatie uit componenten

**Bestaande hooks** (useHalffabricaatSearch, useIngredientSearch) bestaan al en worden hergebruikt. useHalffabricaatSearch mist `porties` en `totale_kostprijs` in de select — dit wordt toegevoegd (**Fix 1**).

**UI** (5 nieuw):
- `GerechtOverzicht` — overzicht + **Fix 3**: allergenen badges per rij (max 4, "+X")
- `GerechtDetailPanel` — 3 tabs (Algemeen, Componenten, Allergenen)
- `GerechtComponentenTab` — halffabricaten + ingrediënten beheer
- `GerechtAllergenenTab` — read-only allergenen grid
- `NieuwGerechtPanel` — aanmaak panel

**Wijzigingen bestaand**:
- `useHalffabricaatSearch.ts` — `porties, totale_kostprijs` toevoegen aan select
- `Kaartbeheer.tsx` — placeholder vervangen door GerechtOverzicht
- `useKeukenSettings.ts` + `SettingsKeuken.tsx` — gerecht_categorieen

## Fixes inbegrepen

1. **useHalffabricaatSearch**: select uitbreiden met `porties, totale_kostprijs` (nodig voor kostprijs berekening in componenten)
2. **useIngredientSearch**: bestaat al, geen wijziging nodig
3. **Allergenen in overzicht**: `useGerechtAllergenen` hook per rij, toon max 4 pills + "+X"
4. **kostprijs_snapshot**: in addComponent eerst kostprijs ophalen voor insert

## Bestanden

| Bestand | Actie |
|---|---|
| Database migratie | Nieuw |
| `src/hooks/useHalffabricaatSearch.ts` | Select uitbreiden |
| `src/hooks/useGerechten.ts` | Nieuw |
| `src/hooks/useGerechtDetail.ts` | Nieuw |
| `src/hooks/useGerechtMutations.ts` | Nieuw (met Fix 4) |
| `src/hooks/useGerechtAllergenen.ts` | Nieuw |
| `src/components/kaartbeheer/GerechtOverzicht.tsx` | Nieuw (met Fix 3) |
| `src/components/kaartbeheer/GerechtDetailPanel.tsx` | Nieuw |
| `src/components/kaartbeheer/GerechtComponentenTab.tsx` | Nieuw |
| `src/components/kaartbeheer/GerechtAllergenenTab.tsx` | Nieuw |
| `src/components/kaartbeheer/NieuwGerechtPanel.tsx` | Nieuw |
| `src/pages/Kaartbeheer.tsx` | Herschrijven |
| `src/hooks/useKeukenSettings.ts` | gerecht_categorieen |
| `src/pages/SettingsKeuken.tsx` | CategoryManager |

