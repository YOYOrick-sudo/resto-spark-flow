

# Communicatie Architectuur — Voorbereidende Wijzigingen

## Samenvatting

Drie risicoloze wijzigingen die de Communicatie pagina klaarzetten voor Fase 4.14 Messaging en het architectuurdocument vastleggen.

---

## Wijziging 1: Communicatie pagina — tabbed layout

De huidige content wordt gewrapped in NestoTabs, exact hetzelfde patroon als SettingsOnboarding.tsx:

```text
SettingsDetailLayout (al aanwezig, ongewijzigd)
  NestoTabs (nieuw)
    Tab "Huisstijl" (actief) -> bestaande NestoCard content
    Tab "Gastberichten" (disabled) -> EmptyState placeholder
    Tab "WhatsApp" (disabled) -> EmptyState placeholder
  NestoTabContent x3
```

Bewezen patroon — SettingsOnboarding.tsx gebruikt identieke structuur met 4 tabs.

| Bestand | Actie |
|---|---|
| `src/pages/settings/SettingsCommunicatie.tsx` | Edit: voeg NestoTabs + NestoTabContent toe, wrap bestaande content in "Huisstijl" tab |

Wat verandert:
- Import NestoTabs, NestoTabContent, EmptyState
- useState voor activeTab (default: 'huisstijl')
- TABS array met 3 items: huisstijl (enabled), gastberichten (disabled), whatsapp (disabled)
- Bestaande NestoCard wordt NestoTabContent value="huisstijl"
- 2 nieuwe NestoTabContent blokken met EmptyState ("Beschikbaar in een toekomstige update")

Wat NIET verandert:
- SettingsDetailLayout wrapper (titel, breadcrumbs, beschrijving) — identiek
- Alle branding/afzender/kanalen content — identiek
- Hooks, state, validatie logica — identiek
- Route, URL, navigatie — identiek

---

## Wijziging 2: Reserveringen > Notificaties placeholder updaten

Huidige tekst: "Notificatie instellingen komen hier."
Nieuwe tekst: informatieve redirect naar Communicatie > Gastberichten met link-knop.

| Bestand | Actie |
|---|---|
| `src/pages/settings/reserveringen/SettingsReserveringenNotificaties.tsx` | Edit: vervang placeholder NestoCard inhoud met EmptyState + link naar /instellingen/communicatie |

---

## Wijziging 3: Architectuurdocument opslaan

Het volledige Communicatie Architectuur document wordt opgeslagen in de codebase zodat het bij Fase 4.14 direct vindbaar is.

| Bestand | Actie |
|---|---|
| `docs/COMMUNICATION_ARCHITECTURE.md` | Nieuw: het volledige architectuurdocument met doelstructuur, migratieplan, en technische implicaties |

---

## Risico-analyse

| Aspect | Status |
|---|---|
| Database wijzigingen | Geen |
| Route wijzigingen | Geen |
| Breaking changes | Geen — disabled tabs zijn niet klikbaar |
| Patroon consistent | Identiek aan SettingsOnboarding.tsx |
| NestoTabs disabled prop | Al ondersteund (NestoTabs.tsx regel 11) |
| Bestaande content | 100% behouden, alleen gewrapped |

