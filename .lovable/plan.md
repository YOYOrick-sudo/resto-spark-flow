

# Sprint E.2: Assistent Hub + Team Inbox + Settings

## Huidige staat

- **Assistent pagina** (`src/pages/Assistent.tsx`): Signalen-pagina met filters, geen tabs
- **Sidebar badge** (`useSignalCount`): Telt alleen error/warning signals
- **Database**: `conversations`, `messages`, `agent_actions`, `agent_feedback`, `messaging_config`, `ai_logs` bestaan al met RLS
- **Settings**: WhatsApp tab disabled, geen AI Assistent tab
- **Widget**: Telefoon veld bestaat, geen WhatsApp opt-in

---

## Blok 1: Sidebar badge uitbreiden

**Bestand**: `src/hooks/useSignalCount.ts`

Badge = `activeSignals + unreadMessages + pendingActions`. Drie queries combineren.

---

## Blok 2: Assistent pagina → tabs

**Bestand**: `src/pages/Assistent.tsx` (herschrijven)

Drie tabs via URL param (`?tab=overzicht`): Overzicht, Berichten (badge), Takenbox (badge).

### Nieuwe componenten

| Component | Pad |
|---|---|
| `OverviewTab` | `src/components/assistant/OverviewTab.tsx` |
| `MessagesTab` | `src/components/assistant/MessagesTab.tsx` |
| `TaskboxTab` | `src/components/assistant/TaskboxTab.tsx` |
| `ConversationList` | `src/components/assistant/inbox/ConversationList.tsx` |
| `ChatView` | `src/components/assistant/inbox/ChatView.tsx` |
| `GuestProfile` | `src/components/assistant/inbox/GuestProfile.tsx` |

### Nieuwe hooks

| Hook | Pad |
|---|---|
| `useAssistentLog` | `src/hooks/useAssistentLog.ts` |
| `useConversations` | `src/hooks/useConversations.ts` |
| `useConversationMessages` | `src/hooks/useConversationMessages.ts` |
| `useAgentActions` | `src/hooks/useAgentActions.ts` |

---

## Blok 3: Overzicht tab

- Tijdsafhankelijke begroeting met voornaam uit `profiles`
- Urgente items: signals (error/warning) + escalated conversations + concept agent_actions
- Compact overzicht: berichten beantwoord, reserveringen geboekt, reminders verstuurd
- Chronologische log via `useAssistentLog`
- SparkleIndicator (✦) bij AI-acties
- Elke regel klikbaar

### Menselijke taal in de activiteitenlog

Dit is het hart van de Overzicht tab. De `useAssistentLog` hook haalt ruwe data uit `messages`, `audit_log`, en `agent_actions`, maar toont die **nooit** als systeem-output. Elke logregel wordt omgezet naar een menselijke zin alsof een collega het vertelt.

**Hoe het werkt:**

De hook bevat een `humanize()` functie die per event-type een template toepast:

```typescript
function humanize(entry: RawLogEntry): string {
  switch (entry.type) {
    case 'reservation_modified':
      // audit_log: changes = { party_size: { old: 4, new: 6 } }
      // + customer name uit join
      return `${entry.customerName} wilde met ${entry.changes.party_size.new} ipv ${entry.changes.party_size.old} komen. Plek gevonden, aangepast.`;

    case 'reservation_created':
      return `Reservering geboekt voor ${entry.customerName}, ${formatDate(entry.date)} om ${entry.time} (${entry.partySize}p).`;

    case 'reservation_cancelled':
      return `${entry.customerName} heeft geannuleerd (${entry.partySize}p, ${formatDate(entry.date)}).`;

    case 'message_answered':
      // Samenvat de vraag + antwoord
      return `${entry.customerName} vroeg: "${truncate(entry.question, 40)}". Beantwoord.`;

    case 'reminder_sent':
      return `Herinnering verstuurd naar ${entry.customerName} voor morgen ${entry.time}.`;

    case 'bulk_reminders':
      return `${entry.count} herinneringen verstuurd voor morgen.`;

    case 'escalation':
      return `${entry.customerName} wil even met iemand spreken over ${entry.subject}.`;

    case 'action_approved':
      return `${entry.approvedBy} heeft goedgekeurd: ${entry.description}.`;

    case 'action_rejected':
      return `${entry.rejectedBy} heeft afgewezen: ${entry.description}.`;

    default:
      return entry.description || 'Activiteit verwerkt.';
  }
}
```

**Data bronnen en joins:**

```typescript
// 1. audit_log + customers (voor namen)
//    → reservation_modified, reservation_created, reservation_cancelled
//    → Join: audit_log.entity_id → reservations.id → customers.first_name

// 2. messages (outbound, grouped) + conversations + customers
//    → message_answered (AI antwoorden op vragen)
//    → reminder_sent / bulk_reminders (template_name = 'reminder')

// 3. agent_actions + customers
//    → action_approved, action_rejected, escalation

// Alles wordt gesorteerd op created_at DESC, gelimiteerd tot 50 items
```

**Regels:**
- Altijd klantnaam gebruiken, nooit IDs of technische referenties
- Tijden als "14:32" (vandaag) of "gisteren 20:15"
- Afronden met ✓ als de actie succesvol is afgerond
- ✦ sparkle alleen bij `is_ai_generated === true` of `actor_type === 'ai'`
- Klikbaar: `entity_type === 'reservation'` → navigeer naar reservering, `conversation_id` → open gesprek

---

## Blok 4: Team Inbox (Berichten tab)

Drie-kolom layout (280px | flex | 260px).

**Links — ConversationList:** Query conversations + customer + laatste bericht. Filters: Alle/Actief/Escalaties/Afgehandeld. Kanaal icoon, ongelezen indicator, claimed_by. Realtime subscription.

**Midden — ChatView:** Berichten per conversation_id. Gast links (grijs), restaurant rechts (brand). ✦ bij AI berichten. Overnemen/teruggeven toggle. Tekstveld alleen als handled_by !== 'ai'. Realtime subscription.

**Rechts — GuestProfile:** Klantgegevens, reserveringshistorie, allergieën, risicoscore, notities.

---

## Blok 5: Takenbox tab

Openstaande agent_actions (status='concept') met beschrijving. Goedkeuren/Afwijzen met feedback logging. Recent afgehandeld sectie.

---

## Blok 6: Settings

**6a. WhatsApp tab** (`SettingsCommunicatie.tsx`): Tab activeren, setup wizard (API key, webhook URL, test).

**6b. AI Assistent tab** (`SettingsAssistent.tsx`): Agent configuratie tab activeren met toggles (aan/uit, actief venster, auto-reply, auto modify/cancel, grote groepen drempel, talen).

---

## Blok 7: Widget WhatsApp opt-in

`GuestDetailsStep.tsx`: WhatsApp opt-in checkbox na telefoon (alleen bij mobiel nummer, default uit). `BookingContext`: whatsapp_optin toevoegen. `public-booking-api`: opslaan naar customers.whatsapp_opt_in.

---

## Implementatievolgorde

1. `useSignalCount` uitbreiden
2. Hooks: `useConversations`, `useConversationMessages`, `useAgentActions`, `useAssistentLog` (met `humanize()`)
3. Assistent.tsx → tabs structuur
4. OverviewTab (begroeting + urgente items + menselijke activiteitenlog)
5. ConversationList + ChatView + GuestProfile → MessagesTab
6. TaskboxTab
7. SettingsCommunicatie WhatsApp tab
8. SettingsAssistent Agent configuratie tab
9. Widget WhatsApp opt-in

