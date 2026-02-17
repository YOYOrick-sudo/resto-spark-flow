
# Fix ReservationsTile: gasten-telling en echte grafiekdata

## Probleem 1: Hero getal toont aantal reserveringen i.p.v. gasten

Het Dashboard berekent `todayCount` als het **aantal** reserveringen (`.length`). Dit moet de **som van party_size** worden zodat het totaal aantal gasten wordt getoond.

### Wijziging in `src/pages/Dashboard.tsx`

Hernoem `todayCount` naar `todayGuests` en bereken de som:
```typescript
const todayGuests = useMemo(
  () => (reservations ?? [])
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.party_size, 0),
  [reservations]
);
```

Voeg daarnaast een query toe voor de **afgelopen 7 dagen** aan reserveringsdata. Dit kan door `useReservations` zonder datumfilter te gebruiken en in de component te groeperen, of door een aparte lichtgewicht query toe te voegen.

De meest efficiente aanpak: een nieuwe hook `useWeeklyGuestCounts` die een simpele Supabase query doet voor de afgelopen 7 dagen, gegroepeerd per dag.

## Probleem 2: Grafiek gebruikt hardcoded mock data

De grafiek toont statische getallen (16, 19, 14, 24, 28, 32, 20). Dit moet worden vervangen door echte data: per dag het totaal aantal gasten (party_size) van de afgelopen 7 dagen.

### Nieuwe hook: `src/hooks/useWeeklyGuestCounts.ts`

Simpele hook die de afgelopen 7 dagen ophaalt:
```typescript
// Query: reservations van vandaag - 6 dagen t/m vandaag
// Groepeer per reservation_date, som party_size
// Retourneer array van { date, day, count }
```

Gebruikt een RPC of gewone select + client-side groepering. Aangezien er waarschijnlijk weinig data is (max ~100 reserveringen per week), is client-side groepering prima.

### Wijziging in `src/components/dashboard/ReservationsTile.tsx`

- Verwijder de hardcoded `mockData` array
- Accepteer `weeklyData` als prop (of gebruik de hook intern)
- Toon de echte data in de AreaChart
- Tooltip tekst wijzigen van "reserveringen" naar "gasten"
- Label "vandaag" behouden bij het hero getal

### Wijziging in `src/pages/Dashboard.tsx`

- Bereken `todayGuests` als som van `party_size`
- Haal weekdata op en geef door aan `ReservationsTile`

---

## Technisch overzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useWeeklyGuestCounts.ts` | Nieuw — haalt 7 dagen reserveringsdata op |
| `src/pages/Dashboard.tsx` | `todayCount` wordt `todayGuests` (som party_size) + weekdata ophalen |
| `src/components/dashboard/ReservationsTile.tsx` | Mock data vervangen door echte weekdata, tooltip "gasten" |
