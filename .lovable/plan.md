

# Enterprise Design Fix — MessageThread en ComposeMessageModal

## Probleem

De huidige implementatie wijkt op meerdere punten af van het Nesto Polar enterprise design system. Dit moet gecorrigeerd worden voordat het live gaat.

## Fixes per component

### ComposeMessageModal

| Issue | Huidig | Enterprise correct |
|-------|--------|-------------------|
| Label styling | `text-sm font-medium text-foreground` | `text-[13px] font-medium text-muted-foreground` |
| Label implementatie | Losse `<label>` elementen | Via `label` prop op NestoInput; Textarea wrapped met zelfde label-patroon |
| Loading tekst | Alleen "Versturen" | "Versturen..." tijdens pending |

### MessageThread

| Issue | Huidig | Enterprise correct |
|-------|--------|-------------------|
| Card afbakening | `border` met kleur-accent | `bg-card` met shadow (light) / `border border-border` (dark) — conform Card Shadow regels |
| Outbound indicator | `border-primary/20 bg-primary/[0.03]` | Subtielere teal left-border (`border-l-2 border-primary`) op een neutrale `bg-card` kaart |
| Expand button | Raw `<button>` | `NestoButton variant="ghost" size="sm"` of styled inline met `transition-colors duration-150` |
| Lijst separatie | `space-y-3` met individuele borders | `divide-y divide-border/50` zonder individuele card borders, of `space-y-3` met shadow-cards |
| Timestamp | `text-xs` | `text-[11px] text-muted-foreground` voor enterprise density |
| Sender naam | `text-sm font-medium` | `text-sm font-semibold text-foreground` (primaire data = font-semibold) |

### Aanpak

Kies het **shadow-card** patroon per bericht (niet divide-y), omdat elk bericht een zelfstandig blok is met header, subject en body — dit past beter bij het NestoCard-achtige patroon.

Elke message card krijgt:
- `bg-card rounded-lg` met enterprise shadow (light mode)
- `dark:border dark:border-border` fallback
- Outbound: subtiele `border-l-2 border-primary` links
- Agent: AssistentIcon naast naam (blijft)
- Inbound: neutrale styling zonder left-border

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/onboarding/MessageThread.tsx` | Enterprise card styling, sender font-semibold, timestamp 11px, expand button met transition |
| `src/components/onboarding/ComposeMessageModal.tsx` | Label styling naar 13px muted-foreground, loading tekst "Versturen..." |

