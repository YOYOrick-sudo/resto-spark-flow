

# AI Agent Context & Autonomie — Volledige Fix

## Overzicht

De AI-agent mist cruciale data en kan niet daadwerkelijk handelen. Dit plan fixt alle gaten zodat de agent autonoom kan functioneren.

## Wijzigingen

### 1. Kolomnamen fixen in `loadContext`

De reservering-query gebruikt verkeerde kolomnamen:
- `date` → `reservation_date`
- `time` → `start_time`  
- `notes` → `guest_notes`

```typescript
.select('id, reservation_date, start_time, party_size, status, guest_notes')
.gte('reservation_date', new Date().toISOString().split('T')[0])
```

Alle referenties naar `r.date`, `r.time`, `r.notes` updaten naar de juiste namen.

### 2. Dieetinfo compleet in system prompt

Naast allergieën ook vegetarisch/veganistisch tonen:

```
Dieet: Vegetarisch, allergieën: gluten, lactose
```

### 3. Tool-calling aansluiten op booking intents

**booking/new**: Na intent classificatie, de AI laten tool-callen met `check_availability` en daarna `create_reservation`:

```typescript
case 'new': {
  // Gebruik generateResponse MET tools
  responseText = await generateResponseWithTools(ctx, intent, bookingTools);
  break;
}
```

Een nieuwe `generateResponseWithTools` functie die de Gemini tool-calling flow gebruikt:
1. AI krijgt tools (`check_availability`, `create_reservation`)
2. AI besluit welke tool te callen
3. Tool wordt uitgevoerd via `executeBookingTool`
4. Resultaat gaat terug naar AI voor een menselijk antwoord

**booking/modify en booking/cancel**: Zelfde patroon met `modify_reservation` en `cancel_reservation` tools.

### 4. Echte executie voor modify/cancel

De `executeBookingTool` daadwerkelijk laten werken:

**modify_reservation**: Call `public-booking-api` met de update:
```typescript
await fetch(`${SUPABASE_URL}/functions/v1/public-booking-api`, {
  method: 'PUT',
  body: JSON.stringify({
    action: 'modify',
    reservation_id: toolInput.reservation_id,
    updates: { reservation_date, start_time, party_size }
  })
});
```

**cancel_reservation**: Zelfde met cancel actie.

> **Noot**: De `public-booking-api` moet modify/cancel endpoints ondersteunen. Als die er niet zijn, valt de agent terug op `recommend` mode (actiekaart voor operator).

### 5. Klantcontext uitbreiden in prompt

Telefoon en email toevoegen aan de GAST sectie:
```
GAST: Jan de Vries
Tel: +31612345678
Bezoeken: 12
Dieet: Veganistisch, allergieën: noten
Dit is een vaste gast.
```

## Volgorde

1. Fix kolomnamen (zonder dit werkt niets)
2. Dieetinfo + klantcontact in prompt
3. `generateResponseWithTools` functie bouwen
4. Tool-calling aansluiten op booking/new
5. Echte executie voor modify/cancel (of recommend fallback)
6. Deploy + test

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/ai-respond/index.ts` | Fix kolomnamen, dieetinfo, klantcontact, tool-calling flow, echte modify/cancel executie |

