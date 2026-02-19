

# Accent Dot + Outline Ring op Floating Button

## Wat verandert

De floating "Reserveer" pill krijgt twee visuele upgrades:

1. **Logo weg, accent dot altijd** -- Het button-logo concept verdwijnt. In plaats daarvan krijgt de pill altijd een kleine groene accent dot (8px) met een subtiele pulse-animatie die "beschikbaarheid" communiceert.

2. **Dunne outline ring** -- Een 1.5px border om de hele pill in dezelfde kleur als de accent dot (de `accentColor`). Dit geeft de knop meer definitie en een premium gevoel.

### Visueel resultaat

```text
  ╭─────────────────────────────╮
  │  ●  RESERVEER               │   ← 1.5px border in accentColor
  ╰─────────────────────────────╯      ● = pulserende accent dot
```

## Technische wijzigingen

### 1. `public/widget.js`
- Verwijder het `buttonLogoUrl` / `data-button-logo` attribuut en de hele logo `<img>` branch
- De accent dot wordt altijd gerenderd (geen if/else meer)
- Voeg een CSS `@keyframes nestoDotPulse` toe: zachte opacity-pulse (0.5 - 1.0) op de dot
- Voeg `border: 1.5px solid {accentColor}` toe aan de pill button styling
- De dot krijgt de pulse-animatie standaard (niet afhankelijk van `data-pulse`)
- `data-pulse` blijft bestaan maar stuurt nu de ring-pulse op de hele button (zoals nu)

### 2. `src/components/settings/widget/WidgetButtonLogoUpload.tsx`
- Verwijderen -- niet meer nodig

### 3. `src/hooks/useWidgetButtonLogoUpload.ts`
- Verwijderen -- niet meer nodig

### 4. `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`
- `WidgetButtonLogoUpload` import en gebruik verwijderen uit de Integratie-card
- `buttonLogoUrl` props verwijderen uit `WidgetLivePreview` en `EmbedCodePreview`

### 5. `src/components/settings/widget/WidgetLivePreview.tsx`
- `buttonLogoUrl` prop verwijderen

### 6. `src/components/settings/widget/EmbedCodePreview.tsx`
- `buttonLogoUrl` prop en `data-button-logo` regel verwijderen

### 7. `src/hooks/useWidgetSettings.ts`
- `widget_button_logo_url` blijft in het type (database kolom), maar wordt niet meer actief gebruikt in de UI

## Wat blijft

- De accent dot kleur wordt bepaald door `accentColor` (standaard wit)
- De outline kleur is dezelfde `accentColor`
- Alle andere button-styling (glassmorphism shadow, uppercase, letter-spacing, entrance animatie) blijft intact

