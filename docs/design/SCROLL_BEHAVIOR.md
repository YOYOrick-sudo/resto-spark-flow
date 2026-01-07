# Scroll Behavior

## Globale Instellingen

De applicatie gebruikt `scroll-behavior: smooth` voor vloeiende scroll animaties.

### CSS Configuratie (index.css)

```css
html {
  scroll-behavior: smooth;
}

* {
  -webkit-overflow-scrolling: touch; /* iOS momentum */
}
```

## Scroll Containers

| Container | Locatie | Gedrag |
|-----------|---------|--------|
| Main content | `AppLayout.tsx` | `overflow-auto scroll-smooth` |
| NestoSidebar | `NestoSidebar.tsx` | Vast, geen scroll |
| Settings sidebar | `SettingsPageLayout.tsx` | `sticky top-0 self-start` |

## Sticky Sidebar Pattern

Settings pagina's gebruiken een sticky sidebar:

```tsx
<div className="sticky top-0 self-start">
  {/* Sidebar content */}
</div>
```

Dit zorgt ervoor dat de sidebar vast blijft terwijl de content scrollt.

## Automatische Overerving

Nieuwe pagina's die binnen `AppLayout` worden gerenderd krijgen automatisch:
- Smooth scroll gedrag via de globale CSS
- iOS momentum scrolling
- Correcte overflow handling

## Browser Support

- `scroll-behavior: smooth`: 96%+ (alle moderne browsers)
- `-webkit-overflow-scrolling: touch`: Safari/iOS specifiek
