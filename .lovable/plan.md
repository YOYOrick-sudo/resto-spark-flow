

# Coherent layout systeem: geen fullBleed, PageHeader overal

## Probleem

1. **Reserveringen** is de enige pagina met een `fullBleed` uitzondering -- dit breekt de systeemeenheid. Alle andere pagina's krijgen de standaard AppLayout padding.
2. **Reserveringen** en **Dashboard** missen een `PageHeader` terwijl alle andere modules er een hebben.
3. Het `fullBleed` concept introduceert een tweede layoutvariant die onderhoudslast verhoogt.

## Aanpak

Het `fullBleed` concept wordt verwijderd. Alle pagina's gebruiken dezelfde AppLayout padding. Pagina's die het scherm vullen (Reserveringen) rekenen hun interne spacing relatief aan de content area, niet aan hun eigen padding.

## Wijzigingen

### 1. Verwijder fullBleed concept

**App.tsx** -- De aparte `<AppShell fullBleed />` route-groep voor Reserveringen wordt verwijderd. De Reserveringen-route verhuist naar de standaard route-groep.

**AppLayout.tsx** -- De `fullBleed` prop wordt verwijderd. Er is nog maar een padding-variant.

**AppShell.tsx** -- De `fullBleed` prop wordt verwijderd.

### 2. Reserveringen: voeg PageHeader toe, verwijder eigen padding

**Reserveringen.tsx**:
- Voeg een `PageHeader` toe met titel "Reserveringen" en de "Nieuwe Reservering" button als action
- Verwijder de interne `p-4` padding op header en content area (AppLayout geeft al padding)
- De toolbar (ViewToggle, DateNavigator, SearchBar) en filters komen direct onder de PageHeader
- De content card en footer blijven ongewijzigd

### 3. Dashboard: voeg PageHeader toe

**Dashboard.tsx**:
- Vervang de custom greeting-header door een `PageHeader` met de begroeting als titel en de datum als subtitle
- Het urgente-signalen-alert en de grid blijven ongewijzigd

## Technisch overzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/App.tsx` | Reserveringen-route verplaatsen naar standaard route-groep, fullBleed route-groep verwijderen |
| `src/components/layout/AppLayout.tsx` | `fullBleed` prop verwijderen, altijd standaard padding |
| `src/components/layout/AppShell.tsx` | `fullBleed` prop verwijderen |
| `src/pages/Reserveringen.tsx` | `PageHeader` toevoegen, eigen `p-4` padding verwijderen |
| `src/pages/Dashboard.tsx` | Custom header vervangen door `PageHeader` |

Geen andere bestanden worden aangepast.

