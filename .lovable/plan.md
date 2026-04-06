

# Deel 1: Activiteitenlog — Enterprise kwaliteit + Deel 2: Overnemen/Teruggeven flow

## Overzicht

Twee grote verbeteringen: (1) de activiteitenlog herschrijven zodat deze leest als een persoonlijke briefing, en (2) de Overnemen/Teruggeven flow compleet maken met system messages en status resets.

---

## DEEL 1: Activiteitenlog

### Probleem
- Berichten tonen letterlijke content i.p.v. samenvatting
- "Gast" i.p.v. echte gastnaam
- Geen groepering van berichten binnen hetzelfde gesprek
- Geen navigatie (clickPath) op message entries
- Kanaal-icoon ontbreekt bij berichten (alleen channelLabel badge)

### Aanpak: `src/hooks/useAssistentLog.ts` — volledig herschrijven

**Data ophalen (3 bronnen, parallel):**
- `audit_log` — reservering events
- `messages` — outbound berichten, JOIN met `conversations.customer_id` + `customers(first_name, last_name)` + `conversations.channel`
- `agent_actions` — uitgevoerde acties

**Enrichment:**
De messages query wordt uitgebreid: i.p.v. alleen `messages.*`, haal ook `conversation:conversations(customer_id, channel, customer:customers(first_name, last_name))` op. Dit geeft gastnaam + kanaal per bericht.

**Groepering berichten (NIEUW):**
Berichten per `conversation_id` groeperen binnen een 10-minuten venster:
- 1 bericht → `"Yorick vroeg of jullie een terras hebben. Beantwoord. ✓ ✦"`
- 2+ berichten → `"Yorick had meerdere vragen. 4 berichten beantwoord. ✓ ✦"`

**Formattering per type:**
| Type | Template |
|---|---|
| `reservation_created` | `{naam} heeft gereserveerd voor {smartDate} {tijd} ({ps}p). ✓` |
| `reservation_updated` (party_size) | `{naam} wilde met {new} ipv {old} komen. Aangepast. ✓` |
| `reservation_cancelled` | `{naam} heeft geannuleerd voor {smartDate} {tijd}. ✓` |
| `messages_grouped` (1 msg) | `{naam} vroeg {samenvatting}. Beantwoord. ✓` |
| `messages_grouped` (2+ msgs) | `{naam} had meerdere vragen. {n} berichten beantwoord. ✓` |
| `bulk_messages` (reminders) | `{n} reminders verstuurd voor {smartDate}. ✓` |

**Gastnaam: NOOIT "Gast":**
- `customer.first_name + last_name` → "Yorick Mulder"
- Alleen voornaam als achternaam ontbreekt → "Yorick"
- Geen customer → telefoon of "Onbekend"

**Kanaal-icoon (emoji in description):**
Het kanaal-icoon (🌐 💬 📞 etc.) wordt **in de description string zelf** gezet als prefix. De `channelLabel` NestoBadge blijft ook als visuele indicator.

**clickPath:**
- Reservering events → `/reserveringen?date={date}&highlight={id}` (al aanwezig)
- Bericht events → `/assistent?tab=berichten&conversation={conversation_id}` (nieuw voor gegroepeerde berichten)
- Bulk/reminders → geen clickPath

**Max items:** Default `LOG_PAGE_SIZE = 7` (was 10). "Toon meer..." voor de rest.

### `src/components/assistant/OverviewTab.tsx`
- `LOG_PAGE_SIZE` wijzigen van 10 naar 7
- Cursor `pointer` alleen als `entry.clickPath` bestaat
- Verder geen grote wijzigingen — rendering is al correct

---

## DEEL 2: Overnemen/Teruggeven flow

### Probleem
- "Teruggeven aan Assistent" reset `status` niet naar `'active'` — gesprek blijft in Aandacht
- Geen system message in chat bij takeover/handback
- Geen AI trigger bij teruggeven als er een onbeantwoord bericht is

### Wijzigingen

#### `src/components/assistant/inbox/ChatView.tsx`

**handleReturnToAi:**
1. Update `conversations`: `handled_by = 'ai'`, `claimed_by = null`, `claimed_at = null`, `status = 'active'`
2. Insert system message: `direction = 'system'`, `message_type = 'system'`, `content = 'Overgedragen aan de Assistent'`
3. Check of laatste bericht inbound is → zo ja, trigger `ai-respond` Edge Function via `fetch`
4. Invalidate queries

**handleTakeOver:**
1. Update `conversations` (al aanwezig)
2. Insert system message: `direction = 'system'`, `message_type = 'system'`, `content = 'Overgenomen door {operatorName}'`
3. Invalidate queries

**Header:** Toon operator naam bij `handled_by = 'operator'` (fetch profile name van `claimed_by`)

#### `src/components/assistant/inbox/ChatView.tsx` — Rendering

System messages (`direction = 'system'` of `message_type = 'system'`) renderen als gecentreerde muted tekst:
```text
── Overgenomen door Thomas · 14:52 ──
```
Geen bubble, geen alignment. Gecentreerd, `text-xs text-muted-foreground`, met horizontale lijnen.

#### `src/hooks/useConversationMessages.ts`

Geen wijzigingen nodig — de query haalt al `*` op uit messages, dus `message_type = 'system'` berichten worden al meegeladen.

---

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useAssistentLog.ts` | Herschrijven: enriched message query met customer join, berichten groeperen per conversation (10min window), gastnaam altijd tonen, kanaal-icoon in description |
| `src/components/assistant/OverviewTab.tsx` | `LOG_PAGE_SIZE = 7`, cursor conditioneel |
| `src/components/assistant/inbox/ChatView.tsx` | System messages renderen als tijdlijn-event. handleReturnToAi: status reset + system msg + ai-respond trigger. handleTakeOver: system msg insert. |

