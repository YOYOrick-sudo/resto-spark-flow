

# Fix: Emoji vervangen door Lucide Sparkles icoon in TableSelector trigger

## Probleem
De trigger-button van de TableSelector toont `✨ Automatisch toewijzen` als tekst-emoji. Binnen de dropdown zelf wordt al correct het Lucide `Sparkles` icoon gebruikt, maar de trigger niet.

## Oplossing
In `src/components/reservations/TableSelector.tsx`:

1. **displayLabel aanpassen** (regel 129): Verander de return van een string naar een object/flag zodat de trigger weet dat het auto-mode is
2. **Trigger button aanpassen** (regel 162-164): Render het Lucide `Sparkles` icoon inline voor de tekst wanneer `value === '__auto__'`, in plaats van een emoji-string

Concreet:
- `displayLabel` geeft `'Automatisch toewijzen'` terug (zonder emoji) bij `__auto__`
- De trigger `<span>` krijgt een conditionele `Sparkles` icon prefix wanneer `value === '__auto__'`

### Bestand: `src/components/reservations/TableSelector.tsx`
- Regel 129: `'✨ Automatisch toewijzen'` wordt `'Automatisch toewijzen'`
- Regel 162-164: Sparkles icoon toevoegen voor de tekst in de trigger span

Geen andere bestanden worden gewijzigd.

