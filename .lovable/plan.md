

# Fix: Permission key corrigeren op Settings > Onboarding

## Probleem

De pagina `SettingsOnboarding.tsx` checkt op permissie `onboarding.manage`, maar die bestaat niet in de database. De beschikbare permissie voor onboarding-instellingen is `onboarding.settings`.

Hierdoor ziet elke gebruiker — inclusief de owner — het "Geen toegang" scherm.

## Oplossing

Een wijziging in 1 bestand:

**`src/pages/settings/SettingsOnboarding.tsx`** (regel 22):
- Was: `usePermission('onboarding.manage')`
- Wordt: `usePermission('onboarding.settings')`

Dat is alles. De owner-rol heeft `onboarding.settings` al toegekend in de database.

