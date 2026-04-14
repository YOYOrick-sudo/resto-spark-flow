

# Methodes UI: Enterprise inline-edit tabel

## Waarom niet collapsible cards?

Collapsible accordions voelen als een "admin panel" pattern, niet als een enterprise tool. Linear, Notion en Stripe gebruiken **compact inline-editable rows** voor dit soort lijsten. Dat past beter bij Nesto Polar:

- Alles in een oogopslag zichtbaar (geen klik nodig om data te zien)
- Hogere informatiedichtheid
- Sneller editen zonder open/dicht gedoe
- Professioneler gevoel

## Voorstel: Inline-edit tabelweergave

```text
┌──────────────────────────────────────────────────────────────┐
│  #   Type         Output      Duur    Houdbaar   Sub-recept │
├──────────────────────────────────────────────────────────────┤
│  1   [Bereiden ▾]  1 [kg ▾]   30 min   3 d       [Tomatensaus ▾] │
│  2   [Snijden  ▾]  2 [kg ▾]   15 min   —         instructie...   │
├──────────────────────────────────────────────────────────────┤
│  [ + Methode toevoegen ]                                     │
└──────────────────────────────────────────────────────────────┘
```

### Kenmerken
- Compacte rijen met inline selects en inputs (geen labels, kolom-headers doen dat)
- Elke rij heeft een volgnummer, hover toont delete-icoon rechts
- Alle velden direct bewerkbaar, geen expand/collapse nodig
- Instructie/sub-recept toont als laatste kolom, klikbaar om te openen in een kleine inline textarea
- Tabular-nums voor getallen
- `py-2.5 px-3` compact density (conform Nesto design patterns)

### Optioneel: expandable row voor instructie
Alleen het instructie-veld (textarea) kan expandable zijn per rij via een klein chevron-icoon. Zo blijft de tabel compact maar is er ruimte voor langere tekst wanneer nodig.

## Wijzigingen

### `src/components/recepten/tabs/MethodesTab.tsx`
- Vervang losse `MethodeCard` componenten door een compacte tabel-layout
- Kolommen: #, Type (select), Output (number + eenheid select), Duur, Houdbaar, Sub-recept/Instructie, Delete
- Inline editing: selects en inputs direct in de rij
- Hover state op rij toont delete-knop (opacity transition)
- Optionele instructie-row die uitklapt onder de hoofdrij

### `src/components/recepten/wizard/ReceptStapMethodes.tsx`  
- Zelfde tabel-layout voor consistentie
- Zonder sub-recept kolom (die is wizard-irrelevant)

**Totaal: 2 bestanden, 0 migraties.**

