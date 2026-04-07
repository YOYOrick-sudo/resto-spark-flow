

# Fix: Zes log-verbeteringen in useAssistentLog

## Bevindingen uit de database

- **Tijd**: `changes.start_time` bevat `"17:00:00"` — de code leest `changes.time` (bestaat niet). Simpele veldnaam-fix.
- **Duplicaten**: De twee "gereserveerd voor morgen (2p)" entries zijn **aparte reserveringen** (entity_id's `8c4a36de` en `404d1a1a`, tijden 17:00 en 18:00). Geen bug — ze zien er identiek uit omdat de tijd ontbreekt. Fix 1 lost dit op.
- **Agent actions kanaal**: `action_data.conversation_id` bevat de conversation ID. Via een JOIN op `conversations.channel` kan het kanaal worden opgehaald.
- **Sortering**: De `entries.sort()` op regel 426 sorteert op `timestamp` (string van `created_at`). Dit zou correct moeten werken — maar de `formattedTime` wordt bij gegroepeerde berichten gezet op `first.created_at` (eerste bericht in de groep) terwijl `timestamp` op het laatste bericht staat. Dat kan de visuele volgorde verwarren.

## Wijzigingen in `src/hooks/useAssistentLog.ts`

### Fix 1: Tijd toevoegen bij reserveringen

Regel 104 — verander:
```typescript
const time = changes?.time?.new || changes?.time || entry.metadata?.start_time || '';
```
Naar:
```typescript
const time = changes?.start_time?.new || changes?.start_time || changes?.time?.new || changes?.time || entry.metadata?.start_time || '';
const formattedTime = time ? time.toString().slice(0, 5) : '';
```
Gebruik `formattedTime` in de templates (regels 111, 119, 124).

**Resultaat**: "Yorick Mulder heeft gereserveerd voor morgen 17:00 (2p)" en "...voor morgen 18:00 (2p)".

### Fix 2: Kanaal-icoon bij agent actions

Agent actions hebben `action_data.conversation_id`. Na de bestaande parallel queries, batch-fetch de conversation channels:

```typescript
const actionConvIds = (actionsRes.data || [])
  .map((a: any) => a.action_data?.conversation_id)
  .filter(Boolean);

const convChannelMap = new Map<string, string>();
if (actionConvIds.length > 0) {
  const { data: convData } = await supabase
    .from('conversations')
    .select('id, channel')
    .in('id', actionConvIds);
  for (const c of convData || []) {
    convChannelMap.set(c.id, c.channel);
  }
}
```

In de agent actions loop: haal het kanaal op en voeg emoji + channelLabel toe:
```typescript
const convId = action.action_data?.conversation_id;
const channel = convChannelMap.get(convId);
const emoji = getChannelEmoji(channel);
const prefix = emoji ? `${emoji} ` : '';

description: action.title ? `${prefix}${action.title}. Afgehandeld. ✓` : `Actie uitgevoerd. ✓`,
channelLabel: getChannelLabel(channel),
clickPath: convId ? `/assistent?tab=berichten&conversation=${convId}` : undefined,
```

### Fix 3: Klikbaarheid bevestigen

De kliklogica werkt al (regel 324-325 in OverviewTab): `cursor-pointer` + `onClick={() => navigate(entry.clickPath)}`. De `clickPath` wordt correct gezet door `getAuditClickPath` voor reserveringen en door `groupMessagesByConversation` voor berichten. Agent actions krijgen nu ook een `clickPath` (fix 2).

Geen code-wijziging nodig — werkt al.

### Fix 4: Duplicaten

Bevestigd: twee aparte reserveringen met verschillende entity_id's. Geen duplicate. Zodra de tijd zichtbaar is (fix 1) zijn ze direct te onderscheiden.

### Fix 5: Chronologische sortering fixen

Het probleem: `formattedTime` bij gegroepeerde berichten wordt gezet op `first.created_at` (eerste bericht in de window), maar `timestamp` (wat de sortering bepaalt) staat op het laatste bericht. Dit veroorzaakt visuele volgorde-inconsistentie.

**Fix**: In `groupMessagesByConversation` (regel 287-288), gebruik hetzelfde tijdstip voor zowel `timestamp` als `formattedTime`:

```typescript
timestamp: window[window.length - 1].created_at,
formattedTime: formatLogTime(window[window.length - 1].created_at),
```

Hierdoor is de getoonde tijd altijd consistent met de sorteerpositie → strikt aflopende volgorde.

### Fix 6: Berichten samenvatting (v2 notitie)

"Bericht van Yorick beantwoord" is de huidige template. De user erkent dat intent-gebaseerde samenvattingen ("Yorick vroeg naar beschikbaarheid") een v2 verbetering is die afhangt van de AI-agent intent classificatie. Geen wijziging nu.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useAssistentLog.ts` | Fix 1: `start_time` veldnaam + format. Fix 2: batch-fetch conversation channels voor agent actions + emoji/label/clickPath. Fix 5: `formattedTime` consistent met `timestamp` bij groepen. |

