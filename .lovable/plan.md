

# Policy Sets Beheer + Squeeze Defaults + Inline Preview (v2)

## Wijzigingen t.o.v. vorig voorstel

### Wijziging 1: Description veld in Basis-sectie

De "Basis" sectie in `PolicySetDetailSheet` krijgt naast "Naam" ook een optioneel "Beschrijving" veld (textarea, max 200 tekens). Dit veld:

- Wordt opgeslagen in `policy_sets.description` (kolom bestaat al in de database)
- Wordt getoond op de `PolicySetCard` als subtekst onder de naam (indien gevuld)
- Wordt getoond in de policy set dropdown op de ticket detail pagina (als secondary text)
- Placeholder: "Bijv. voor groepen vanaf 8 personen"

Geen database migratie nodig — `description` kolom bestaat al.

### Wijziging 2: Archiveer-guard met blokkade

Bij archiveren checkt `useArchivePolicySet` eerst het aantal actieve gekoppelde tickets:

```text
SELECT count(*) FROM tickets 
WHERE policy_set_id = :id AND status = 'active'
```

- **0 actieve tickets**: archiveer direct (met ConfirmDialog)
- **1+ actieve tickets**: blokkeer met foutmelding via ConfirmDialog variant:
  - Titel: "Beleid kan niet gearchiveerd worden"
  - Tekst: "Dit beleid is gekoppeld aan X actieve ticket(s). Koppel deze tickets eerst aan een ander beleid voordat je dit beleid archiveert."
  - Alleen een "Begrepen" knop, geen destructieve actie
  - Lijst met de namen van de gekoppelde tickets (klikbaar, navigeert naar ticket detail)

De guard zit in de UI-laag (pre-check voor de mutation), niet als database constraint — consistent met hoe andere archiveer-flows werken in Nesto.

---

## Volledige scope (inclusief wijzigingen)

### 1. Squeeze Defaults op tickets tabel

Database migratie: 5 kolommen toevoegen aan `tickets`:

| Kolom | Type | Default |
|-------|------|---------|
| squeeze_enabled | boolean | false |
| squeeze_duration_minutes | integer | nullable |
| squeeze_gap_minutes | integer | 0 |
| squeeze_to_fixed_end_time | time | nullable |
| squeeze_limit_per_shift | integer | nullable |

Update `get_shift_ticket_config` RPC: COALESCE shift_tickets overrides met tickets defaults.

### 2. Hooks (`src/hooks/usePolicySets.ts`)

| Hook | Functie |
|------|---------|
| `usePolicySets` | Uitbreiden: alle velden + ticketCount via count query |
| `useCreatePolicySet` | Bestaand, blijft |
| `usePolicySet(id)` | **Nieuw** — Enkel policy set + gekoppelde ticket namen |
| `useUpdatePolicySet` | **Nieuw** — Update alle velden inclusief description |
| `useArchivePolicySet` | **Nieuw** — Pre-check actieve tickets, blokkeer of archiveer |
| `useRestorePolicySet` | **Nieuw** — Restore (is_active = true) |

### 3. Overzichtspagina (`SettingsReserveringenBeleid.tsx`)

Route: `/instellingen/reserveringen/beleid`

Kaarten grid met `PolicySetCard`:
- Naam + beschrijving (indien gevuld)
- 4 regels leesbare samenvatting (betaling, annulering, no-show, reconfirmatie)
- Badge: "X tickets"
- Klik opent `PolicySetDetailSheet`

Header: "+ Nieuw beleid" knop. Archief sectie: collapsible onderaan.

### 4. Detail Sheet (`PolicySetDetailSheet.tsx`)

Sheet van rechts, 5 secties:
1. **Basis** — Naam + Beschrijving (textarea, optioneel)
2. **Betaling** — Type dropdown + bedrag (conditioneel)
3. **Annulering** — Type dropdown + uren (conditioneel)
4. **No-show** — Type dropdown + minuten + kosten (conditioneel)
5. **Reconfirmatie** — Enabled toggle + uren + verplicht toggle

Onderaan: "Gekoppelde tickets" lijst (read-only). InfoAlert als meer dan 1 ticket gekoppeld.

### 5. Inline Preview op Ticket Detail

In de beleid-sectie van `SettingsReserveringenTicketDetail.tsx`:
- Preview-card met 4 regels samenvatting van geselecteerde policy set
- Beschrijving getoond als secondary text in de dropdown
- "+ Nieuw beleid" opent `PolicySetDetailSheet`

### 6. Samenvattingshelper (`policySetSummary.ts`)

Gedeelde functies voor leesbare teksten:
- `formatPaymentSummary(policySet)` — "Geen betaling" / "EUR 25,00 p.p. deposit"
- `formatCancelSummary(policySet)` — "Gratis annuleren" / "Tot 24u voor aanvang"
- `formatNoshowSummary(policySet)` — "Geen actie" / "Markeren na 15 min"
- `formatReconfirmSummary(policySet)` — "Uit" / "24u voor, verplicht"

### 7. Bestanden overzicht

| Bestand | Actie |
|---------|-------|
| **SQL migratie** | Squeeze kolommen op tickets + update RPC |
| `src/hooks/usePolicySets.ts` | Uitbreiden met 4 nieuwe hooks |
| `src/pages/settings/reserveringen/SettingsReserveringenBeleid.tsx` | **Nieuw** |
| `src/components/settings/tickets/PolicySetCard.tsx` | **Nieuw** |
| `src/components/settings/tickets/PolicySetDetailSheet.tsx` | **Nieuw** |
| `src/components/settings/tickets/PolicySetsSection.tsx` | **Nieuw** |
| `src/components/settings/tickets/policySetSummary.ts` | **Nieuw** |
| `src/pages/settings/reserveringen/SettingsReserveringenTicketDetail.tsx` | Beleid-sectie met inline preview |
| `src/lib/settingsRouteConfig.ts` | Sectie "beleid" toevoegen |
| `src/App.tsx` | Route toevoegen |
| `src/pages/settings/reserveringen/index.ts` | Export toevoegen |
| `docs/ARCHITECTURE_ALIGNMENT.md` | **Nieuw** — Referentiedocument |
| `docs/ROADMAP.md` | Status 4.4 bijwerken |

### 8. Wat NIET verandert

- PolicySetModal blijft als quick-create in ShiftWizard/ticket detail
- TicketModal blijft voor ShiftWizard
- Bestaande tickets UI en hooks intact
- ShiftWizard squeeze-velden op shift_tickets blijven (nu met fallback)

