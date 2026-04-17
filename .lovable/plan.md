

# Plan — Alleen het logo vervangen (Nesto SVG → Shouf PNG)

Minimale, gerichte wijziging. Geen kleuren, geen strings, geen rename. Alleen het visuele logo.

## Wijzigingen

### 1. Assets kopiëren
- `user-uploads://shouf_icon_transparent.png` → `src/assets/shouf-icon.png` (voor sidebar/UI plekken waar alleen icon nodig is)
- `user-uploads://shouf_lockup_transparent.png` → `src/assets/shouf-lockup.png` (icon + wordmark combinatie, voor plekken waar nu icon+tekst staat)
- `user-uploads://shouf_wordmark_transparent.png` → `src/assets/shouf-wordmark.png` (alleen tekst, voor plekken zonder icon)
- `user-uploads://shouf_icon_transparent.png` → `public/favicon.png`
- Verwijder `public/favicon.svg`

### 2. `src/components/polar/NestoLogo.tsx` aanpassen
Component-naam blijft `NestoLogo` (geen breukrisico). Interne SVG + "nesto" tekst worden vervangen door `<img>` elementen die de Shouf PNG's renderen:

- `showIcon=true, showWordmark=true` → toon `shouf-lockup.png`
- `showIcon=true, showWordmark=false` → toon `shouf-icon.png`
- `showIcon=false, showWordmark=true` → toon `shouf-wordmark.png`

Bestaande size-props (`sm`/`md`/`lg`) blijven werken: hoogte van `<img>` schaalt mee zodat alle bestaande call-sites identiek blijven uitlijnen.

### 3. `index.html` favicon-link
```html
<link rel="icon" href="/favicon.png" type="image/png" />
```
(Title, meta-tags, og-tags blijven "Nesto" — niet in scope.)

## Wat NIET verandert
- Kleuren (teal blijft teal — geen bordeaux)
- Component-namen (`NestoLogo`, `NestoCard`, etc.)
- Tekst-strings ("Nesto" in titles, emails, UI)
- Database, edge functions, branding-defaults
- Memory-bestanden

## Bestandenoverzicht

| # | Actie | Bestand |
|---|---|---|
| 1 | COPY | uploads → `src/assets/shouf-icon.png`, `shouf-lockup.png`, `shouf-wordmark.png` |
| 2 | COPY | upload → `public/favicon.png` |
| 3 | DELETE | `public/favicon.svg` |
| 4 | EDIT | `src/components/polar/NestoLogo.tsx` |
| 5 | EDIT | `index.html` (alleen favicon-regel) |

## Resultaat
Overal in de app waar `<NestoLogo />` wordt gerenderd (sidebar, login, 404, loading screens, emails-preview), zie je het Shouf-logo. Browsertab toont Shouf-favicon. Alle andere code blijft 100% intact.

