

# Cleanup: Naamgeving + Dots verwijderen

## Twee wijzigingen

### 1. Toggle-labels hernoemen
De knop die wisselt tussen de horizontale datumlijst en de maandkalender toont nu "Strip" / "Kalender". Dit wordt:
- **Week-modus actief**: toggle-knop toont "Maand"
- **Maand-modus actief**: toggle-knop toont "Week"

Logischer: je ziet wat je KRIJGT als je klikt, niet wat je NU ziet.

### 2. Busyness-dots verwijderen van datum (week + maand)
De gekleurde bolletjes (groen/oranje/rood) onder de datums voegen weinig toe voor een gast -- ze weten niet wat "rustig" of "druk" betekent en het maakt de keuze onnodig complex. 

**Verwijderen uit:**
- De week-weergave (horizontale scroll): de `busyness` dot-span onder elke dag
- De maand-weergave (inline kalender): de `busyness` dot-span onder elke cel
- Eventueel ook de `bg-red-50` achtergrond bij "low" availability time slots (de rode achtergrond is een impliciet signaal)

**Behouden bij:**
- Tijdslots: de amber en rode dots bij "medium" en "low" beschikbaarheid blijven staan -- daar is het wél relevant (bijna vol = urgentie)

## Technisch

### Bestand: `src/components/widget-mockups/MockWidgetA.tsx`

**Toggle-label (regel ~220):**
```
// Was: {calendarMode ? 'Strip' : 'Kalender'}
// Wordt: {calendarMode ? 'Week' : 'Maand'}
```

**Week-view dots verwijderen (regels ~248-256):**
Verwijder het `busyness`-blok met de gekleurde dots onder elke dag-knop.

**Maand-view dots verwijderen (regels ~315-323):**
Verwijder het `busyness`-blok met de gekleurde dots onder elke maandcel.

Geen nieuwe bestanden, geen dependencies.

