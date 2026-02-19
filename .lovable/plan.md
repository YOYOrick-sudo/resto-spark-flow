

# Widget Settings pagina solider maken

## Huidige problemen

1. De "Open live preview" knop staat los van de embed mode -- het is onduidelijk dat die knop de gekozen mode simuleert
2. De Integratie-sectie is een enkel groot blok waarin alles op een hoop staat (mode selector, preview, config, code)
3. Button-specifieke configuratie (knoptekst, positie) zit in een los `bg-secondary` blokje zonder duidelijke koppeling aan de mode
4. De embed code en de preview knop staan gescheiden -- de operator moet scrollen om beide te vinden

## Oplossing

De Integratie-sectie herstructureren naar een helder, stapsgewijs layout per gekozen mode:

### Nieuwe structuur van sectie 4 (Integratie)

```text
+--------------------------------------------------+
|  Integratie                                       |
|  Kies hoe je de widget op je website wilt tonen.  |
|                                                   |
|  [Floating knop] [Inline embed] [Alleen link]     |  <- EmbedModeSelector (blijft)
|                                                   |
|  +----------------------------------------------+ |
|  | Configuratie                         [Preview]| |  <- Per-mode config + preview link
|  |                                               | |
|  | (button: knoptekst + positie)                 | |
|  | (inline: container ID info)                   | |
|  | (link: directe URL met open knop)             | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Visuele preview (mock browser)                | |  <- Lichtgewicht mockup
|  |  [mock content + knop/widget placeholder]     | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Embed code                          [Kopieer] | |  <- Code block
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

### Concrete wijzigingen

**`WidgetLivePreview.tsx`** -- Aanpassen:
- De "Open live preview" knop verplaatsen naar een meer prominente positie: rechtsboven in de mock browser chrome als een icoontje (ExternalLink), zodat het duidelijk gekoppeld is aan de visuele preview
- Bij link mode: de preview link tonen als primaire actie naast de URL (huidige opzet is al goed, kleine polish)

**`SettingsReserveringenWidget.tsx`** -- Herstructureren:
- De Integratie-sectie opdelen in duidelijke subsecties met labels
- Button mode config (knoptekst + positie) krijgt een subsectie-header "Knopconfiguratie"
- Inline mode krijgt een informatief blokje over het container-element (`<div id="nesto-booking">`)
- De embed code subsectie krijgt een duidelijke header "Installatiecode" (of "Widget URL" bij link mode)
- Elke subsectie binnen de kaart gescheiden door subtiele dividers

**`EmbedCodePreview.tsx`** -- Kleine verbetering:
- De "Open widget" knop hernoemen naar "Open in nieuw tabblad"
- Bij link mode: de URL prominenter tonen met een kopieer-icoontje inline

### Geen nieuwe bestanden nodig

Alle wijzigingen zijn refactoring van bestaande componenten.

## Technische details

### `SettingsReserveringenWidget.tsx`

De Integratie NestoCard wordt intern opgedeeld met `divide-y divide-border/40` of aparte `bg-secondary/50` blokken per subsectie:

1. **Mode selector** (bovenaan, altijd zichtbaar)
2. **Mode-specifieke configuratie** (alleen bij button mode: knoptekst + positie; bij inline: container-id uitleg; bij link: URL)
3. **Visuele preview** (mockup met "Open preview" link in de browser chrome)
4. **Installatiecode** (code block met kopieerknop)

### `WidgetLivePreview.tsx`

De "Open live preview" knop verhuist van een losse full-width knop onder de mockup naar een compact linkje in de browser chrome balk (naast de URL). Dit maakt het visueel duidelijker dat je "deze website" opent in een echt tabblad.

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Integratie-sectie herstructureren met subsecties, inline mode info blok, dividers |
| `src/components/settings/widget/WidgetLivePreview.tsx` | Preview-knop naar browser chrome verplaatsen, compacter |
| `src/components/settings/widget/EmbedCodePreview.tsx` | Kleine label-aanpassingen |

