

## Density toggle verplaatsen naar de footer bar

De density toggle blijft bestaan maar verhuist van de toolbar naar de footer bar (onderaan), waar het minder prominent is en niet concurreert met de view toggles.

---

### Visuele aanpak

De toggle komt rechts in de footer bar, naast de "Open/Gesloten" status. Geen achtergrondkleur of border -- gewoon twee subtiele iconen waarvan de actieve iets donkerder is:

- **Actief**: `text-foreground`
- **Inactief**: `text-muted-foreground/50 hover:text-muted-foreground`
- Geen `bg-secondary`, geen `rounded-lg p-1` container -- puur twee losse iconen met een kleine gap

Dit maakt het een "utility control" in plaats van een primaire actie.

---

### Wijzigingen per bestand

#### `src/pages/Reserveringen.tsx`

- Verwijder `<DensityToggle ... />` uit de toolbar (regel 111)
- Geef `density` en `onDensityChange` door als props aan `ReservationFooter`

#### `src/components/reserveringen/ReservationFooter.tsx`

- Accepteer `density` en `onDensityChange` props
- Render de twee density iconen (Rows4 / Rows3) rechts naast de Open/Gesloten status, gescheiden door een divider
- Styling: kleine iconen (`h-3.5 w-3.5`), geen container-achtergrond, alleen kleurverschil actief/inactief

#### `src/components/reserveringen/DensityToggle.tsx`

- Blijft bestaan voor de `useDensity` hook en het `DensityType` type
- De visuele component zelf wordt niet meer los gebruikt (de iconen worden inline in de footer gerenderd), maar het bestand kan behouden blijven voor de hook

---

### Footer layout (nieuw)

```
[Notities] | [63 gasten vandaag | 12 wachtend] | [Open ●] | [⊞ ≡]
                                                              ↑ density icons
```

### Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/pages/Reserveringen.tsx` | Toggle uit toolbar, density props naar footer |
| `src/components/reserveringen/ReservationFooter.tsx` | Density iconen toevoegen rechts |
| `src/components/reserveringen/DensityToggle.tsx` | Behouden (hook + type) |

