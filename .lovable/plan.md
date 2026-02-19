

# Widget Settings: Sectietitels en kaartstructuur standaardiseren

## Probleem

De widget settings page wijkt op twee punten af van de standaard (vergelijk Shifts page):

1. **Een grote kaart** met alles erin, terwijl Configuratie, Weergave en Branding logisch aparte groepen zijn
2. **Tiny uppercase labels** (`text-[11px] uppercase`) in plaats van de standaard kaarttitels (`text-base font-semibold` + beschrijving)
3. **Boekingsvragen en Integratie** kaarten gebruiken `text-sm font-semibold` -- ook niet conform

## Oplossing

### Kaart 1 opsplitsen in 3 kaarten

```text
Card 1: Configuratie
  titel: "Configuratie" (text-base font-semibold)
  beschrijving: "Widget status en basisinstellingen."
  - Widget aan/uit toggle
  - Locatie slug, welkomsttekst, niet-beschikbaar, redirect URL

Card 2: Weergave
  titel: "Weergave"
  beschrijving: "Bepaal wat gasten zien in de widget."
  - Eindtijd tonen
  - Nesto branding tonen

Card 3: Branding
  titel: "Branding"
  beschrijving: "Kleuren, logo en knoopstijl van de widget."
  - Kleur swatches + hex input
  - Logo upload
  - Knoopstijl selector

Card 4: Boekingsvragen (bestaand, titel upgraden)
Card 5: Integratie (bestaand, titel upgraden)
```

### Kaarttitel patroon (conform Shifts)

Elke kaart krijgt:
```tsx
<NestoCard className="p-6">
  <div className="mb-5">
    <h3 className="text-base font-semibold">Titel</h3>
    <p className="text-sm text-muted-foreground mt-0.5">Beschrijving.</p>
  </div>
  {/* content */}
</NestoCard>
```

## Technische details

### Bestand

`src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`

### Wijzigingen

1. Verwijder de `sectionHeader` en `sectionDivider` constantes (niet meer nodig voor de eerste kaart)
2. Splits de huidige grote `NestoCard` (regels 151-302) op in 3 aparte `NestoCard`s
3. Elke kaart krijgt een header-blok met `text-base font-semibold` titel + `text-sm text-muted-foreground` beschrijving
4. Boekingsvragen kaart: `text-sm font-semibold` wordt `text-base font-semibold`
5. Integratie kaart: idem + interne subsecties behouden `sectionDivider`/`sectionHeader` want die zitten binnen een enkele logische kaart met meerdere gerelateerde secties
6. Geen functionele wijzigingen -- alleen visuele herstructurering
