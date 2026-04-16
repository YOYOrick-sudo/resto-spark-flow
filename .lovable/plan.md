

## Status voor de 2FA test

### ✅ Wat goed staat
- Jouw account `mulder.yorick@gmail.com` heeft `platform_role = 'platform_admin'` in profiles
- DB-functie `is_platform_admin` bestaat
- Routes `/nesto-admin` en `/nesto-admin/mfa-setup` bestaan
- MFA enrollment component is klaar

### ❌ Bug die de test gaat blokkeren
In `src/hooks/useAdminAuth.ts` staat:
```ts
supabase.rpc("is_platform_admin")  // geen argument
```
Maar de DB-functie verwacht `_user_id uuid`:
```sql
is_platform_admin(_user_id uuid)
```

Resultaat: RPC faalt → `isAdmin` blijft `false` → guard redirect je naar `/`. Je komt dus nooit op de MFA-setup pagina, laat staan op het dashboard.

## Plan: 1 fix, daarna testen

### Fix
Pas `src/hooks/useAdminAuth.ts` aan zodat de RPC de user-id meegeeft:
```ts
const { data: adminCheck, error } = await supabase.rpc("is_platform_admin", {
  _user_id: session.user.id,
});
```

### Testflow (na de fix)
1. Login in preview met `mulder.yorick@gmail.com`
2. Navigeer naar `/nesto-admin`
3. Guard detecteert: admin ✅, geen MFA → redirect naar `/nesto-admin/mfa-setup`
4. Scan QR met authenticator app (Google Authenticator / Authy / 1Password)
5. Voer 6-cijferige code in → "Verifieer & activeer"
6. Bij succes: redirect naar `/nesto-admin` → admin dashboard zichtbaar

### Mogelijke vervolgissues om op te letten
- **Browser/iframe + MFA QR**: Authenticator-apps kunnen niet scannen vanuit een iframe-preview op je telefoon. Open `/nesto-admin/mfa-setup` in een **nieuw tabblad** (preview-URL direct), zodat je QR vanaf je laptop-scherm kunt scannen met je telefoon-authenticator app.
- **AAL2 challenge bij volgende sessies**: Na enrollment wordt elke nieuwe login een AAL2-challenge vereisen. Dat hebben we nu nog niet gebouwd (er is geen `MFAVerifyPage`, alleen enrollment). Voor deze eerste test is dat oké — je sessie is direct AAL2 na enrollment+verify.

### Wat ik ga doen na approval
1. De 1-regel fix in `useAdminAuth.ts` (rpc parameter toevoegen)
2. Korte verificatie dat `needsMFA`-logica klopt voor nieuwe gebruiker zonder factors
3. Klaar — jij voert de test handmatig uit met je authenticator-app

