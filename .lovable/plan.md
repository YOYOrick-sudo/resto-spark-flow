

# Popup & Ticket Afronding — Consistent met Guest Widget

## Wat verandert

De popup en de ticket-card in de popup krijgen dezelfde afgeronde hoeken als de guest booking widget. Momenteel gebruiken ze `12px` / `rounded-xl`, terwijl het guest widget `rounded-3xl` (24px) gebruikt voor ticket cards.

## Wijzigingen

### 1. Widget (`marketing-popup-widget/index.ts`)

| Element | Huidig | Nieuw |
|---------|--------|-------|
| `.nesto-popup` border-radius | `12px` | `24px` |
| `.nesto-featured` border-radius | `12px` | `24px` |
| `.nesto-btn` border-radius | `8px` | `12px` |
| `.nesto-input` border-radius | `8px` | `12px` |

### 2. Mockup preview (`PopupPage.tsx`)

| Element | Huidig | Nieuw |
|---------|--------|-------|
| Popup card (regel 551) | `rounded-xl` + `borderRadius: 12` | `rounded-3xl` (verwijder inline style) |
| Ticket card (regel 574) | `rounded-xl` | `rounded-3xl` |
| CTA button (regel 583) | `rounded-lg` | `rounded-xl` |
| Newsletter input (regel 561) | `rounded-lg` | `rounded-xl` |
| Newsletter button (regel 562) | `rounded-lg` | `rounded-xl` |
| Custom button (regel 590) | `rounded-lg` | `rounded-xl` |
| Sticky bar input (regel 602) | `rounded-lg` | `rounded-xl` |
| Sticky bar button (regel 604) | `rounded-lg` | `rounded-xl` |

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/marketing-popup-widget/index.ts` | Border-radius verhogen op popup, featured, btn, input |
| `src/pages/marketing/PopupPage.tsx` | Mockup preview afrondingen matchen |

