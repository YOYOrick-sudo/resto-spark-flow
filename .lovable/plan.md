

## Eerlijk antwoord: nee, niet 100% zeker

De fix lost de **bekende bug** op (eindeloos "2FA is al ingesteld"-toast bij gebruikers met al-geregistreerde 2FA), maar er zijn 2 randgevallen die ik wil checken voordat ik "zeker" zeg.

## Wat de fix doet

Vervang in `MFAEnrollmentPage.tsx` de "already enrolled → toast → navigate"-tak door een echte verificatie-flow:

- Nieuwe state `mode: "enroll" | "verify"`
- Bij verified factor gevonden: `setMode("verify")` + `setFactorId(existingFactor.id)`, geen nieuwe enrollment
- UI toont dan: header "2FA verifiëren" + uitleg "Voer je 2FA-code in" (geen QR-code blok)
- `handleVerify` werkt onveranderd → challenge → verify → AAL2 → `navigate("/nesto-admin")`
- `useAdminAuth` re-runt na sessie-wissel (AAL2) → `needsMFA: false` → guard laat door

## Wat ik nog wil verifiëren (2 risico's)

1. **Re-render timing van `useAdminAuth`**: Na `mfa.verify()` wordt de sessie geüpdatet met AAL2. De hook is gekoppeld aan `session?.user?.id` — die verandert NIET bij AAL-upgrade, dus de hook re-runt mogelijk niet automatisch. Risico: navigate gebeurt, guard ziet nog cached `needsMFA: true`, redirect terug naar mfa-setup. Ik moet checken of `AuthContext` op `TOKEN_REFRESHED` / `MFA_CHALLENGE_VERIFIED` events luistert en de session vernieuwt.

2. **Cleanup-tak in `enrollMFA`**: De huidige code unenrollt eerst alle "unverified" factors. Voor een gebruiker met een al-verified factor is dat prima. Maar als er per ongeluk een verified + unverified factor naast elkaar staan, kan dat tot rare state leiden. Lage prio.

## Wat ik na approval doe

1. `src/contexts/AuthContext.tsx` lezen → bevestigen dat sessie wordt ververst na MFA-verify
2. Indien nodig: `useAdminAuth` dependency uitbreiden naar `session?.access_token` (verandert wel bij AAL-upgrade) zodat re-check triggert
3. `MFAEnrollmentPage.tsx` herschrijven met `mode` state (enroll vs verify pad)
4. Kort testplan: jij logt in → `/nesto-admin` → moet direct verify-scherm tonen (geen QR) → code invoeren → admin dashboard verschijnt zonder refresh

Pas na deze 2 checks + de rewrite kan ik met zekerheid zeggen dat het opgelost is.

