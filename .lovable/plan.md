

# Twee Widget Stijl-varianten: A/B Vergelijking

## Concept

Twee visuele thema's voor de boekingswidget die naast elkaar vergeleken kunnen worden. De huidige styling wordt "Variant A" en er komt een nieuwe "Variant B" bij met een duidelijk ander premium karakter.

## De twee stijlen

### Variant A: "Soft" (huidige stijl, gepolijst)
De bestaande widget met de goedgekeurde premium-upgrades:
- Zachte shadows, `rounded-2xl` CTA's met gekleurde shadow
- Party size knoppen: `w-12 h-12`, shadow-based
- Tijdslots: shadow-based `rounded-xl`, `h-12`
- Inputs: `rounded-xl`, `border-gray-200`, `py-3`
- Confirmation: `bg-white shadow-sm rounded-2xl`
- Back button: `rounded-lg` met hover-bg

### Variant B: "Glass" (nieuw -- glasmorfisme + strakker)
Een visueel duidelijk andere richting:
- **Achtergrond**: subtiel gradient mesh (`radial-gradient`) in plaats van plat `#FAFAF8`
- **CTA buttons**: `rounded-full` (volledig pill) + glaseffect (`backdrop-blur-sm`, semi-transparante achtergrond)
- **Tijdslots**: `rounded-full` pills in een horizontale scroll in plaats van 3-koloms grid, met een frosted-glass geselecteerde state
- **Party size**: grotere stepper met `rounded-2xl` container eromheen als visuele groep
- **Inputs**: borderless met alleen een bottom-line (`border-b-2`) en een floating label-effect
- **Calendar**: zachtere day-cells met `rounded-full` in plaats van `rounded-lg`
- **Confirmation card**: glasachtige kaart met `backdrop-blur-md bg-white/70 border border-white/30`
- **Progress**: lijn-gebaseerd in plaats van dots (een dunne balk die vult)

## Hoe het werkt

### Nieuw: `widgetTheme` query parameter
De widget (`BookingWidget.tsx`) leest een `?theme=soft` of `?theme=glass` parameter. Default = `soft`.

### Nieuw: `useWidgetTheme()` hook
Een klein hook dat de theme context levert met alle style-tokens:
- `ctaRadius`, `ctaShadow`
- `inputStyle` (bordered vs underline)
- `slotLayout` (grid vs scroll)
- `cardStyle` (shadow vs glass)
- `progressStyle` (dots vs bar)
- `bgStyle` (flat vs gradient)

Elk step-component leest de tokens uit dit hook en past de styling aan.

### Widget Preview pagina
De `WidgetPreviewDemo.tsx` krijgt twee knoppen bovenaan: "Soft" en "Glass" om live te switchen.

De `WidgetLivePreview` in settings krijgt ook een theme-selector.

## Technische wijzigingen

### Nieuwe bestanden
- `src/hooks/useWidgetTheme.ts` -- theme token hook (theme naam in, style-tokens uit)

### Aangepaste bestanden

**`src/pages/BookingWidget.tsx`**
- Lees `theme` uit searchParams
- Wrap inner component met theme context
- Variant B: achtergrond gradient toepassen

**`src/components/booking/BookingProgress.tsx`**
- Conditioneel: dots (soft) vs thin progress bar (glass)

**`src/components/booking/DateGuestsStep.tsx`**
- Party size: shadow-knoppen (soft) vs grouped container (glass)
- Calendar: `rounded-lg` days (soft) vs `rounded-full` (glass)
- CTA: `rounded-2xl` + colored shadow (soft) vs `rounded-full` + glass (glass)

**`src/components/booking/TimeTicketStep.tsx`**
- Slots: 3-col grid `rounded-xl` (soft) vs horizontal scroll `rounded-full` pills (glass)
- CTA: zelfde patroon als DateGuestsStep

**`src/components/booking/GuestDetailsStep.tsx`**
- Inputs: bordered `rounded-xl` (soft) vs underline-style borderless (glass)
- CTA: zelfde patroon

**`src/components/booking/ConfirmationStep.tsx`**
- Summary: `bg-white shadow-sm rounded-2xl` (soft) vs `backdrop-blur bg-white/70 rounded-3xl border-white/30` (glass)

**`src/components/booking/TicketSelectStep.tsx`**
- Geen grote wijzigingen -- ticket cards werken in beide stijlen

**`src/pages/WidgetPreviewDemo.tsx`**
- Theme toggle knoppen toevoegen
- `data-theme` parameter doorgeven aan widget script

**`src/components/settings/widget/WidgetLivePreview.tsx`**
- Theme parameter toevoegen aan preview URL

