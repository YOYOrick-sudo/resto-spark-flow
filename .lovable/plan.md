

# Hernoem "Recepten" → "Halffabricaten" (user-facing labels)

Alle user-facing tekst wordt hernoemd. Routes, DB-tabellen en interne code (hooks, types, variabelen) blijven ongewijzigd.

## Wijzigingen per bestand

| Bestand | Wat verandert |
|---------|--------------|
| **src/lib/navigation.ts** | Sidebar label `'Recepten'` → `'Halffabricaten'` (regel ~89) |
| **src/pages/Recepten.tsx** | Titel `"Recepten"` → `"Halffabricaten"`, subtekst → `"Je sauzen, bouillons, marinades en andere bereidingen."`, knop `"Nieuw recept"` → `"Nieuw halffabricaat"`, emptyMessage → `"Nog geen halffabricaten toegevoegd"` |
| **src/pages/ReceptenDetail.tsx** | Back-link tekst `"Recepten"` → `"Halffabricaten"` (regel 121), not-found tekst `"Recept niet gevonden"` → `"Halffabricaat niet gevonden"`, archiveer-dialog `"Recept archiveren"` → `"Halffabricaat archiveren"` |
| **src/pages/ReceptenNieuw.tsx** | Success toast `'Recept "..." aangemaakt!'` → `'Halffabricaat "..." aangemaakt!'` |
| **src/hooks/useReceptMutations.ts** | Toast `"Recept aangemaakt"` → `"Halffabricaat aangemaakt"`, `"Recept gearchiveerd"` → `"Halffabricaat gearchiveerd"` |
| **src/components/dashboard/ReceptenTile.tsx** | Label `"Recepten"` → `"Halffabricaten"`, count-tekst `"recepten"` → `"halffabricaten"` |
| **src/components/kaartbeheer/GerechtComponentenTab.tsx** | Toast subtitle `"Vul het recept verder in op de recepten pagina."` → `"Vul het halffabricaat verder in op de halffabricaten pagina."` |

## Wat NIET verandert
- Routes (`/recepten`, `/recepten/:id`, `/recepten/nieuw`) — bookmarks blijven werken
- Database tabel `recepten`
- Interne code: hook-namen, type-namen, variabelen
- Wizard titel "Wat ga je bereiden?"
- Zoekbalk placeholder
- Tab "Bereiding" binnen detail pagina

