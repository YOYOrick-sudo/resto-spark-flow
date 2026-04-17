

## HRM Module — Volledig Bouwplan met Code-Reviews per Sprint

### Werkwijze (afgestemd op jouw verzoek)

1. **Per sprint krijg jij eerst de complete code** (SQL + Edge Functions + frontend snippets) ter review
2. **Pas na jouw "akkoord"** ga ik daadwerkelijk bouwen
3. **Per ronde rapportage** met SQL-bewijs + memory-update
4. **Sprint 3 inhoud-check**: ik gebruik jouw originele templates (`screening_info`, `interview_prep`, `trial_day_prep`, `first_day_info`), niet generieke namen
5. **Memory-files** zijn voor Lovable-context; jij krijgt parallel de raw code-output per sprint

---

### Sprintoverzicht (18 deelopdrachten)

| Sprint | Naam | Delen | Volgorde |
|---|---|---|---|
| 1 | Publieke sollicitatiepagina | 1.1 → 1.4 | Eerst |
| 2 | WhatsApp system-wide | 2.1 → 2.4 | Na sprint 1 |
| 3 | Onboarding automatisering++ | 3.1 → 3.3 | Specifieke templates! |
| 4 | Talent pool | 4.1 → 4.2 | |
| 5 | Medewerkers + contracten | 5.1 → 5.5 | Grootste sprint |
| 6 | Sidebar herstructurering | 6.1 → 6.2 | Laatst (URL-migratie) |

---

### Sprint 1 — Publieke Sollicitatiepagina

**Deel 1.1 — DB + Edge Function**
- Migratie: `public_application_settings` (slug, branding-overrides, RLS public SELECT)
- Migratie: `public_applications` (RLS public INSERT)
- Migratie: kolommen toevoegen aan `onboarding_candidates` (source, source_tag, positions, motivation, etc.)
- Seed: bestaande locaties krijgen auto een settings-record met kebab-case slug
- Edge Function `submit-application` met: honeypot, email-regex, rate-limit (3/24u), dedup, trigger-koppeling

**Deel 1.2 — Publieke pagina** `/werken-bij/:slug` buiten app-layout, multi-step, branding via Edge Function

**Deel 1.3 — Settings + hub-card** `/instellingen/onboarding/sollicitatiepagina` met QR-code, autosave

**Deel 1.4 — Polish** Bron-badge op CandidateCard, OG-tags, end-to-end test

---

### Sprint 2 — WhatsApp System-Wide

**Deel 2.1** DB (`whatsapp_connections`) + 360dialog OAuth/API-key + webhook endpoint
**Deel 2.2** Inbox UI uitbreiden + send via 360dialog
**Deel 2.3** Approved templates + signal-koppeling
**Deel 2.4** `/instellingen/communicatie/whatsapp` + status-monitoring

---

### Sprint 3 — Onboarding Automatisering++ ⚠️ Inhoud-check

**Deel 3.1 — Fase-specifieke templates** (jouw originele lijst, niet hergedefinieerd):
- `screening_info` — info na sollicitatie
- `interview_prep` — voorbereiding gesprek (fase 30)
- `trial_day_prep` — info proefdag (fase 50)
- `first_day_info` — eerste werkdag (fase 90)

**Deel 3.2 — Werving-signals** (offer_sent, contract_signed, hired) + agent-koppeling
**Deel 3.3 — Kandidaat-infokaart** + quick-actions, batch-acties, smart filters

---

### Sprint 4 — Talent Pool

**Deel 4.1** DB + auto-archief trigger bij rejected/withdrawn + retentie-config
**Deel 4.2** `/personeel/talent-pool` met filters + "Heractiveer" → terug op pipeline

---

### Sprint 5 — Medewerkers + Contracten

**Deel 5.1** `staff_members`, `staff_documents`, storage bucket, auto-conversie trigger
**Deel 5.2** `candidate_offers` + fase 7 systeemtaak + aanbod-formulier met prefill
**Deel 5.3** `contract_templates`, `contracts`, variable rendering, PDF generatie
**Deel 5.4** `/contract/ondertekenen/:token` + signed-status + bevestigingsmail
**Deel 5.5** Medewerkerspagina (tabs) + pre-boarding form + contractoverzicht + template-editor

---

### Sprint 6 — Sidebar Herstructurering (laatst!)

**Deel 6.1** Personeel-paraplu in sidebar + route-redirects
**Deel 6.2** Settings > Personeel hub + Werving + Contracten secties

---

### Hoe werkt de code-review per sprint?

Voor elke sprint krijg jij **vóór** ik bouw:

1. **Volledige SQL-migratie** (alle CREATE TABLE, RLS policies, triggers, seed)
2. **Edge Function source code** (volledig, niet gesnipperd)
3. **Frontend file-tree** + key componenten in volledige code
4. **Type-definitions** voor nieuwe tabellen
5. **Test-plan**: welke curl-calls / UI-flows ik na het bouwen verifieer

Jij reviewt → geeft akkoord/feedback → ik bouw deel-voor-deel binnen die sprint → per deel rapportage met:
- Volledige geschreven code
- SQL-output van verificatie
- Memory-update bevestiging

---

### Beginnen met Sprint 1?

Bij goedkeuring van dit plan → ik stuur **Sprint 1 review-pakket**: complete SQL + complete `submit-application/index.ts` + complete `PublicApplicationPage.tsx` + complete settings-pagina, alles ter review. Pas bij jouw "akkoord deel 1.1" begin ik met daadwerkelijk schrijven.

Wil je dat ik direct start met het Sprint 1 review-pakket, of eerst nog iets aanpassen aan de sprint-volgorde of -indeling?

