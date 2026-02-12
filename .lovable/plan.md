

# Ticket aanmaken/bewerken — Van modal naar eigen pagina

## Probleem
De TicketModal bevat te veel content (10+ velden, kleurkiezer, beleid-sectie) waardoor het uit beeld raakt. Niet enterprise-waardig.

## Oplossing
Vervang de modal door een dedicated Level 4 detail-pagina, consistent met het bestaande settings navigatie-patroon.

## Routes

| Route | Doel |
|-------|------|
| `/instellingen/reserveringen/tickets` | Overzicht (bestaand, blijft) |
| `/instellingen/reserveringen/tickets/nieuw` | Nieuw ticket aanmaken |
| `/instellingen/reserveringen/tickets/:id` | Bestaand ticket bewerken |

## Pagina-indeling

De nieuwe detail-pagina gebruikt `SettingsDetailLayout` met breadcrumbs: **Instellingen > Reserveringen > Tickets > Nieuw ticket** (of de ticketnaam bij bewerken).

Secties op de pagina (in NestoCard's):

1. **Basis** — Type (regulier/event), naam, display titel, korte beschrijving, kleur
2. **Reservering** — Tafeltijd, buffer, min/max gasten
3. **Beleid** — Policy set selectie + "Nieuw beleid" knop (PolicySetModal blijft een modal, die is klein genoeg)

Footer met "Annuleren" (terug naar overzicht) en "Aanmaken" / "Opslaan" button.

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `src/pages/settings/reserveringen/SettingsReserveringenTicketDetail.tsx` | **Nieuw** — Detail-pagina met het formulier (content uit TicketModal verplaatst) |
| `src/App.tsx` | Route toevoegen: `/instellingen/reserveringen/tickets/nieuw` en `/:id` |
| `src/pages/settings/reserveringen/SettingsReserveringenTickets.tsx` | "Nieuw ticket" knop linkt naar `/tickets/nieuw` i.p.v. modal trigger |
| `src/components/settings/tickets/TicketsSection.tsx` | Kaart-klik navigeert naar `/tickets/:id` i.p.v. modal openen |
| `src/components/settings/tickets/TicketCard.tsx` | onClick navigeert naar detail-route |
| `src/lib/settingsRouteConfig.ts` | Breadcrumb config toevoegen voor ticket detail level |
| `src/components/settings/shifts/ShiftWizard/steps/TicketsStep.tsx` | Blijft ongewijzigd — de quick-create modal in de ShiftWizard is een apart gebruik en klein genoeg |

## Wat blijft
- **PolicySetModal** blijft een modal (compact formulier, past prima)
- **TicketsStep in ShiftWizard** behoudt zijn eigen inline TicketModal voor quick-create (andere context)
- **TicketModal.tsx** wordt uiteindelijk niet meer gebruikt vanuit de tickets-pagina, maar blijft beschikbaar voor de ShiftWizard

## Technisch
- Formulier-logica (state, validatie, submit) wordt 1-op-1 verplaatst van TicketModal naar de nieuwe pagina
- Bij bewerken: ticket ophalen via `useTickets` + route param `:id`
- Na opslaan/aanmaken: `navigate(-1)` terug naar overzicht
- Breadcrumbs via bestaande `buildBreadcrumbs` functie

