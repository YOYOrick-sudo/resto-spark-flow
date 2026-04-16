

# Plan: Toast Notificatie Audit — Ruis Verminderen

## Verbeterpunt

Er zijn **~130 success toasts** verspreid over 89 bestanden. De meeste verschijnen na acties waarvan het resultaat direct zichtbaar is in de UI (item verschijnt in lijst, toggle flipt, veld wordt opgeslagen). Dit leidt tot "notification blindness" — de kok negeert alle toasts, inclusief de belangrijke.

## Principe

**Toast alleen wanneer de UI het resultaat niet toont.**

| Toast WEL | Toast NIET |
|-----------|------------|
| Externe side-effect (email verstuurd, bestelling naar leverancier) | Item verschijnt/verdwijnt in zichtbare lijst |
| Destructieve/onomkeerbare actie (archiveren, verwijderen) | Inline save / auto-save / blur-save |
| Wizard completion + navigatie naar andere pagina | Settings opslaan (formulier blijft open) |
| Bulk operatie resultaat (import, bulk uitzonderingen) | Favoriet toggle (visueel al zichtbaar) |
| Print/export (niet-zichtbaar resultaat) | MEP quick-add increment (getal update in UI) |
| Reservering aangemaakt (bevestiging + mogelijke email) | Conversie/koppeling toegevoegd |

## Concrete categorisatie

### ✅ HOUDEN (~45 toasts)

- **Reserveringen**: "Reservering aangemaakt — tafel toegewezen · Bevestiging verstuurd", "Walk-in geregistreerd", "Status gewijzigd naar …"
- **Bestelling extern**: "Bestelling verzonden — E-mail verstuurd naar …", "Aanvraag verstuurd"
- **Interne bestellingen status**: "Bestelling geaccepteerd/verzonden/ontvangen/geannuleerd"
- **Destructief**: "Leverancier verwijderd", "Gerecht gearchiveerd", "Ingrediënt gearchiveerd", "Shift gearchiveerd", "Area gearchiveerd met N tafel(s)", "Bestelling verwijderd", "Ticket gearchiveerd"
- **Wizard completion**: `Halffabricaat "naam" aangemaakt!`, `Gerecht "naam" aangemaakt!`, `Ingrediënt "naam" aangemaakt!`
- **Bulk/import**: "Import voltooid — N geïmporteerd, N bijgewerkt", "Bulk uitzonderingen aangemaakt", "Prijzen bijgewerkt voor N ingrediënten"
- **Print/export**: "N labels geprint", "Export gedownload", "Testprint verstuurd"
- **HR/onboarding**: "Kandidaat aangenomen!", "Kandidaat afgewezen"
- **Betaling**: "Terugbetaling aangemaakt"
- **Campagne**: "Campagne wordt verzonden!", "Campagne ingepland!"
- **Waste** (kok verwacht feedback na scan): "Waste geregistreerd — 2kg Zalm (€14.50)"
- **Extern koppelen**: "WhatsApp verbonden", "Account ontkoppeld"
- **Dag starten**: "Dag gestart — checklists aangemaakt"
- **Bericht verstuurd**: "Bericht verstuurd"

### ❌ VERWIJDEREN (~85 toasts)

**Inline CRUD in zichtbare lijst:**
- "Component toegevoegd/verwijderd", "Ingrediënt toegevoegd/verwijderd", "Methode toegevoegd/verwijderd"
- "Regel toegevoegd/verwijderd", "Artikel toegevoegd/verwijderd"
- "Conversie toegevoegd/verwijderd", "Ingrediënt gekoppeld"
- "Taak aangemaakt", "Taak bijgewerkt"
- "Fase toegevoegd/verwijderd"
- "Tafel aangemaakt", "N tafel(s) aangemaakt"
- "Tafelgroep aangemaakt"
- "Medewerker aangemaakt", "Medewerker bijgewerkt"

**Settings/inline save:**
- "Opgeslagen" (diverse settings tabs)
- "Keuken instellingen opgeslagen", "Pacing instellingen opgeslagen", "Shift tijden opgeslagen"
- "Review platforms opgeslagen", "Wachtlijst-instellingen opgeslagen"
- "Leverancier bijgewerkt", "Bestelling bijgewerkt", "Ticket bijgewerkt"
- "Ingrediënt bijgewerkt", "Area bijgewerkt", "Groep bijgewerkt"
- "Beleid aangemaakt/bijgewerkt"
- "Verantwoordelijke bijgewerkt"
- "Printer opgeslagen"
- "Bestelregels opgeslagen", "Concept opgeslagen"
- "Template opgeslagen", "Evaluatie opgeslagen"

**Favorieten/toggles:**
- "Favoriet opgeslagen/verwijderd"
- "Flow geactiveerd/gepauzeerd"
- "Featured verwijderd" / "Review gemarkeerd als featured"

**MEP quick-add:**
- "naam — verhoogd naar N×" (4 plekken)

**Content/marketing inline:**
- "Serie aangemaakt/bijgewerkt/verwijderd"
- "Doelgroep aangemaakt/bijgewerkt/verwijderd"
- "Popup bijgewerkt", "Popup aangemaakt"
- "Reactie opgeslagen", "Antwoord opgeslagen"
- "Content gegenereerd", "AI-suggestie gegenereerd"
- "Email aangepast door AI"
- "Bericht verwijderd" (content post)

**Knowledge base:**
- "Toegevoegd", "Opgeslagen", "Verwijderd" (entry)

**Checklist/temperatuur:**
- "Checklist afgerond", "Temperatuur geregistreerd", "Standaard templates aangemaakt"

**Kleine entity CRUD:**
- "Ticket aangemaakt", "Ticket gedupliceerd"
- "Bestellijst aangemaakt"
- "Shift aangemaakt/bijgewerkt", "Uitzondering aangemaakt/bijgewerkt/verwijderd"
- Tafel/tafelgroep hersteld, Area aangemaakt/hersteld
- Beleid hersteld, Ticket hersteld als draft
- "Tip verwijderd"

**Overig:**
- Logo/sfeerbeeld geüpload/verwijderd (alle varianten — UI toont preview)
- "Gekopieerd — plak in Google Maps"
- "Halffabricaat aangemaakt" (inline quick-create variant, niet wizard)
- "Ingrediënt aangemaakt" (inline quick-create)
- "Prep aangemaakt en op MEP gezet!"
- Pacing override opgeslagen/gereset
- Optie verlengd, Ingecheckt, Wachtlijst-entry geannuleerd
- Tafel gewijzigd / Tafeltoewijzing verwijderd

### ⚠️ TWIJFEL → Per case bekijken

- "Taak afgerond — Voorraad automatisch bijgewerkt" → **houden** (side-effect: voorraad mutatie)
- "Factuur geüpload — vul de regels in" → **houden** (instructie voor volgende stap)
- "Factuur afgewezen" → **houden** (destructief)
- "Reactie geplaatst op Google" → **houden** (extern side-effect)
- "Bericht gepubliceerd" → **houden** (extern side-effect)
- "Pipeline hersteld naar standaardinstelling" → **houden** (destructief bulk reset)
- "Kostprijs bijgewerkt" / "Voorraad gecorrigeerd" → **houden** (financieel significant)

## Aanpak

Eén sweep door ~50 bestanden. Per bestand: verwijder de `nestoToast.success(...)` call uit de `onSuccess` callback. **Alle `nestoToast.error` calls blijven ongewijzigd.**

Geen schema-wijzigingen, geen nieuwe bestanden.

## Geschatte impact

- ~85 `nestoToast.success()` calls verwijderd
- ~45 behouden (significante acties)
- 0 error toasts gewijzigd
- ~50 bestanden aangepast

