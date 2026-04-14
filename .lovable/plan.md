

# Plan: Seed script uitbreiden met ontbrekende stappen

## Wat er al is
Het huidige `src/lib/seedDemoData.ts` bevat stappen 1-7 (leveranciers, ingrediënten, allergenen, recepten, gerechten, MEP taken, voorraad bewegingen). Het mist:

- **Stap 4: Leveranciers-artikelen** (`leveranciers_artikelen` tabel bestaat al)
- **Stap 9: HACCP checklists** (geen tabel in DB — vereist migratie)
- **Stap 10: Waste registraties** (`waste_registraties` tabel bestaat al)

Daarnaast een paar correcties op bestaande data.

## Wat verandert

### 1. Data-correcties in bestaande seed (seedDemoData.ts)

| Item | Huidig | Nieuw |
|------|--------|-------|
| `Eieren (doos 30st)` | naam in alle arrays | → `Eieren` (conform spec) |
| Basilicum voorraad | 0.3 | → 0.15 (zodat LAAG badge verschijnt) |
| `max_voorraad` | niet meegegeven | → toevoegen per ingrediënt (kolom bestaat) |
| Leveranciers | geen `levert_op`, `bestel_cutoff`, `min_bestelbedrag` | kolommen bestaan niet in DB → **overslaan** |

### 2. Nieuwe stap: Leveranciers-artikelen (na ingrediënten)

Insert 15 rijen in `leveranciers_artikelen` met:
- `leverancier_id`, `ingredient_id`, `artikel_naam` (= ingrediënt naam)
- `artikel_nummer`, `verpakking_hoeveelheid`, `verpakking_eenheid`, `prijs_per_verpakking`
- `prijs_per_eenheid` (berekend: prijs / verpakking)

Geen `is_preferent` kolom in de tabel, dus dat slaan we over.

### 3. Nieuwe stap: Waste registraties (na voorraad bewegingen)

Insert 2 rijen in `waste_registraties`:
- Slagroom 0.5L bederf (gisteren), kosten €2.10
- Basilicum 0.05kg bederf (2 dagen geleden), kosten €1.25

### 4. HACCP checklists — overslaan

Er is geen `haccp_checklists` tabel in de database. Dit vereist eerst een migratie om de tabel aan te maken. Dat is een apart traject — niet meenemen in deze seed-uitbreiding.

### 5. Delete-functie uitbreiden

`deleteDemoData` moet ook `leveranciers_artikelen` en `waste_registraties` opruimen.

### 6. SeedResult type uitbreiden

Toevoegen: `leveranciersArtikelen` en `wasteRegistraties` counts.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/seedDemoData.ts` | Alle bovenstaande aanpassingen |

Geen migraties, geen nieuwe bestanden.

## Technische details

**Leveranciers-artikelen insert** komt na de ingrediënten-insert (we hebben `ingMap` en `levMap` nodig). De `prijs_per_eenheid` wordt berekend als `prijs_per_verpakking / verpakking_hoeveelheid`.

**Waste registraties** worden na voorraad bewegingen ingevoegd. Velden: `location_id`, `ingredient_id`, `hoeveelheid`, `eenheid`, `categorie: "bederf"`, `reden`, `geschatte_kosten`, `waste_datum`, `geregistreerd_door` (huidige user).

**Delete-volgorde update**: waste_registraties en leveranciers_artikelen worden vóór ingrediënten verwijderd (FK dependency).

