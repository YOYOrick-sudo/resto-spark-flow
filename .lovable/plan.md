

# Fix: Reserveringen laden in AI context

## Probleem

`loadContext` in `ai-respond/index.ts` laadt geen reserveringen. De AI heeft daarom geen idee welke reservering een gast bedoelt bij een wijzigings- of annuleringsverzoek.

## Oplossing

### 1. `supabase/functions/ai-respond/index.ts` — `loadContext`

Na het ophalen van de customer (regel 94-98), ook aankomende reserveringen laden:

```typescript
let upcomingReservations: any[] = [];
if (customer?.id) {
  const { data } = await supabase.from('reservations')
    .select('id, date, time, party_size, status, notes')
    .eq('customer_id', customer.id)
    .eq('location_id', input.location_id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(5);
  upcomingReservations = data || [];
}
```

Voeg `upcomingReservations` toe aan het Context interface en return object.

### 2. `ai-respond/index.ts` — `buildSystemPrompt`

Reserveringen toevoegen aan de system prompt:

```
RESERVERINGEN VAN DEZE GAST:
- Vrijdag 4 april om 19:00, 2 personen (bevestigd)
```

### 3. `ai-respond/index.ts` — booking branches (regels 630-668)

Bij `modify` en `cancel`: specifieke reserveringscontext meegeven aan `generateResponse`:

```typescript
const resInfo = ctx.upcomingReservations.map(r => 
  `${r.date} om ${r.time}, ${r.party_size}p (${r.status})`
).join('; ');

responseText = await generateResponse(ctx, intent, 
  `De gast heeft deze reserveringen: ${resInfo}. Help met wijzigen.`);
```

Bij `recommend` mode: ook de reserveringsinfo opnemen in de `agent_actions` beschrijving zodat de operator context heeft.

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/ai-respond/index.ts` | `loadContext`: laad upcoming reservations. `buildSystemPrompt`: toon reserveringen. Booking branches: geef reserveringscontext mee. |

