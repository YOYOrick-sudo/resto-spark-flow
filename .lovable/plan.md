

## Plan: Wit Shouf-logo voor dark mode

### Context
De `NestoLogo` component (`src/components/polar/NestoLogo.tsx`) gebruikt nu drie PNG-assets: `shouf-icon.png`, `shouf-lockup.png`, `shouf-wordmark.png`. Deze zijn in de standaard (donkere) brand-kleur en blijven hetzelfde in light én dark mode — in dark mode is dat te donker / niet leesbaar.

De gebruiker wil een wit-variant voor dark mode, maar niet spierwit (#FFFFFF) — eerder een zachte off-white zodat het minder fel aanvoelt.

### Aanpak

**Optie gekozen: CSS-filter via dark-mode class** (geen nieuwe assets nodig, geen upload-stap, direct werkend)

In plaats van drie nieuwe witte PNG-bestanden te genereren/uploaden, gebruiken we een CSS-filter dat de bestaande donkere logo's omzet naar zacht-wit in dark mode:

```tsx
<img
  src={src}
  alt={alt}
  style={{ height, width: 'auto' }}
  draggable={false}
  className="dark:brightness-0 dark:invert dark:opacity-90"
/>
```

- `dark:brightness-0` → maakt logo volledig zwart (silhouet)
- `dark:invert` → keert om naar wit
- `dark:opacity-90` → zacht-wit (niet spierwit), ongeveer #E6E6E6-effect

Dit werkt voor alle drie de varianten (icon / wordmark / lockup) zonder asset-werk, en de gebruiker kan het percentage later finetunen (80, 85, 90, 95).

### Bestand

| Bestand | Wijziging |
|---|---|
| `src/components/polar/NestoLogo.tsx` | `className` op `<img>` met `dark:brightness-0 dark:invert dark:opacity-90` |

### Buiten scope

- Aparte witte PNG-assets aanmaken/uploaden (kan later als de filter-aanpak niet scherp genoeg is)
- Logo-kleur configureerbaar via prop (overkill voor één use-case)

### Notitie
Als de filter-aanpak niet het gewenste resultaat geeft (bijv. door verloop in het logo of te zachte randen), is de fallback om witte PNG-versies te uploaden en via een `useTheme()` hook de juiste src te kiezen. Beginnen met de filter-aanpak omdat dat 0 assets en 0 hooks vereist.

