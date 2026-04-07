

# Fix: Vier log-problemen in useAssistentLog

Drie fixes in één bestand. Probleem 4 is al opgelost.

## Wijzigingen in `src/hooks/useAssistentLog.ts`

### Fix 1: Batch-fetch klantnamen voor audit entries

Na de audit query, verzamel alle `entity_id`'s waar `entity_type === 'reservation'`. Doe een tweede query:

```typescript
const reservationIds = rawAudits
  .filter(a => a.entity_type === 'reservation')
  .map(a => a.entity_id);

const { data: resData } = await supabase
  .from('reservations')
  .select('id, customer_id, customers(first_name, last_name)')
  .in('id', reservationIds);

const customerNameMap = new Map<string, string>();
for (const r of resData || []) {
  const c = r.customers;
  if (c?.first_name) {
    customerNameMap.set(r.id, c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name);
  }
}
```

Geef `customerNameMap` mee aan `humanizeAudit`. Gebruik als primaire bron, fallback op bestaande `getCustomerName()`.

### Fix 2: Agent actions — `title` i.p.v. `beschrijving`

Rond regel 402, verander:
```typescript
// Was:
description: action.beschrijving || `${action.title}. ✓`,
// Wordt:
description: action.title ? `${action.title}. Afgehandeld. ✓` : `Actie uitgevoerd. ✓`,
```

### Fix 3: Geen content-citaat bij single message

In `groupMessagesByConversation`, de single-message branch (rond regel 278):
```typescript
// Was:
description = `${prefix}${name}: "${truncate(content, 50)}". Beantwoord. ✓`
// Wordt:
description = `${prefix}Bericht van ${name} beantwoord. ✓`
```

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useAssistentLog.ts` | Fix 1: batch-fetch reservation→customer namen. Fix 2: `action.title` i.p.v. `beschrijving`. Fix 3: verwijder content-citaat. |

