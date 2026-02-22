

# Sessie 1.9 — CSV Import + Export voor Contacten

## Samenvatting

Twee features op de Contacten pagina: een directe CSV export van de gefilterde contactlijst, en een 3-staps CSV import modal voor het importeren van gastlijsten uit externe systemen.

---

## 1. CSV Export

### Wat de gebruiker ziet
- Een "Exporteer" knop (outline variant, Download icoon) verschijnt in de PageHeader
- Klikken downloadt direct een CSV bestand met de huidige gefilterde lijst
- Toast bevestiging: "Export gedownload"

### Technisch

**`src/hooks/useMarketingContacts.ts`** -- nieuwe `exportContactsCsv()` functie:
- Roept dezelfde `list_segment_customers` RPC aan maar zonder LIMIT (of limit 10000)
- Past client-side search filter toe (zelfde logica als bestaande hook)
- Genereert CSV string met puntkomma-scheidingsteken (NL Excel standaard)
- Kolommen: Voornaam;Achternaam;Email;Telefoon;Bezoeken;Laatste bezoek;Gem. besteding;Tags
- Datums in DD-MM-YYYY format
- Download via `Blob` + `URL.createObjectURL` + `<a>` click
- Bestandsnaam: `nesto-contacten-YYYY-MM-DD.csv`

**`src/pages/marketing/ContactsPage.tsx`** -- PageHeader actions toevoegen:
- Export knop als `NestoButton variant="outline"` met `Download` icoon

---

## 2. CSV Import

### Wat de gebruiker ziet
- Een "Importeer" knop (outline variant, Upload icoon) in de PageHeader
- Opent een 3-staps modal (NestoModal met StepIndicator, size="lg")

### Stap 1: Bestand uploaden
- Drag-and-drop zone met dashed border + "Kies bestand" knop
- Accepteert .csv, .tsv, .txt (max 5MB)
- Na upload: parsed met **papaparse** (nieuwe dependency)
- Preview: eerste 5 rijen in een mini-tabel
- Automatische scheidingsteken-detectie

### Stap 2: Kolommen koppelen
- Links: gedetecteerde CSV kolommen (headers)
- Rechts: NestoSelect dropdowns met Nesto velden
- Nesto velden: Voornaam (verplicht), Achternaam, Email (verplicht), Telefoon, Verjaardag, Tags, Overslaan
- Auto-matching op bekende header namen (email, e-mail, voornaam, first_name, etc.)
- Validatie: Voornaam en Email moeten gekoppeld zijn

### Stap 3: Bevestigen
- Samenvatting: "XX contacten worden geimporteerd"
- Waarschuwingen voor ongeldige emails en bestaande contacten
- Checkbox: "Importeer als marketing opt-in" (default UIT)
- "Importeer" knop start verwerking

### Import logica

**`src/hooks/useImportContacts.ts`** -- nieuw bestand:
- `useImportContacts()` mutation
- Per rij: valideer email (regex), check bestaande customer (email + location_id)
- Bestaand: UPDATE naam/telefoon/verjaardag/tags (merge, niet overschrijven als leeg)
- Nieuw: INSERT customer
- Als opt-in aan: UPSERT `marketing_contact_preferences` met `consent_source='import'`, `opted_in=false`
- Verwerking in chunks van 50
- Resultaat: `{ imported, updated, skipped, errors }`
- Toast na afloop met samenvatting
- Invalidate contacten queries

### Opt-in verwerking
Gebruikt het simpelere alternatief: bestaande `marketing-process-automation` cron pikt nieuwe contacten met `opted_in=false` automatisch op. Geen aparte edge function nodig.

---

## Nieuwe dependency

- **papaparse** -- CSV parsing library (niet aanwezig in project, moet geinstalleerd worden)

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/pages/marketing/ContactsPage.tsx` | Edit: import/export knoppen in PageHeader, modal state |
| `src/hooks/useMarketingContacts.ts` | Edit: `exportContactsCsv()` functie toevoegen |
| `src/hooks/useImportContacts.ts` | Nieuw: import mutation + validatie + chunked upsert |
| `src/components/marketing/contacts/ImportContactsModal.tsx` | Nieuw: 3-staps import modal met drag-drop, mapping, bevestiging |
| `src/components/marketing/contacts/ColumnMapper.tsx` | Nieuw: kolom koppeling UI component |
| `src/components/marketing/contacts/ImportPreview.tsx` | Nieuw: CSV preview mini-tabel |

---

## Design compliance

- Modal: NestoModal size="lg" met StepIndicator (3 stappen)
- Secties gescheiden door `border-t border-border/50 pt-4 mt-4`
- Footer buttons: rechts uitgelijnd, `flex justify-end gap-3`
- Toasts: `nestoToast.success()` / `nestoToast.error()`
- Buttons: outline variant voor import/export, primary voor "Importeer"
- Drag-drop zone: dashed border `border-2 border-dashed border-border rounded-card`
- Alle labels in sentence case

