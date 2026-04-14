

# FIX: StepWizard buttons te groot

## Probleem

De buttons in de StepWizard footer hebben `min-h-[76px]` — dat was bedoeld als touch target maar het maakt de buttons visueel veel te groot. De 76dp touch target regel geldt voor het **klikbare gebied**, niet voor de visuele grootte van de button zelf.

Het design systeem zegt: NestoButton default size = `h-10` (40px). De `lg` variant = `h-12` (48px). Een button van 76px hoog bestaat niet in het systeem.

## Oplossing

In `src/components/polar/StepWizard.tsx` (regels 233, 244, 249):

- Verwijder `min-h-[76px]` van alle drie de buttons
- Gebruik `size="lg"` voor iets grotere buttons in de wizard footer (48px, past bij het design systeem)
- Behoud `px-8` voor voldoende horizontale padding

**Van:**
```tsx
<NestoButton variant="outline" onClick={goPrev} className="min-h-[76px] px-8">
```

**Naar:**
```tsx
<NestoButton variant="outline" onClick={goPrev} size="lg">
```

Hetzelfde voor de "Volgende" en "Opslaan" buttons.

De `lg` size geeft `h-12 px-6` — dat is consistent met het design systeem en nog steeds comfortabel voor touch.

**Totaal: 1 bestand, 3 regels aangepast.**

