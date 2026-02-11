

# Fase 1 + 2: Onboarding Berichten — Database, Thread UI en Compose Modal

## Overzicht

Bouw een volledig werkend berichtensysteem binnen de onboarding module. Kandidaat-detailpagina krijgt een nieuwe "Berichten" tab met chronologische thread en een compose-modal om handmatig berichten te versturen via de bestaande Resend integratie.

## Scope

**Wel bouwen:**
- `onboarding_messages` tabel met RLS
- Berichten-tab op kandidaat-detailpagina (chronologische thread)
- Compose modal om handmatig een bericht te sturen
- `send-onboarding-message` Edge Function (via Resend)
- Bestaande `onboarding-agent` aanpassen zodat verstuurde emails ook in `onboarding_messages` worden opgeslagen

**NIET bouwen (post-launch):**
- Bijlagen uploaden (fase 3)
- Inbound email webhook (fase 4)
- Document templates (fase 5)
- Unread indicators (fase 6)

---

## Stap 1: Database migratie

Nieuwe tabel `onboarding_messages`:

| Kolom | Type | Default | Nullable |
|-------|------|---------|----------|
| id | uuid PK | gen_random_uuid() | nee |
| candidate_id | uuid FK -> onboarding_candidates | - | nee |
| location_id | uuid FK | - | nee |
| direction | text | 'outbound' | nee |
| sender_name | text | - | nee |
| sender_email | text | - | nee |
| subject | text | - | nee |
| body_html | text | - | nee |
| body_text | text | - | ja |
| resend_message_id | text | - | ja |
| triggered_by | text | 'user' | nee |
| read_at | timestamptz | - | ja |
| created_at | timestamptz | now() | nee |

RLS policies (zelfde patroon als andere onboarding tabellen):
- SELECT: `user_has_location_access(auth.uid(), location_id)`
- SELECT: `is_platform_user(auth.uid())`
- INSERT: `user_has_role_in_location(auth.uid(), location_id, ['owner','manager'])`
- UPDATE: `user_has_role_in_location(auth.uid(), location_id, ['owner','manager'])`
- DELETE: `user_has_role_in_location(auth.uid(), location_id, ['owner','manager'])`

Realtime inschakelen voor live updates:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_messages;
```

---

## Stap 2: Edge Function `send-onboarding-message`

Nieuw bestand: `supabase/functions/send-onboarding-message/index.ts`

Verantwoordelijkheden:
1. Ontvangt POST met `candidate_id`, `subject`, `body_html`, `body_text`
2. Valideert dat de kandidaat bestaat en actief is
3. Haalt communication_settings op voor sender_name en reply_to
4. Verstuurt email via Resend (hergebruikt logica uit `_shared/email.ts`)
5. Slaat bericht op in `onboarding_messages` tabel (direction: 'outbound', triggered_by: 'user')
6. Logt event in `onboarding_events` (event_type: 'email_sent')
7. Retourneert het opgeslagen bericht

Authenticatie: JWT verificatie via `supabaseAdmin` met de user's auth token.

---

## Stap 3: Bestaande `_shared/email.ts` uitbreiden

De bestaande `sendEmail` functie uitbreiden zodat het optioneel ook een record in `onboarding_messages` opslaat. Dit zorgt ervoor dat alle emails die de Agent automatisch verstuurt ook in de Berichten-tab verschijnen.

Aanpak: een optionele `saveToMessages: boolean` parameter toevoegen aan `SendEmailParams`. Wanneer `true`, wordt naast het event ook een `onboarding_messages` row aangemaakt met `triggered_by: 'agent'`.

---

## Stap 4: Frontend — Hook `useOnboardingMessages`

Nieuw bestand: `src/hooks/useOnboardingMessages.ts`

- Query: `onboarding_messages` gefilterd op `candidate_id`, gesorteerd op `created_at ASC`
- Realtime subscription voor live updates wanneer Agent of webhook berichten toevoegt
- Query key: `['onboarding-messages', candidateId]`

---

## Stap 5: Frontend — Hook `useSendMessage`

Nieuw bestand: `src/hooks/useSendMessage.ts`

- Mutation die de `send-onboarding-message` Edge Function aanroept
- Invalideert `['onboarding-messages', candidateId]` en `['onboarding-events', candidateId]` na succes
- Toast feedback: success of error

---

## Stap 6: Frontend — `MessageThread` component

Nieuw bestand: `src/components/onboarding/MessageThread.tsx`

Chronologische lijst van berichten met visueel onderscheid:
- **Outbound (user)**: Rechts uitgelijnd of teal-accent links-border, naam afzender + timestamp
- **Outbound (agent)**: Zelfde styling maar met AssistentIcon sparkle naast de naam
- **Inbound (candidate)**: Neutrale styling, links uitgelijnd (voorlopig alleen placeholder — wordt pas gevuld met inbound webhook in fase 4)

Elk bericht toont:
- Sender naam + timestamp
- Onderwerp (bold)
- Body preview (HTML gerenderd als tekst, max 3 regels, uitklapbaar)
- Triggered_by indicator (AssistentIcon voor agent)

Empty state wanneer er nog geen berichten zijn.

---

## Stap 7: Frontend — `ComposeMessageModal` component

Nieuw bestand: `src/components/onboarding/ComposeMessageModal.tsx`

Volgt het standaard Nesto modal pattern:
- NestoModal met `size="md"`
- Velden: Onderwerp (NestoInput), Bericht (Textarea)
- Footer: Annuleren (outline) + Versturen (primary), rechts uitgelijnd
- Disabled state tijdens verzending
- Sluit automatisch na succes

---

## Stap 8: Frontend — `OnboardingDetail.tsx` aanpassen

Wijzigingen:
1. Tab-array uitbreiden: `[Taken, Berichten, Tijdlijn]`
2. Nieuwe `NestoTabContent` voor "berichten" tab met `MessageThread` component
3. "Verstuur bericht" button boven de thread (alleen zichtbaar als kandidaat actief is)
4. ComposeMessageModal state management (open/close)

---

## Stap 9: Export en index updates

- `src/components/onboarding/index.ts` — exporteer `MessageThread` en `ComposeMessageModal`

---

## Bestandsoverzicht

| Bestand | Actie |
|---------|-------|
| SQL migratie (`onboarding_messages` tabel + RLS + realtime) | Nieuw |
| `supabase/functions/send-onboarding-message/index.ts` | Nieuw |
| `supabase/functions/_shared/email.ts` | Uitbreiden |
| `supabase/functions/onboarding-agent/index.ts` | Aanpassen (saveToMessages) |
| `src/hooks/useOnboardingMessages.ts` | Nieuw |
| `src/hooks/useSendMessage.ts` | Nieuw |
| `src/components/onboarding/MessageThread.tsx` | Nieuw |
| `src/components/onboarding/ComposeMessageModal.tsx` | Nieuw |
| `src/pages/OnboardingDetail.tsx` | Aanpassen (tab + compose) |
| `src/components/onboarding/index.ts` | Uitbreiden |
| `supabase/config.toml` | Toevoegen: `[functions.send-onboarding-message]` |

