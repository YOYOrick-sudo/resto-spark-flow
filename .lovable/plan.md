

# Fix Gerecht Detail — Breadcrumb + Empty States

De cards en sticky sidebar zijn al correct geïmplementeerd. Twee wijzigingen blijven over:

## 1. Breadcrumb fix (`KaartbeheerDetail.tsx`)

Huidig: `← Gerechten > [naam]`
Wordt: `← Kaartbeheer > Gerechten > [naam]`

Beide links wijzen naar `/kaartbeheer`.

## 2. Empty states (`GerechtComponentenTab.tsx`)

**Geen items**: Dashed-border box met beschrijvende tekst + outline knop:
- Halffabricaten: "Nog geen halffabricaten. Voeg een halffabricaat toe om de kostprijs te berekenen."
- Ingrediënten: "Nog geen losse ingrediënten."

**Wel items**: Lijst + kleinere ghost "+ Toevoegen" knop onderaan.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/KaartbeheerDetail.tsx` | Breadcrumb uitbreiden |
| `src/components/kaartbeheer/GerechtComponentenTab.tsx` | Empty states toevoegen |

