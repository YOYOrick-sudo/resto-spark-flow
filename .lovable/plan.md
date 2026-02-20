

# Availability Indicators: Enterprise-waardig in Beide Mockups

## Samenvatting

Beide mockups krijgen subtiele, enterprise-waardige availability indicators op de tijdslots. Het principe: "high" = geen indicator (beschikbaar is de default), alleen "medium" en "low" worden visueel gemarkeerd -- consistent met het Nesto Polar design principe "data IS het design".

---

## Mockup A: Subtiele tekst-labels onder tijdslots

De 3-kolom grid blijft, maar slots met beperkte beschikbaarheid krijgen een klein label eronder:

```text
+-----------+  +-----------+  +-----------+
|   17:00   |  |   17:30   |  |   18:00   |
+-----------+  +-----------+  +-----------+

+-----------+  +-----------+  +-----------+
|   18:30   |  |   19:00   |  |   19:30   |
| Bijna vol |  | Bijna vol |  |Laatste pl.|
+-----------+  +-----------+  +-----------+
```

- Import `SLOT_AVAILABILITY` uit mockData
- `high`: geen extra element (schoon, default)
- `medium`: klein `text-[10px] text-amber-600` label "Bijna vol" onder de tijd
- `low`: klein `text-[10px] text-red-500` label "Laatste plekken" onder de tijd, plus een subtiele `bg-red-50` achtergrond op de button zelf
- Unavailable: blijft doorgestreept zoals nu
- Geselecteerde staat: label wordt wit (`text-white/70`) zodat het leesbaar blijft op donkere achtergrond
- Buttons worden iets hoger (`py-3` -> `py-2.5 pb-4`) om ruimte te maken voor het label
- Onder de grid een compacte legenda met twee items: amber dot + "Bijna vol", rode dot + "Laatste plekken"

## Mockup B: Verfijning van bestaande dots

De chip-stijl met dots werkt al, maar wordt opgepoetst:

- `high` availability: dot volledig weglaten (geen visuele ruis voor de default)
- `medium`: dot blijft (amber), geen extra tekst
- `low`: dot wordt rood met een subtiele glow (`shadow-[0_0_4px_rgba(239,68,68,0.3)]`), plus tekst "Laatste plekken" als klein label rechts van de tijd binnen de chip
- Legenda onderaan: alleen "Bijna vol" en "Laatste plekken" tonen (verwijder "Beschikbaar" -- dat is de default)
- Geselecteerde chip: checkmark blijft, dot/label verdwijnt (wit op donker)

---

## Technische details

### Bestanden

1. **`src/components/widget-mockups/MockWidgetA.tsx`** -- Step 3 aanpassen: import `SLOT_AVAILABILITY`, availability labels toevoegen, legenda onderaan
2. **`src/components/widget-mockups/MockWidgetB.tsx`** -- Step 3 aanpassen: dots voor "high" weglaten, glow op "low" dots, tekst bij "low" chips, legenda inkorten

### Geen nieuwe dependencies of bestanden nodig

