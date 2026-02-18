
# Fix: LogIn icoon visueel even groot maken als LogOut

## Probleem
Het `LogIn` (inchecken) icoon oogt visueel kleiner dan het `LogOut` (uitchecken) icoon, ondanks dezelfde CSS afmetingen. Dit komt doordat de Lucide SVG-paden van `LogIn` minder visueel gewicht hebben dan `LogOut`.

## Oplossing
Vergroot het `LogIn` icoon licht zodat het visueel matcht met `LogOut`.

### Bestanden die gewijzigd worden:

**1. `src/components/reserveringen/ReservationListView.tsx` (regel 245)**
- Van: `<LogIn className="h-4 w-4" />`
- Naar: `<LogIn className="h-[18px] w-[18px]" />`

**2. `src/components/reserveringen/ReservationBlock.tsx` (regel 235)**
- Van: `<LogIn className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />`
- Naar: `<LogIn className="h-4 w-4 text-emerald-600 flex-shrink-0" />`

De `LogOut` iconen blijven ongewijzigd (`h-4 w-4`). Het `ReservationActions.tsx` bestand hoeft niet aangepast te worden omdat daar alleen icon-referenties worden doorgegeven (de rendering-grootte wordt elders bepaald).
