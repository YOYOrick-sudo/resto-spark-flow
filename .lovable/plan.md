

# Sessie 2.4 — AI Content Generatie (Basis)

## Samenvatting

Een edge function `marketing-generate-content` die via Lovable AI (gateway) per-platform captions + hashtags + timing suggesties genereert op basis van het Brand Kit profiel. De Social Post Creator krijgt een "AI schrijven" knop die een mini-modal opent, en de Email Builder's "Pas aan met AI" knop wordt geactiveerd.

---

## Architectuur

```text
Frontend                        Edge Function                    Lovable AI Gateway
+--------------------+          +-------------------------+      +------------------+
| Post Creator       |  invoke  | marketing-generate-     |  --> | gemini-3-flash   |
| "AI schrijven" btn | -------> | content                 |      | -preview         |
|                    |          |                         |      +------------------+
| Email Builder      |  invoke  | - Load brand kit        |
| "Pas aan met AI"   | -------> | - Load location context |
|                    |          | - Platform-specific     |
+--------------------+          |   system prompts        |
                                | - Return structured     |
                                |   output via tool call  |
                                +-------------------------+
```

Geen database wijzigingen nodig. Gebruikt bestaande `marketing_brand_kit` + `locations` tabellen.

---

## Stap 1: Edge Function — marketing-generate-content

### `supabase/functions/marketing-generate-content/index.ts` (nieuw)

**Input (body JSON):**
```typescript
{
  type: 'social' | 'email';
  // For social:
  context?: string;        // Gebruiker beschrijft onderwerp
  platforms?: string[];     // ['instagram', 'facebook', 'google_business']
  content_type_tag?: string; // food_shot, team, etc.
  // For email:
  email_body?: string;     // Huidige email tekst
  instruction?: string;    // Wat wil je aanpassen?
}
```

**Flow:**
1. Haal `location_id` uit JWT claims (authenticated request)
2. Fetch `marketing_brand_kit` voor tone_of_voice, tone_description, social_handles
3. Fetch `locations` voor restaurant naam, adres, openingstijden context
4. Bouw platform-specifieke system prompts:

**Instagram prompt regels:**
- Kort (max 150 woorden), visueel beschrijvend
- 8-12 hashtags, mix van breed en niche
- Emoji's passend bij tone_of_voice
- Geen links (Instagram caption links werken niet)

**Facebook prompt regels:**
- Langer, meer context en storytelling
- Geen hashtags
- Reserveringslink placeholder: "[RESERVEER_LINK]"
- Vraag/CTA aan het einde

**Google Business prompt regels:**
- Zakelijk en to-the-point
- Focus op aanbod/actie
- Sterke CTA (bijv. "Reserveer nu", "Bezoek ons")
- Openingstijden vermelding als relevant

5. Call Lovable AI gateway (`google/gemini-3-flash-preview`) met tool calling voor gestructureerde output
6. Return per-platform caption + hashtag suggesties + timing suggestie

**Output (tool call schema):**
```typescript
{
  platforms: {
    instagram?: { caption: string; hashtags: string[] };
    facebook?: { caption: string };
    google_business?: { caption: string };
  };
  suggested_hashtags: string[];  // 10 suggesties als chips
  suggested_time?: string;       // bijv. "18:00" 
  suggested_day?: string;        // bijv. "donderdag"
}
```

**Voor email type:**
```typescript
{
  updated_body: string;  // Aangepaste email tekst
}
```

**Auth:** `verify_jwt = false` in config.toml, maar validate JWT in code via `getClaims()`.

**Error handling:**
- 429 (rate limit): Return specifieke error message
- 402 (credits): Return specifieke error message
- Beide surfaced als toast in frontend

---

## Stap 2: Social Post Creator — AI schrijven

### `src/pages/marketing/SocialPostCreatorPage.tsx` (edit)

**Wijzigingen:**

1. Import `Sparkles` icon, `NestoModal`, en een nieuwe hook `useGenerateContent`
2. Naast het caption textarea: een "AI schrijven" knop (`NestoButton variant="outline" size="sm"` met `Sparkles` icon)
   - Disabled als geen platforms geselecteerd (tooltip: "Selecteer eerst een platform")
3. Click opent een `NestoModal` (size="sm"):
   - Titel: "AI schrijven"
   - Content type tag doorgeven als context
   - Textarea: "Waar gaat deze post over?" (placeholder: "Bijv. nieuw seizoensmenu, teamuitje, speciale actie...")
   - Footer: "Annuleren" + "Genereer" knop
   - Loading state: "Genereer" knop wordt "Genereren..." met disabled
4. Na succesvolle generatie:
   - **Per-platform captions:** Huidige architectuur gebruikt 1 caption voor alle platforms. Wijzig naar per-platform caption state wanneer AI genereert:
     - Nieuwe state: `platformCaptions: Record<SocialPlatform, string>`
     - Als AI genereert: vul per platform apart in
     - Als handmatig getypt: synchroniseer naar alle platforms
     - Live preview toont per-platform caption
   - **Hashtag suggesties:** 10 chips onder het hashtag veld, click om toe te voegen
   - **Timing suggestie:** InfoAlert onder schedule sectie met suggestie
   - Modal sluit automatisch
   - `nestoToast.success('Content gegenereerd')`

---

## Stap 3: Hashtag suggestie chips

Na AI generatie verschijnen onder het hashtag input veld:

```text
Suggesties: [#restaurant] [#seizoensmenu] [#amsterdam] [#foodie] ...
```

- Chips: `text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors`
- Click: voegt hashtag toe aan de lijst (en verwijdert chip)
- Max 10 chips getoond

---

## Stap 4: Per-platform caption state

De Post Creator wijzigt van 1 caption naar per-platform captions:

- Nieuw state object: `{ instagram: '', facebook: '', google_business: '' }`
- Handmatige invoer: schrijft naar alle geselecteerde platforms tegelijk (zoals nu)
- AI generatie: schrijft per platform apart
- Toggle "Per platform bewerken" verschijnt na AI generatie:
  - Uit (default): 1 textarea, sync naar alle
  - Aan: NestoTabs met per-platform textarea + eigen char counter
- SocialPreviewPanel ontvangt per-platform captions
- Bij submit: gebruik platform-specifieke caption als beschikbaar

---

## Stap 5: Email Builder — "Pas aan met AI" activeren

### `src/components/marketing/campaigns/ContentStep.tsx` (edit)

**Wijzigingen:**

1. Verwijder `disabled` van de "Pas aan met AI" knop
2. Verwijder tooltip "Binnenkort beschikbaar"
3. Click opent `NestoModal` (size="sm"):
   - Titel: "Pas aan met AI"
   - Textarea: "Wat wil je aanpassen?" (placeholder: "Bijv. maak de tekst korter, voeg een CTA toe, maak het persoonlijker...")
   - Huidige email body wordt meegestuurd als context
   - Footer: "Annuleren" + "Aanpassen" knop
4. Na succes:
   - Update de text blocks met de AI-aangepaste tekst
   - `nestoToast.success('Email aangepast door AI')`
   - Modal sluit

---

## Stap 6: Hook voor AI generatie

### `src/hooks/useGenerateContent.ts` (nieuw)

```typescript
// useGenerateSocialContent(options) -> mutation
//   Calls supabase.functions.invoke('marketing-generate-content', { body: { type: 'social', ... } })
//   Returns per-platform captions + hashtags + timing

// useGenerateEmailContent(options) -> mutation
//   Calls supabase.functions.invoke('marketing-generate-content', { body: { type: 'email', ... } })
//   Returns updated email body
```

Beide met error handling voor 429/402 status codes, gesurfaced via `nestoToast.error`.

---

## Stap 7: SocialPreviewPanel update

### `src/components/marketing/social/SocialPreviewPanel.tsx` (edit)

- Props uitbreiden: `captions?: Record<SocialPlatform, string>` (naast bestaande `caption`)
- Per preview: gebruik platform-specifieke caption als beschikbaar, anders fallback naar algemene `caption`
- Hashtags per platform: Instagram toont hashtags, Facebook en Google niet

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `supabase/functions/marketing-generate-content/index.ts` | Nieuw: AI edge function |
| `supabase/config.toml` | Edit: verify_jwt = false voor nieuwe function |
| `src/hooks/useGenerateContent.ts` | Nieuw: mutations voor AI content |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | Edit: AI knop, per-platform captions, hashtag chips |
| `src/components/marketing/campaigns/ContentStep.tsx` | Edit: activeer AI knop |
| `src/components/marketing/social/SocialPreviewPanel.tsx` | Edit: per-platform caption support |

---

## Design compliance

- AI knop: `variant="outline" size="sm"` met Sparkles icon (consistent met bestaande email builder)
- Mini-modal: `NestoModal size="sm"`, sentence case labels, rechts uitgelijnde buttons
- Hashtag chips: `bg-primary/10 text-primary border-primary/20 rounded-full` (Patroon 1 toggle style)
- Loading state: knoptekst wijzigt ("Genereren..."), geen spinner
- Toasts: `nestoToast.success('Content gegenereerd')`, `nestoToast.error('Genereren mislukt')`
- Error handling: 429 -> "Te veel verzoeken, probeer het later opnieuw", 402 -> "AI credits zijn op"

---

## Wat NIET in deze sessie

- Brand Intelligence profiel (Sprint 3 — schrijfstijl analyse, visuele stijl, performance data)
- Streaming output (non-streaming invoke is voldoende voor korte captions)
- Media/afbeelding suggesties
- A/B caption auto-generatie

