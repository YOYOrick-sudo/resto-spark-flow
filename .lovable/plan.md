## Doel
Het huidige auto-gegenereerde logo (rommelige dubbele "F" + ongelijke wordmark) vervangen door een verfijnd, **puur typografisch** Foretaste-logo in lowercase, Paper & Ink (zwart op off-white).

## Aanpak

**Geen iconisch monogram.** Het logo wordt één samenhangend wordmark — Aesop/Apple-stijl. De `NestoLogo`-component houdt z'n drie render-modes (icon-only / wordmark-only / lockup), maar:

- **Wordmark** → nieuwe verfijnde "foretaste" PNG (dunne moderne sans, ruime letter-spacing, perfect uitgelijnd op baseline, geen rare schreven of dubbele lijnen).
- **Icon-only** (gebruikt in ingeklapte sidebar) → losse kleine "f" in **dezelfde** letter als de wordmark, zodat het cohesief blijft zonder een apart monogram te verzinnen.
- **Lockup** → identiek aan de wordmark (geen icoon ervoor, want richting = puur wordmark).

## Stappen

1. **Genereer 3 nieuwe assets** met `imagegen` (premium tier voor scherpe typografie):
   - `src/assets/foretaste-wordmark.png` — "foretaste" lowercase, dunne moderne sans (Söhne/Inter-achtig), zwart `#0d0d0d`, transparante achtergrond
   - `src/assets/foretaste-mark.png` — losse kleine "f" in dezelfde letter (voor collapsed sidebar)
   - `src/assets/foretaste-lockup.png` — dezelfde wordmark (lockup = wordmark bij deze richting)

2. **Update `src/components/polar/NestoLogo.tsx`**:
   - Import `foretaste-mark.png` i.p.v. de oude "F"-icoon
   - Lockup-mode toont nu enkel wordmark (geen icoon meer ernaast)
   - Hoogte-maps lichtjes herijken zodat het wordmark optisch even zwaar oogt als het vorige lockup

3. **Oude assets niet verwijderen** — alleen niet meer importeren (veilig, geen broken refs).

## Visuele richtlijn voor de generator
- Letters: lowercase, dun gewicht (300), royale tracking
- Baseline strak, geen versierde uiteinden
- Pure `#0d0d0d` op transparant, geen schaduw/gradient
- Compositie gecentreerd met ruime marges (geen clipping)

## QA voor "klaar"
- Screenshot sidebar uitgeklapt (wordmark zichtbaar)
- Screenshot sidebar ingeklapt (alleen "f"-mark zichtbaar)
- Visueel checken: geen dubbele lijnen, geen rare uitlopers, letters consistent zwaar

## Out of scope
- Geen kleur-tokens wijzigen
- Geen nieuwe `Foretaste`-branding in copy/teksten (alleen logo-assets)
- Geen wijziging aan `NestoLogo` API/props
