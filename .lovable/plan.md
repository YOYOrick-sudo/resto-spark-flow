

# Fix: Pulse indicator en Eindtijd-toggle in Widget Settings

## Probleem 1: Pulse indicator werkt niet

De "Pulse indicator" switch in de knopconfiguratie gebruikt een lokale `useState(false)` die:
- **Niet wordt opgeslagen** in de database (er is geen kolom voor in `widget_settings`)
- **Reset bij elke pageload** naar `false`
- **Niet wordt doorgegeven** aan de live preview (alleen aan de embed code snippet)

### Oplossing

1. Kolom `widget_button_pulse` toevoegen aan de `widget_settings` tabel (boolean, default false)
2. De lokale state `buttonPulse` koppelen aan de database via `updateField`, net als alle andere settings
3. De pulse-waarde doorgeven aan `WidgetLivePreview` zodat de testpagina het effect ook toont

### Wijzigingen

**Database migratie:**
```sql
ALTER TABLE widget_settings ADD COLUMN widget_button_pulse boolean NOT NULL DEFAULT false;
```

**`src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`:**
- `buttonPulse` state verwijderen (regel 72)
- `widget_button_pulse` toevoegen aan `LocalSettings` interface
- Switch koppelen aan `updateField('widget_button_pulse', v)`
- Doorgeven aan `WidgetLivePreview` als prop

**`src/components/settings/widget/WidgetLivePreview.tsx`:**
- `pulse` prop toevoegen
- Doorgeven als query parameter in de preview URL

**`src/hooks/useWidgetSettings.ts`:**
- `widget_button_pulse` toevoegen aan het `WidgetSettings` interface

---

## Probleem 2: Eindtijd hoort bij de shift, niet bij de widget

De `show_end_time` toggle staat nu in Widget Settings (Card "Weergave"), maar:
- `show_end_time` bestaat al als kolom in de `shift_tickets` tabel
- Het is logischer om dit per shift-ticket te configureren (sommige tickets tonen eindtijd, andere niet)
- De widget-level setting is redundant

### Oplossing

De "Eindtijd tonen" toggle verwijderen uit de Widget Settings pagina. De instelling zit al op het juiste niveau: per shift-ticket in de Shift Wizard.

### Wijzigingen

**`src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`:**
- De "Eindtijd tonen" switch-blok verwijderen (regels 268-274)
- `show_end_time` verwijderen uit `LocalSettings` interface en `useEffect` sync

Geen database wijziging nodig — de kolom in `widget_settings` kan blijven bestaan voor backwards compatibility, maar de UI stuurt er niet meer op.

---

## Samenvatting bestanden

| Bestand | Wijziging |
|---------|-----------|
| Database migratie | `widget_button_pulse` kolom toevoegen |
| `SettingsReserveringenWidget.tsx` | Pulse koppelen aan DB; Eindtijd toggle verwijderen |
| `WidgetLivePreview.tsx` | `pulse` prop + query param toevoegen |
| `useWidgetSettings.ts` | `widget_button_pulse` aan interface toevoegen |

