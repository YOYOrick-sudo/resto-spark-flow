# Fase 4.4: Tickets & Beleid — Conceptdocument

## Het idee in het kort

Nesto behandelt reserveringen als **producten**, niet als tafelslots. Een "ticket" is het product dat de gast boekt — van een simpele dinertafel tot een 5-gangen proeverij met prepay. Elk ticket heeft een naam, foto, beschrijving, prijs, en spelregels.

Dit is de architecturale kernkeuze: **scheiding van product en tijd**. Een ticket beschrijft WAT de gast boekt. Een shift beschrijft WANNEER er geboekt kan worden. De koppeling ertussen bepaalt de fijnafstelling. Dit concept is bewezen door Formitable en overgenomen door Nesto.

## Voorbeelden van tickets in de praktijk

- **"Reservering"** — het default ticket, geen foto, geen betaling, voor een simpel buurtcafé
- **"5-Gangen Proeverij"** — hero foto, menubeschrijving, €65 p.p. prepay
- **"High Tea op het Terras"** — zondagen, €35 p.p. deposit, max 6 personen
- **"Chef's Table Experience"** — exclusief, alleen via privé-link, €95 p.p.
- **"Kerstdiner"** — event ticket, één datum, €85 p.p., niet annuleerbaar

## Architectuur

### Scheiding product / tijd / regels

```
+------------+       +--------------+
|  tickets   |------>| policy_sets  |
| (WAT)      |  N:1  | (REGELS)     |
+------------+       +--------------+
      |
      | N:M via shift_tickets
      v
  +--------+
  | shifts |
  | (WANNEER) |
  +--------+
```

- **Ticket** = het product (naam, foto, duur, groepsgrootte)
- **Policy Set** = herbruikbare spelregels (betaling, annulering, no-show)
- **Shift** = wanneer er geboekt kan worden (tijden, dagen)
- **Shift-Ticket koppeling** = fijnafstelling per combinatie (override duur, pacing, squeeze, areas)

### Default ticket

Elke locatie krijgt automatisch een default ticket ("Reservering") bij aanmaak. Dit ticket:
- Heeft `ticket_type = 'default'`, geen image, geen beschrijving
- Is gekoppeld aan een default policy set (geen betaling, gratis annuleren, no-show markeren)
- Als het de enige actieve ticket is, ziet de gast géén keuze-scherm in de widget
- Kan niet verwijderd worden, alleen gearchiveerd

### Policy Sets — herbruikbare spelregels

Een policy set beschrijft de spelregels los van het ticket. Dit voorkomt dat 10 tickets met dezelfde regels 10x geconfigureerd moeten worden.

Spelregels omvatten:
- **Betaling**: geen / deposit / volledige prepay / no-show garantie
- **Annulering**: gratis / window (X uur voor aankomst) / niet annuleerbaar
- **No-show**: niets / markeren / doorbelasten
- **Herbevestiging**: optioneel, X uur voor aankomst

### Shift-Ticket koppeling — fijnafstelling

De `shift_tickets` koppeltabel bevat nullable override-velden die terugvallen op ticket-defaults:

```
effectieve waarde = COALESCE(shift_tickets.override_X, tickets.X)
```

Dit maakt het mogelijk om:
- Een ticket met standaard 2 uur duur in de lunch 90 minuten te geven
- Pacing per shift in te stellen (max gasten per tijdslot)
- Squeeze alleen in avondshifts in te schakelen
- Tickets te beperken tot specifieke areas

### 5 Capaciteitslagen — laagste wint

1. **Pacing** — max gasten per tijdslot (op shift_tickets)
2. **Seating** — max gasten/reserveringen per shift (op shift_tickets)
3. **Restaurant** — totale capaciteit (op reservation_settings)
4. **Area** — capaciteit per gebied (op areas/tables)
5. **Tafels** — fysieke stoelen (op tables)

De availability engine (Fase 4.5) controleert alle lagen. De laagste wint.

## Wat Nesto verbetert t.o.v. Formitable

| Aspect | Formitable | Nesto |
|--------|-----------|-------|
| Beleid | Ingebakken in ticket | Herbruikbare policy sets |
| Preview | Geen | Live preview bij configuratie |
| Overzicht | Platte lijst | Visuele productkaarten |
| Configuratie | Verspreid over pagina's | Geconsolideerd per koppeling |
| Vol-bericht | "Vol" | Reden waarom (reason codes) |
| Squeeze | Niet gelabeld | Gelabeld als 'Compact' met eindtijd |

## Sessie-indeling

| Sessie | Naam | Type |
|--------|------|------|
| A | Database fundament | Tabellen, triggers, RLS, RPCs |
| B | Signalen | Signal Provider uitbreiding |
| C | Tickets UI | Overzichtspagina + Ticket Wizard |
| D | Shift Wizard update | Mock vervangen door live data |
| E | Integratietest | Handmatig testen |

## Bewust niet in MVP

- Multi-language (v2, NL markt eerst)
- Mollie (Stripe only voor MVP)
- Fee-config per betaalmethode
- Gift vouchers aan tickets
- Google Posts integratie
