

## Bevindingen op de 4 punten

**Blokker 1 ✅ bevestigd** — `device_role_enum` = `{kitchen_station, service_station, bar_station, reception_station}`. Mijn eerdere `kitchen|service|host|manager` faalt op insert.

**Blokker 2 ❌ klopt niet** — `leverancier_aliassen` heeft GEEN `location_id` kolom. Schema is: `id, leverancier_id (NOT NULL FK), alias_naam (NOT NULL), bron (NOT NULL), created_at, updated_at`. Unique key = `(leverancier_id, alias_naam)`. Tenant-isolatie loopt impliciet via `leverancier_id → leveranciers.location_id`. Geen fix nodig in mijn insert — die is al correct.

**Check 1 ✅** — `leveranciers.is_actief` bestaat (`boolean NOT NULL`). `fuzzy_match_leverancier()` filter is geldig.

**Check 2 ✅** — `updateFactuur` mutation bestaat in `useFactuurMutations.ts` (regel 47-55) en wordt geëxporteerd. `LeverancierMatchWidget` kan het importeren.

## Fix 1 — device_role waarden

Drie plekken aanpassen:

**`useDeviceMutations.ts`** — type van `createDevice`:
```ts
device_role: "kitchen_station" | "service_station" | "bar_station" | "reception_station";
```

**`SettingsApparaten.tsx`** — labels + default:
```ts
const ROLE_LABELS: Record<string, string> = {
  kitchen_station: "Keuken",
  service_station: "Bediening",
  bar_station: "Bar",
  reception_station: "Receptie / Host",
};
// default form state:
device_role: "kitchen_station"
```

`useDeviceSession.deviceRole` blijft een raw string — geen wijziging.

## Fix 2 — leverancier_aliassen insert

Geen wijziging nodig. Mijn bestaande insert is correct:
```ts
.insert({ leverancier_id, alias_naam, bron: "handmatig" })
```
Tenant-isolatie via FK chain naar `leveranciers.location_id`. RLS op `leverancier_aliassen` zal moeten checken via die join — als RLS dat nu niet doet, is dat een aparte security-vraag, geen blokker voor R2 functionaliteit.

## Wat verandert vs. vorig plan

Alleen 2 files: `useDeviceMutations.ts` (type) en `SettingsApparaten.tsx` (labels + default). Alle andere code uit het vorige plan blijft 1:1 staan.

## Volgorde uitvoering na approval

1. DB migratie: `fuzzy_match_leverancier()` + realtime publication voor `factuur_uploads`
2. Track 1 — MFA bug fix (al klaar)
3. Track 2 — `useFuzzyMatchLeverancier`, `linkLeverancierAlias`, `LeverancierMatchWidget`, integratie in `FactuurDetailPanel` + `FactuurUploadZone` + `FacturenTab`
4. Track 3 — `useDevices`, `useDeviceMutations` (correcte enum), `useDeviceSession`, `SettingsApparaten` (correcte labels), `DevicePairing`, routing in `App.tsx`, settings hub link

