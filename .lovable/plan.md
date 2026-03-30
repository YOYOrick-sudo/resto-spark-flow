

# Sidebar Premium Polish

De sidebar is functioneel solide maar kan visueel verfijnder. Hier zijn de verbeteringen:

---

## Wijzigingen

### 1. Zoekbalk — subtielere styling
- Achtergrond naar `bg-muted/50` i.p.v. `bg-background` met border
- Border verwijderen in default state, alleen border op hover/focus
- `rounded-xl` voor zachtere vorm
- ⌘K badge: kleiner, `text-[10px]`, subtielere achtergrond

### 2. Menu items — betere active state
- Active items: zachte `bg-card shadow-sm` i.p.v. alleen `bg-card border-border` — schaduw geeft diepte
- Hover state: `hover:bg-accent/40` met subtiele overgang
- Padding verhogen naar `py-2 px-3` voor meer ademruimte
- Icon size naar 18px voor betere balans

### 3. Section labels — verfijnder
- Letter-spacing iets vergroten (`tracking-[0.12em]`)
- Font-size naar `text-[10px]` voor meer contrast met menu items
- Meer spacing erboven (`pt-6`)

### 4. Sub-items — strakker
- Verticale lijn: van `muted-foreground/25` naar `border/80` — subtielere kleur
- Active sub-item: toevoegen van een kleine teal dot (4px) links van het label als indicator

### 5. Footer — premium user card
- User avatar: subtiele `ring-1 ring-border` eromheen
- Restaurant naam: `text-xs text-muted-foreground` (kleiner, secundair)
- User naam: `text-sm font-medium`
- Hele footer card: `bg-muted/30 rounded-xl mx-2 mb-2 p-2.5` — floating card effect

### 6. Header — cleaner
- Icoon knoppen (Zap, PanelLeft): `hover:bg-accent/50 rounded-lg` voor consistentie
- Meer spacing onder header (`pb-2`)

---

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/layout/NestoSidebar.tsx` | Alle bovenstaande polish |

Geen nieuwe bestanden, geen functionele wijzigingen. Puur visuele verfijning.

