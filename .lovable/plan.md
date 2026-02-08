

## Polish: Reserveringenpagina visueel afronden

Acht gerichte visuele verbeteringen die de reserveringenpagina professioneel afmaken. Geen functionele wijzigingen -- puur visual polish.

---

### 1. Lijstweergave -- Status badges (teal-familie)

De `reservationStatusConfig` in `src/data/reservations.ts` heeft al de juiste teal-kleurenfamilie. De badges in `ReservationListView.tsx` gebruiken deze config correct via `statusConfig.textClass`, `bgClass`, `borderClass` en `dotColor`. De "Completed" status heeft `textClass: 'text-muted-foreground opacity-50'` en geen `bgClass`, wat al gedempt is. Dit zit dus goed -- geen wijziging nodig.

**Bestand**: geen wijziging

---

### 2. Lijstweergave -- ED/LD badges neutraal maken

De shift badges (regel 175-181 in `ReservationListView.tsx`) gebruiken nu `variant="primary"` voor ED (teal) en `variant="default"` voor LD. Beide moeten neutraal worden: metadata, geen status.

**Bestand**: `src/components/reserveringen/ReservationListView.tsx`

Wijziging op regel 175-181:
```tsx
// Van:
<NestoBadge
  variant={reservation.shift === "ED" ? "primary" : "default"}
  size="sm"
  className="w-10 justify-center"
>

// Naar:
<NestoBadge
  variant="outline"
  size="sm"
  className="w-10 justify-center text-muted-foreground"
>
```

---

### 3. Lijstweergave -- Notities styling verfijnen

De notities (regel 166-172) zijn al `italic text-muted-foreground`. De opacity kan iets lager zodat ze meer op de achtergrond staan.

**Bestand**: `src/components/reserveringen/ReservationListView.tsx`

Wijziging op regel 168:
```tsx
// Van:
<span className="text-sm text-muted-foreground italic truncate">

// Naar:
<span className="text-sm text-muted-foreground/70 italic truncate">
```

---

### 4. Gridweergave -- Pacing rij versterken

De `SeatedCountRow` in `ReservationGridView.tsx` (regel 198) heeft `border-b border-border`. Dit wordt een sterkere scheiding en de pacing getallen gaan van `text-xs` (huidig) naar `text-[11px]` voor een subtielere look.

**Bestand**: `src/components/reserveringen/ReservationGridView.tsx`

Wijziging op regel 198:
```tsx
// Van:
<div className="flex border-b border-border bg-secondary">

// Naar:
<div className="flex border-b-2 border-border bg-secondary">
```

Wijziging op regel 227 (pacing cel `text-xs`):
```tsx
// Van:
className={cn(
  "text-xs flex items-center justify-center py-2 cursor-pointer..."

// Naar:
className={cn(
  "text-[11px] flex items-center justify-center py-2 cursor-pointer..."
```

---

### 5. Gridweergave -- Reserveringsblokken verfijnen

In `ReservationBlock.tsx`:

a) "Confirmed" achtergrond lichter maken (regel 108):
```tsx
// Van:
case "confirmed":
  return "bg-primary/15 border-primary/50";

// Naar:
case "confirmed":
  return "bg-primary/10 border-primary/40";
```

b) Telefoon-icoon en shift badge verbergen in grid (tonen alleen op hover). Regel 288-304:
```tsx
// Phone: voeg opacity-0 group-hover:opacity-100 transition-opacity toe
{reservation.phone && !reservation.isWalkIn && displayPosition.width > 100 && (
  <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
)}

// Shift badge: idem
{displayPosition.width > 140 && (
  <span
    className={cn(
      "text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity",
      ...
    )}
  >
```

---

### 6. Gridweergave -- Lege beschikbare slots subtiel markeren

In `TableRow.tsx`, de lege quarter-hour cellen (regel 131-144) krijgen een heel subtiele achtergrond zodat "leeg en beschikbaar" zichtbaar verschilt van "leeg en niet beschikbaar":

```tsx
// Voeg een subtiele even/odd styling toe aan de cel:
// De bestaande hover:bg-primary/10 blijft; voeg bg-background/30 toe als base
className={cn(
  "h-full cursor-pointer transition-colors hover:bg-primary/10",
  index % 4 === 0 ? "border-l border-border/50" : "border-l border-border/20",
  isDropTarget && ghostStartTime === time && "bg-primary/20 ring-2 ring-primary ring-inset"
)}
```

Aangezien de beschikbaarheid per tafel al visueel wordt aangegeven met de rode/groene dot links, en niet-beschikbare tafels altijd beschikbaar zijn in de grid (alleen niet online bookable), is een subtiele achtergrondkleur hier niet zinvol -- de rode dot doet dit werk al. Geen wijziging hier.

---

### 7. Bottom bar -- Dividers en highlighting

In `ReservationFooter.tsx`:

a) Dividers toevoegen tussen items (regel 39-48):
```tsx
// Center stats met dividers:
<div className="flex items-center gap-4">
  <div className="text-sm">
    <span className="font-medium text-foreground">{totalGuests}</span>
    <span className="text-muted-foreground ml-1">gasten vandaag</span>
  </div>
  <div className="h-4 w-px bg-border" />
  <div className="text-sm">
    <span className="font-medium text-foreground">{waitingCount}</span>
    <span className="text-muted-foreground ml-1">wachtend</span>
  </div>
</div>
```

b) Ook dividers links en rechts van het center blok:
```tsx
// Links van stats: divider na Notities knop
// Rechts van stats: divider voor Open status
```

---

### 8. View toggles -- Actieve state duidelijker

In `ViewToggle.tsx`, de actieve toggle krijgt een teal tint (regel 38-42):

```tsx
// Van:
isActive
  ? "bg-card text-foreground shadow-sm"
  : "text-muted-foreground hover:text-foreground hover:bg-background/50"

// Naar:
isActive
  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
```

---

### Samenvatting bestanden

| Bestand | Wijzigingen |
|---|---|
| `src/components/reserveringen/ReservationListView.tsx` | ED/LD badge neutraal, notities opacity |
| `src/components/reserveringen/ReservationGridView.tsx` | Pacing rij border + tekst kleiner |
| `src/components/reserveringen/ReservationBlock.tsx` | Confirmed lichter, phone/shift hidden tot hover |
| `src/components/reserveringen/ReservationFooter.tsx` | Dividers tussen items |
| `src/components/reserveringen/ViewToggle.tsx` | Actieve toggle teal accent |

