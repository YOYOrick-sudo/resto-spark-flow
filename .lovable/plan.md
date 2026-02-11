
# Onboarding Settings — Enterprise Polish

Vijf directe verbeteringen (punten 1-4, 6) plus twee features voor de volgende iteratie (5, 7).

---

## Directe wijzigingen (deze ronde)

### 1. Team tab skeleton fix
**Component:** `TeamOwnersSection.tsx`
**Probleem:** `useLocationTeamMembers` heeft `enabled: !!locationId` — als `currentLocation` nog niet geladen is bij mount, blijft de query in loading state.
**Fix:** Voeg een explicit check toe: als `phasesLoading` klaar is maar `teamLoading` nog wacht door ontbrekende `locationId`, toon de tabel met "Niet ingesteld" in plaats van skeleton. Eventueel `isLoading` conditioneel maken op basis van of de query daadwerkelijk `isFetching` is vs. `disabled`.

---

### 2. Blauwe rand verwijderen
**Component:** `PhaseConfigCard.tsx`, regel 58-61
**Huidig:** `(assistantEnabled || hasAutomatedTasks) && "border-l-2 border-l-primary"`
**Fix:** Verwijder de `border-l-2 border-l-primary` conditie volledig. De Sparkles badge naast de fasenaam (regel 76-90) is al voldoende indicator. NestoCard heeft standaard al een subtiele shadow via zijn base styling — geen extra shadow nodig.

---

### 3. Assistent vs Rol — Conditionele logica
**Component:** `TaskTemplateList.tsx`, de taak-rij (regels 59-111)
**Fix:** Row 2 wordt conditioneel:

- **Als `is_automated = true`:** Verberg de rol-dropdown. Toon in plaats daarvan: `Sparkles` icoon + "Assistent" label in `text-primary text-sm`. De toggle blijft rechts.
- **Als `is_automated = false`:** Toon de rol-dropdown (`w-[140px]`). Toggle + "Assistent" label rechts.

De visuele twee states:

```text
Assistent AAN:
+----------------------------------------------+
| Ontvangstbevestiging sturen              [x] |
| * Assistent                    Assistent [on] |
+----------------------------------------------+

Assistent UIT:
+----------------------------------------------+
| CV beoordelen                            [x] |
| Manager v                      Assistent [off]|
+----------------------------------------------+
```

---

### 4. Expanded fase-view — Rustiger
**Component:** `PhaseConfigCard.tsx`, expanded section (regels 127-180)
**Huidige staat:** Al twee groepen met `border-t border-border/40` scheiding. De `bg-secondary/30` container voor de Assistent toggle is al aanwezig.
**Fix:** Minimale aanpassingen:
- Verwijder de `bg-secondary/30 rounded-lg` container rond de Assistent toggle — maak het een platte rij met `py-2` (rustiger, minder visueel gewicht)
- Voeg `space-y-5` toe op de outer container (was `space-y-4`) voor iets meer ademruimte
- De Assistent-rij wordt: `flex items-center justify-between py-2` met Sparkles icoon + label links, toggle rechts — zonder achtergrondkleur

---

### 6. InfoAlerts vervangen door TitleHelp/FieldHelp
**Betreft 3 locaties:**

| Locatie | Huidige InfoAlert | Vervangen door |
|---------|-------------------|----------------|
| `TeamOwnersSection.tsx` regel 164-166 | "Wie ontvangt reminders?" | `TitleHelp` naast de tabel-header titel |
| `ReminderSettingsSection.tsx` regel 145-147 | "Naar wie gaan reminders?" | `TitleHelp` naast de sectie-titel "Automatische herinneringen" |
| `EmailConfigSection.tsx` regel 92-97 | "Platform domein" | `FieldHelp` naast het "Reply-to adres" label |

De `InfoAlert` bovenaan de Team tab (regel 109-112, "Verantwoordelijken ontbreken") blijft behouden — dit is een actionable status-melding, geen uitleg.

---

## Volgende iteratie (niet in deze ronde)

### 5. Email branding (logo, kleur, footer)
- Tab 5 "Email configuratie" wordt "Branding & Afzender"
- Nieuwe velden: logo upload (Supabase Storage), primaire kleur (color picker), footer tekst
- `onboarding_settings.email_config` JSON uitbreiden met `logo_url`, `brand_color`, `footer_text`
- Email rendering in `templateRenderer.ts` uitbreiden met HTML wrapper

### 7. "Stuur testmail naar mij" knop
- Nieuwe edge function `send-test-email` die de gerenderde template + branding stuurt naar de ingelogde user
- Knop in `EmailTemplateEditor.tsx` naast "Preview tonen"
- Cooldown van 2 minuten (client-side timer)

---

## Technische details

### Bestanden die wijzigen (directe ronde)

| Bestand | Wijziging |
|---------|-----------|
| `src/components/onboarding/settings/PhaseConfigCard.tsx` | Verwijder `border-l-2`, rustiger Assistent-rij |
| `src/components/onboarding/settings/TaskTemplateList.tsx` | Conditionele Row 2: rol hidden bij automated, Assistent label bij aan |
| `src/components/onboarding/settings/TeamOwnersSection.tsx` | Skeleton fix, InfoAlert "Wie ontvangt reminders" naar TitleHelp |
| `src/components/onboarding/settings/ReminderSettingsSection.tsx` | InfoAlert naar TitleHelp, verwijder InfoAlert component |
| `src/components/onboarding/settings/EmailConfigSection.tsx` | InfoAlert "Platform domein" naar FieldHelp |

### Geen nieuwe bestanden of dependencies nodig
Alle benodigde componenten (`TitleHelp`, `FieldHelp`, `NestoCard`, `Switch`, etc.) bestaan al.
