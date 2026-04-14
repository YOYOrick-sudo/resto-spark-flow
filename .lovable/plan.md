

# Refactor Gerecht Detail: Panel → Volledige Pagina

## Overzicht
Vervang het NestoPanel-gebaseerde gerecht detail door een volledige pagina op `/kaartbeheer/:id`. Twee-kolom layout op desktop, gestapeld op mobiel. Kostprijs samenvatting verhuist van de Componenten tab naar een sticky rechter sidebar card.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/pages/KaartbeheerDetail.tsx` | Herschrijven — volledige detail pagina |
| `src/components/kaartbeheer/GerechtOverzicht.tsx` | Wijzigen — navigate i.p.v. panel openen |
| `src/components/kaartbeheer/GerechtComponentenTab.tsx` | Wijzigen — kostprijs samenvatting card verwijderen (verhuist naar sidebar) |
| `src/components/kaartbeheer/NieuwGerechtPanel.tsx` | Wijzigen — navigate na aanmaken |
| `src/components/kaartbeheer/GerechtDetailPanel.tsx` | Verwijderen |

## KaartbeheerDetail.tsx (herschrijven)

- `useParams` voor `id`, `useGerechtDetail(id)`, `useGerechtMutations`, `useKeukenSettings`
- Breadcrumb: `Kaartbeheer > Gerechten > {naam}` via `Link` componenten
- `lg:grid-cols-5` layout, `gap-6`

**Linker kolom (col-span-3)**:
- NestoTabs: Componenten | Allergenen (geen Algemeen tab meer)
- `GerechtComponentenTab` (zonder kostprijs samenvatting — die zit rechts)
- `GerechtAllergenenTab`

**Rechter kolom (col-span-2, `lg:sticky lg:top-6 lg:self-start`)**:

Card 1 — Gerecht info:
- Naam input, categorie NestoSelect, beschrijving Textarea, verkoopprijs input (€), actief Switch
- Lokale state met `useEffect` sync (zoals huidige AlgemeenTab)

Card 2 — Kostprijs samenvatting:
- Halffabricaten/Ingrediënten/Totaal/Verkoopprijs/Marge/Food cost
- Berekend uit `gerecht.componenten` (zelfde logica als huidige `GerechtComponentenTab`)

Card 3 — Acties:
- Opslaan knop (updateGerecht)
- Archiveren knop (archiveerGerecht)

## GerechtOverzicht.tsx (wijzigen)

- Verwijder `GerechtDetailPanel` import en render
- Verwijder `selectedId`/`detailTab` state
- Rij klik: `navigate(\`/kaartbeheer/${g.id}\`)`
- `NieuwGerechtPanel.onCreated`: `navigate(\`/kaartbeheer/${id}\`)`

## GerechtComponentenTab.tsx (wijzigen)

- Verwijder de "Kostprijs samenvatting" card onderaan (regels 278-313)
- Houd halffabricaten + ingrediënten secties + add-formulieren

## NieuwGerechtPanel.tsx (wijzigen)

- `onCreated` callback blijft, maar wordt nu aangeroepen met navigate in het overzicht

## GerechtDetailPanel.tsx

- Verwijderen — niet meer nodig

