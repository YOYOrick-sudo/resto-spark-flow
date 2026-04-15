# SPRINT MEP-E — Waste + Personeelsmaaltijd ✅ AFGEROND

## Gebouwd

### Nieuwe bestanden (5)
1. `src/utils/portieDefaults.ts` — Portie-schattingen per ingrediënt-categorie + `getPortieVoorPersonen()` helper
2. `src/hooks/useWasteMutation.ts` — 3-staps mutation: waste_registratie → voorraad_beweging → voorraad update (met verse fetch per item)
3. `src/hooks/useGerechtSearch.ts` — Zoek gerechten op naam (location-scoped)
4. `src/components/mep/WasteModal.tsx` — Waste registratie modal (ingrediënt zoek, reden dropdown, kostprijs preview)
5. `src/components/mep/PersoneelsmaaltijdModal.tsx` — Personeelsmaaltijd modal met 3 secties:
   - Sectie 1 (default): Halffabricaat/ingrediënt zoeken + hoeveelheid
   - Sectie 2 (ingeklapt): Gerecht van de kaart → ingrediënten via gerecht_componenten
   - Sectie 3 (ingeklapt): Schatting → auto-porties via portieDefaults

### Gewijzigd bestand (1)
- `src/pages/MepTaken.tsx` — 2 ghost buttons (Waste + Personeel) + modal state

## Database
- Geen migraties nodig
- `voorraad_bewegingen.type` trigger accepteert "WASTE"
- `waste_registraties.categorie` is vrij varchar — "personeelsmaaltijd" werkt direct
- Gerecht-flow: gerecht_componenten met type="recept" → recept_ingredienten → afschrijven, type="ingrediënt" → direct afschrijven
