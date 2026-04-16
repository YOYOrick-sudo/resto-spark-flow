

## Diagnose

Je wordt naar `/` geredirect vanaf zowel `/nesto-admin` als `/nesto-admin/mfa-setup`. Beide routes zitten achter `AdminRouteGuard`. Mogelijke oorzaken:

1. **`is_platform_admin` RPC retourneert `false`** → guard redirect naar `/`
2. **`getAuthenticatorAssuranceLevel()` faalt** → `needsMFA = true` zou moeten triggeren, maar in plaats daarvan wordt iets anders geraakt
3. **Race condition / stale state** waardoor `isAdmin = false` blijft

Zonder console-logs kan ik niet zien welke tak van de guard wordt geraakt. Tijd voor diagnostiek.

## Plan

### Stap 1 — Tijdelijke debug-logs toevoegen
- In `src/hooks/useAdminAuth.ts`: log `adminCheck`, `error`, `aalData`, `aalError` na elke check
- In `src/components/admin/AdminRouteGuard.tsx`: log `session`, `isAdmin`, `needsMFA`, `isLoading` + welke redirect-tak wordt gepakt

### Stap 2 — Jij navigeert naar `/nesto-admin`
Open de browser console (F12 → Console tab) vóór navigatie. Plak daarna de console-output hier.

### Stap 3 — Definitieve fix op basis van logs
Drie waarschijnlijke uitkomsten:
- **`adminCheck = false`** → DB-issue (ondanks dat de RPC eerder `true` gaf in network log). Mogelijk session.user.id mismatch.
- **`aalError` of `aalData` ongedefinieerd** → MFA-detectie faalt. Switchen naar `supabase.auth.mfa.listFactors()` als robuustere check.
- **`isLoading` blijft `true`** → race condition in de hook.

### Stap 4 — Debug-logs verwijderen na fix

## Wat ik ga doen na approval
1. Console.log statements toevoegen aan beide bestanden
2. Wachten tot je de logs deelt
3. Definitieve fix toepassen + debug-logs opruimen

