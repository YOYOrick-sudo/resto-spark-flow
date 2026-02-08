

## Logo terugzetten naar tekst

De `img`-tag met het logo-wordmark wordt verwijderd en vervangen door de originele tekst-variant "nesto" in de sidebar header.

### Wijzigingen

**Bestand: `src/components/layout/NestoSidebar.tsx`**
- De `import logoWordmark` regel verwijderen
- Het `<img>` element vervangen door een `<span>` met de tekst "nesto" in bold styling, zoals het eerder was

### Technisch detail

De tekst-versie wordt:
```tsx
<span
  className="text-2xl font-bold text-foreground"
  style={{
    fontFamily: 'Inter, sans-serif',
    height: '40px',
    display: 'flex',
    alignItems: 'center'
  }}
>
  nesto
</span>
```

Optioneel kan het bestand `src/assets/logo-wordmark.png` ook verwijderd worden als het nergens anders gebruikt wordt.

