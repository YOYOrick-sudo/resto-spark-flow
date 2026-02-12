
# Communicatie-pagina — Enterprise Polish

## 4 verbeteringen in 1 bestand

### 1. Error toast bij mislukt opslaan
De `debouncedSave` krijgt een `onError` handler die `nestoToast.error()` aanroept zodat de gebruiker feedback krijgt bij netwerkfouten.

### 2. Reply-to email validatie
- Email regex check: `!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)`
- Lege waarde is toegestaan (optioneel veld)
- Rode foutmelding onder het veld bij ongeldig formaat
- `updateField` slaat niet op als het reply-to veld ongeldig is

### 3. TitleHelp bij paginatitel
Import `TitleHelp` en toon naast de "Communicatie" titel in de `SettingsDetailLayout`. Uitleg:
- Deze instellingen gelden voor alle uitgaande communicatie (onboarding, reserveringen, etc.)
- Het afzenderdomein (@nesto.app) wordt op platform-niveau beheerd

### 4. Kanalen beschrijvingen
Onder elke kanaalnaam een muted beschrijving:
- Email: "Automatische berichten, templates en notificaties"
- WhatsApp: "Directe berichten via WhatsApp Business"

## Technisch

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/settings/SettingsCommunicatie.tsx` | Alle 4 wijzigingen: imports (TitleHelp, nestoToast), email validatie helper, onError handler, TitleHelp in titel, inline error, kanaal descriptions |

Geen nieuwe bestanden, geen database wijzigingen.
