
# Onboarding Settings — Enterprise Polish

## Status: ✅ Directe wijzigingen afgerond + Communicatie pagina gebouwd

---

## Afgerond

### Directe wijzigingen (punten 1-4, 6)
- ✅ Team tab skeleton fix
- ✅ Blauwe rand verwijderen
- ✅ Assistent vs Rol conditionele logica
- ✅ Expanded fase-view rustiger
- ✅ InfoAlerts vervangen door TitleHelp/FieldHelp

### Cross-module Communicatie (punt 5 gedeeltelijk)
- ✅ `communication_settings` tabel aangemaakt met RLS
- ✅ Data gemigreerd vanuit `onboarding_settings.email_config`
- ✅ `SettingsCommunicatie` pagina gebouwd (`/instellingen/communicatie`)
- ✅ `useCommunicationSettings` hook (query + upsert mutation)
- ✅ Tab 5 "Email configuratie" verwijderd uit Onboarding
- ✅ Inline hint in EmailTemplatesSection naar Communicatie
- ✅ Sidebar navigatie item `settings-communicatie` toegevoegd
- ✅ Edge function `_shared/email.ts` leest uit `communication_settings`
- ✅ Logo en kleur velden voorbereid met `opacity-40 cursor-default`
- ✅ Footer tekst direct bruikbaar
- ✅ WhatsApp kanaal voorbereid met `opacity-40`

---

## Volgende iteratie

### Email branding rendering
- Logo upload (Storage bucket setup)
- Color picker UI activeren
- `templateRenderer.ts` uitbreiden met HTML wrapper (logo, kleur, footer)

### "Stuur testmail naar mij" knop
- Nieuwe edge function `send-test-email`
- Knop in `EmailTemplateEditor.tsx`
- Cooldown van 2 minuten

### WhatsApp integratie
- WhatsApp kanaal activeren in Communicatie pagina
