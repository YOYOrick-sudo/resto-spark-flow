

# Fix: Radix Select.Item empty value crash

## Probleem
Radix UI `<Select.Item>` crasht bij `value=""`. Dit breekt de Walk-in sheet en het Create formulier bij het openen van de tafel-select.

## Oplossing
Vervang de lege string door een sentinel waarde `"__none__"` op twee plekken in `src/components/reservations/CreateReservationSheet.tsx`.

### Wijziging 1 — Create flow tafel select (regel 290-293)

**Was:**
```typescript
<Select value={tableId || ''} onValueChange={(v) => setTableId(v || null)}>
  ...
  <SelectItem value="">Niet toegewezen</SelectItem>
```

**Wordt:**
```typescript
<Select value={tableId || '__none__'} onValueChange={(v) => setTableId(v === '__none__' ? null : v)}>
  ...
  <SelectItem value="__none__">Niet toegewezen</SelectItem>
```

### Wijziging 2 — Walk-in tafel select (regel 471-474)

Identieke wijziging als hierboven.

### Na de fix: E2E verificatie

1. Open de Walk-in sheet via de knop
2. Stel party size in en klik "Walk-in registreren"
3. Verifieer in de database:

```sql
SELECT customer_id, no_show_risk_score, risk_factors, channel, status
FROM reservations ORDER BY created_at DESC LIMIT 1;
```

Verwacht resultaat:
- `customer_id` = NULL
- `risk_factors` = gevulde JSONB (niet NULL)
- `channel` = walk_in
- `status` = seated

4. Verifieer dat de walk-in in de lijst verschijnt (LEFT JOIN test)

---

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/reservations/CreateReservationSheet.tsx` | 2x `value=""` vervangen door `value="__none__"` + handler aanpassing |

