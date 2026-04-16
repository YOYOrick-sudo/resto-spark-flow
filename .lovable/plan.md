

## Diagnose

Op basis van vorige analyse:
- Je bent platform_admin in de DB ✅
- `is_platform_admin` RPC werkt ✅
- Maar je wordt vanaf `/nesto-admin` én `/nesto-admin/mfa-setup` geredirect naar `/`
- Console logs zie je niet → óf de guard rendert nooit (route niet gematcht), óf er staat een andere catch-all redirect vóór de admin route

## Plan: 3 stappen

### Stap 1 — Routes verifiëren in `App.tsx`
Ik check de exacte volgorde van routes: staat `/nesto-admin/*` boven of onder de catch-all `<ProtectedRoute>` met `*`-route? Als er een `*`-route is die naar `/` redirect en die staat vóór de admin routes (of de admin routes zitten ín de ProtectedRoute), dan worden ze nooit bereikt.

Verwachte oorzaak: `/nesto-admin` zit binnen `<ProtectedRoute>` of `<AppLayout>`, waardoor je in het normale dashboard belandt.

### Stap 2 — Fix routing structuur
Verplaats `/nesto-admin/*` routes **buiten** de `ProtectedRoute` / `AppLayout` wrapper, zodat:
- `/nesto-admin` → `AdminRouteGuard` → `AdminLayout` (eigen layout, geen restaurant sidebar)
- `/nesto-admin/mfa-setup` → ook achter `AdminRouteGuard`

### Stap 3 — Fix race condition in `useAdminAuth`
- `isLoading` start altijd op `true` bij sessie-wissel (nu wordt 'ie te vroeg `false` gezet als session loading is)
- `AdminRouteGuard` mag niet redirecten zolang `isLoading === true`

### Stap 4 — Fix MFA-redirect loop
In `AdminRouteGuard`: als gebruiker al op `/nesto-admin/mfa-setup` is en `needsMFA === true`, render `<Outlet />` in plaats van weer redirecten naar dezelfde pagina (anders loop / fallback).

### Stap 5 — Test handmatig
Jij gaat naar `/nesto-admin` → guard detecteert admin + needsMFA → redirect naar `/nesto-admin/mfa-setup` → enrollment scherm verschijnt → QR scannen → activeren → terug naar `/nesto-admin` dashboard.

## Wat ik ga doen na approval
1. `App.tsx` lezen en routing-structuur fixen (admin routes buiten restaurant-shell)
2. `useAdminAuth.ts` race condition fixen (isLoading correct beheren)
3. `AdminRouteGuard.tsx` MFA-loop fixen (geen redirect als al op mfa-setup)
4. Debug-logs verwijderen
5. Jij test de flow met je authenticator app

