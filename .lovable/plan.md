
# Fase 4.5.C — Availability Engine: Validatie & Edge Cases

## Wat wordt gedaan

1. **Phone channel fix** in `_shared/availabilityEngine.ts`, `check-availability/index.ts`, en `diagnose-slot/index.ts`
2. **Test Edge Function** (`test-availability-engine`) die alle 14 scenario's uitvoert tegen de live edge functions
3. **Cleanup**: test function verwijderen na succesvolle uitvoering
4. **Notitie**: `pacing_arrivals_limit` bestaat NIET op `shift_tickets` — genoteerd als toekomstige uitbreiding, niet blokkerend

## DB Schema Bevinding

`pacing_arrivals_limit` kolom bestaat niet. De enige pacing kolom is `pacing_limit` (covers per interval). Een aparte arrivals-limiet (max reserveringen per interval, ongeacht grootte) is een logische toekomstige uitbreiding maar niet nodig voor v1.

## Stap 1: Phone Channel Fix

### `_shared/availabilityEngine.ts` (line 12)
```text
channel?: 'widget' | 'operator' | 'google' | 'whatsapp' | 'phone';
```

### `check-availability/index.ts` (lines 150-154)
Toevoegen aan channelMap:
```text
phone: perms?.phone ?? true,
```

### `diagnose-slot/index.ts`
Channel check is altijd `passed: true` voor operator, dus geen functionele wijziging nodig. Maar het type moet consistent zijn voor toekomstige uitbreidbaarheid.

## Stap 2: Test Edge Function

Maakt een `supabase/functions/test-availability-engine/index.ts` die:

1. Eigen testdata aanmaakt via service_role_key (tijdelijke shift, ticket, shift_ticket, area, tables)
2. Per scenario de `check-availability` en/of `diagnose-slot` Edge Function aanroept via `fetch()`
3. Output vergelijkt met verwachte waarden
4. Alles opruimt (testdata verwijderen)
5. JSON rapport retourneert met per test: naam, passed/failed, detail, duur in ms

### Testdata Setup

De test function maakt de volgende tijdelijke records:
- **Shift**: "Test Shift" op alle dagen, 17:00-23:00, interval 15 min
- **Ticket**: "Test Ticket" met configureerbare min/max party, booking window, etc.
- **Shift-Ticket**: Koppeling met pacing_limit, channel_permissions, etc.
- **Area**: "Test Area"
- **Tables**: T1 (2-4p), T2 (2-4p), T3 (4-8p), T4 (1-1p, voor party_size=1 test)

Per test worden specifieke parameters aangepast (booking_window, party_size, channel_permissions, shift_exceptions).

### De 14 Tests

| # | Test | Method | Key assertion |
|---|------|--------|--------------|
| 1 | Shift Exception: Closed | check-availability | Geen slots voor gesloten shift |
| 2 | Shift Exception: Modified Times | check-availability | Slots alleen binnen 18:00-22:00 |
| 3 | Location-Wide Closed | check-availability | Helemaal geen slots |
| 4 | Party Size Grenzen | check-availability | 1=party_size, 2=ok, 8=ok, 9=party_size |
| 5 | Party Size 1 | check-availability | tables_full als geen min_capacity=1 tafel |
| 6 | Booking Window: Te Ver Vooruit | check-availability (widget) | Alle slots booking_window |
| 7 | Booking Window: Te Kort | check-availability (widget) | Vroege slots blocked, late slots ok |
| 8 | Booking Window: Large Party | check-availability (widget) | party_size=6 blocked <24u, party_size=4 ok |
| 9 | Channel Permissions | check-availability | widget blocked als widget=false, operator altijd ok |
| 10 | Squeeze Alleen Bij Vol | check-availability | Geen squeeze slots (stub leeg = niet vol) |
| 11 | Table Group | check-availability | T3 (4-8p) match voor party_size=4 |
| 12 | Diagnose: Alle Constraints | diagnose-slot | available=true, 6 constraints met passed=true |
| 13 | Diagnose: Setting Location | diagnose-slot | Geen UUIDs in setting_location strings |
| 14 | Performance | check-availability | Response time <500ms |

### Testmethodologie

Elke test volgt dit patroon:
1. Insert/update testdata voor het specifieke scenario
2. `fetch()` naar check-availability of diagnose-slot met de juiste parameters
3. Assert op de verwachte output
4. Cleanup van scenario-specifieke data (shift_exceptions, etc.)

Timing wordt gemeten met `performance.now()` rond de fetch call.

## Stap 3: Uitvoering & Rapportage

Na deployment van de test function, wordt deze aangeroepen via `curl_edge_functions`. Het resultaat is een JSON array met per test: naam, status, detail, en duur.

## Stap 4: Cleanup

Na succesvolle uitvoering:
- Testdata verwijderen uit de database
- Test edge function verwijderen (code + deployment)

## Bestanden die wijzigen

| Bestand | Actie |
|---------|-------|
| `supabase/functions/_shared/availabilityEngine.ts` | Phone channel toevoegen aan type |
| `supabase/functions/check-availability/index.ts` | Phone toevoegen aan channelMap |
| `supabase/functions/test-availability-engine/index.ts` | Nieuw (tijdelijk) |
| `supabase/config.toml` | test function config (tijdelijk) |

## Implementatievolgorde

1. Phone channel fix (3 bestanden)
2. Deploy check-availability + diagnose-slot
3. Test Edge Function schrijven + deployen
4. Tests uitvoeren en resultaten rapporteren
5. Test function + testdata cleanup
