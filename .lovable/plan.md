

# Inchecken icoon wijzigen: UserCheck → LogIn

## Waarom
Het uitcheck-icoon is `LogOut` (pijl naar buiten / deur uit). Het inchecken-icoon is nu `UserCheck` — dat past visueel niet als tegenhanger. `LogIn` (pijl naar binnen / deur in) vormt een logisch paar met `LogOut`.

## Wijzigingen in 3 bestanden

### 1. `src/components/reserveringen/ReservationListView.tsx`
- Import: `UserCheck` vervangen door `LogIn`
- Regel 223: `<UserCheck>` wordt `<LogIn>` bij de inchecken-knop

### 2. `src/components/reservations/ReservationActions.tsx`
- Import: `UserCheck` vervangen door `LogIn`
- Regel 63: `icon: UserCheck` wordt `icon: LogIn` bij de inchecken-actie

### 3. `src/components/reserveringen/ReservationBlock.tsx`
- Import: `UserCheck` vervangen door `LogIn`
- Regel 235: `<UserCheck>` wordt `<LogIn>` bij het seated-status icoon in de grid view

## Resultaat
- Inchecken: `LogIn` (pijl naar binnen)
- Uitchecken: `LogOut` (pijl naar buiten)
- Duidelijk herkenbaar paar dat bij elkaar hoort

