

# Plan: Fix literal `\n` in berichten

## Probleem

Berichten in de chat tonen letterlijke `\n` tekens ("Beste Jan,\n\nDit is een herinnering...") in plaats van echte regelovergangen. ChatView heeft al `whitespace-pre-wrap` — het probleem zit dus in de **opgeslagen content**.

## Oorzaak

De `replacePlaceholders` functie in `send-message/index.ts` vervangt alleen `{{placeholders}}`. Als de template body literal `\n` bevat (twee characters: backslash + n — mogelijk uit de `message_templates` DB tabel of via JSON-import), worden die niet geconverteerd naar echte newlines.

De hardcoded `DEFAULT_TEMPLATES` in de edge function gebruiken JS string literals (`'...\n...'`) waar `\n` automatisch een echte newline wordt. Maar templates uit de database (`message_templates` tabel) of templates die via de UI als JSON zijn geïmporteerd kunnen literal `\n` bevatten.

## Fix

**Eén regel toevoegen in `replacePlaceholders`** in `send-message/index.ts`:

```typescript
function replacePlaceholders(text: string, params: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  // Convert literal \n sequences to real newlines
  result = result.replace(/\\n/g, '\n');
  return result;
}
```

Dit vangt alle gevallen: of de `\n` nu uit de DB komt, uit een JSON-import, of uit een copy-paste.

**Zelfde fix in `renderTemplate`** in `_shared/templateRenderer.ts` (voor onboarding emails):

```typescript
export function renderTemplate(template: string, context: TemplateContext): string {
  return template
    .replace(/\[voornaam\]/g, context.voornaam)
    .replace(/\[achternaam\]/g, context.achternaam)
    .replace(/\[vestiging\]/g, context.vestiging)
    .replace(/\[functie\]/g, context.functie || 'Open positie')
    .replace(/\[datum\]/g, context.datum || '')
    .replace(/\\n/g, '\n');
}
```

## Extra issue: preview in GastberichtenTab

De preview modal in `GastberichtenTab.tsx` (regel 254) gebruikt al `<pre className="whitespace-pre-wrap">` — dit is correct. Maar de inline preview (regel 254) zou ook literal `\n` tonen als die in de template staan. De `renderPreview` functie moet dezelfde conversie doen:

```typescript
// In GastberichtenTab.tsx renderPreview functie
const renderPreview = (key: TemplateKey) => {
  const t = localTemplates[key];
  if (!t) return '';
  return t.body
    .replace(/\{voornaam\}/g, 'Jan')
    // ...existing replacements...
    .replace(/\\n/g, '\n'); // Convert literal \n
};
```

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/send-message/index.ts` | `replacePlaceholders`: + `result.replace(/\\n/g, '\n')` |
| `supabase/functions/_shared/templateRenderer.ts` | `renderTemplate`: + `.replace(/\\n/g, '\n')` |
| `src/components/settings/communication/GastberichtenTab.tsx` | `renderPreview`: + `.replace(/\\n/g, '\n')` |

## Extra observatie

De `renderPreview` in `GastberichtenTab` (r.278-295) en de DEFAULT_TEMPLATES in `useReservationEmailTemplates.ts` bevatten `\n` als JS string literals — die zijn correcte echte newlines. Het probleem ontstaat alleen wanneer templates via de DB worden opgehaald en de DB-inhoud literal backslash-n bevat. De edge function fix vangt dit op het juiste punt af: vlak voor verzending.

