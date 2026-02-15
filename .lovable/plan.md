

# NestoLogo Component + Branding Overhaul

## Wat wordt gebouwd

Een herbruikbaar `<NestoLogo />` component dat overal in de app wordt gebruikt, plus een complete favicon/branding update.

## 1. Nieuw component: `src/components/polar/NestoLogo.tsx`

**Props:**
- `size?: 'sm' | 'md' | 'lg'` (default `'md'`)
- `showIcon?: boolean` (default `true`)

**Rendering:**
- Optioneel SVG-icoon links: een gestileerde "N" in teal (gebaseerd op de geüploade afbeelding)
- Tekst "nesto" in Plus Jakarta Sans, `font-extrabold`, lowercase
- Kleur: `text-primary` (teal)
- Maten: `sm` = `text-lg`, `md` = `text-2xl`, `lg` = `text-3xl`
- Icoon schaalt mee met de tekst

Export toevoegen aan `src/components/polar/index.ts`.

## 2. Vervanging van alle logo-instanties

| Locatie | Huidig | Nieuw |
|---------|--------|-------|
| `NestoSidebar.tsx` (regel 76-81) | `<span>` met inline fontFamily style, `text-foreground` | `<NestoLogo size="md" />` |
| `Auth.tsx` (regel 117) | `<h1 className="text-3xl font-bold text-foreground">Nesto</h1>` | `<NestoLogo size="lg" showIcon={true} />` |
| `AppLayout.tsx` (regel 65) | `<span className="ml-3 text-xl font-semibold text-primary">nesto</span>` | `<NestoLogo size="sm" showIcon={false} />` |

**Opmerking:** De sidebar-versie verandert van `text-foreground` naar `text-primary` (teal). Dit is een bewuste branding-keuze.

## 3. Favicon & meta tags

- Maak een inline SVG favicon (`public/favicon.svg`) met de teal "N"
- Update `index.html`:
  - `<title>` wordt `Nesto — Horeca Management Platform`
  - Voeg `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` toe
  - Update OG tags naar Nesto branding (titel + beschrijving)
  - Verwijder Lovable placeholder OG image referenties

**Let op:** Een echte `apple-touch-icon.png` (180x180 PNG) en `favicon.ico` kunnen niet programmatisch als pixel-perfect bestanden worden gegenereerd. De SVG favicon werkt in alle moderne browsers. Voor productie (Fase 14) moet een designer de PNG/ICO versies aanleveren.

## 4. Bestanden overzicht

| Actie | Bestand |
|-------|---------|
| Nieuw | `src/components/polar/NestoLogo.tsx` |
| Nieuw | `public/favicon.svg` |
| Bewerkt | `src/components/polar/index.ts` — export toevoegen |
| Bewerkt | `src/components/layout/NestoSidebar.tsx` — logo vervangen |
| Bewerkt | `src/components/layout/AppLayout.tsx` — mobile header logo vervangen |
| Bewerkt | `src/pages/Auth.tsx` — auth page logo vervangen |
| Bewerkt | `index.html` — title, favicon, OG tags |

