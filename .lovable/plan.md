

# "Knoopstijl" optie verwijderen uit Widget Settings

## Wat verandert

Het hele "Knoopstijl" blok (Afgerond / Rechthoekig selector) wordt verwijderd uit de Branding card op de Widget Settings pagina. De widget gebruikt voortaan altijd de afgeronde stijl (rounded-2xl, zoals we net hebben ingesteld).

## Technisch

**Bestand:** `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx`

1. Verwijder regels 296-326 (het volledige "Button style selector" blok inclusief label, knoppen en beschrijving)
2. Verwijder `widget_button_style` uit de `LocalState` interface (regel 41)
3. Verwijder `widget_button_style: 'rounded'` uit de initial state (regel 87)
4. Verwijder de toewijzing in het `useEffect` blok (regel 105)
5. Update de card description van "Kleuren, logo en knoopstijl van de widget." naar "Kleuren en logo van de widget." (regel 280)

De database-kolom `widget_button_style` blijft bestaan maar wordt simpelweg niet meer aangeboden in de UI. Dit is veilig -- de kolom heeft een default waarde.

