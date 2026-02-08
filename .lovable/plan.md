
## Fix: Sidebar fixed maken

### Probleem

De desktop sidebar staat in de normale document flow en scrollt mee met de pagina content.

### Oplossing

Twee kleine wijzigingen in `src/components/layout/AppLayout.tsx`:

**1. Desktop sidebar `<aside>` (regel 17) — maak sticky**

Van:
```tsx
<aside className="hidden lg:flex w-60 flex-shrink-0">
```
Naar:
```tsx
<aside className="hidden lg:flex w-60 flex-shrink-0 sticky top-0 h-screen">
```

Dit zorgt ervoor dat de sidebar vast blijft terwijl de main content scrollt. De `h-screen` geeft de sidebar de volledige viewport hoogte, en `sticky top-0` houdt hem op zijn plek.

**2. Main content container (regel 15) — overflow beperken**

De parent `div` krijgt `h-screen overflow-hidden` zodat de scroll context correct gescheiden wordt:

Van:
```tsx
<div ref={ref} className="min-h-screen flex w-full bg-card">
```
Naar:
```tsx
<div ref={ref} className="h-screen flex w-full bg-card overflow-hidden">
```

De NestoSidebar zelf heeft al de juiste flex-col structuur met `flex-1 overflow-y-auto` op de nav sectie.

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/layout/AppLayout.tsx` | 2 regels: parent `h-screen overflow-hidden`, aside `sticky top-0 h-screen` |
