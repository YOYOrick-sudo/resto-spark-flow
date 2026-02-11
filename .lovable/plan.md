

# Assistent-indicator: Icon-only patroon

## Huidige situatie

In de collapsed header van elke fase staat nu:
- Sparkles icoon (teal) + tekst badge "Assistent"
- Alleen zichtbaar als assistent aan staat
- Als assistent uit staat: geen indicator

## Voorstel: Icon-only met kleur-status

Vervang de icoon + badge combo door **alleen het Sparkles icoon**, altijd zichtbaar, met kleur als status-indicator:

| Status | Icoon kleur | Tooltip |
|--------|------------|---------|
| Assistent aan | `text-primary` (teal) | "Assistent actief voor deze fase" |
| Assistent uit | `text-muted-foreground/40` (lichtgrijs) | "Assistent niet actief" |

Dit is consistent met enterprise patronen (Linear, Notion) waar icon-only indicators met kleurverschil worden gebruikt voor compacte status-weergave.

## Wijzigingen

### `PhaseConfigCard.tsx` (collapsed header)

- Verwijder de `NestoBadge` "Assistent" tekst
- Toon het Sparkles icoon **altijd** (niet alleen als enabled)
- Kleur: `text-primary` als `assistantEnabled || hasAutomatedTasks`, anders `text-muted-foreground/40`
- Tooltip blijft, met aangepaste tekst per status
- Het `(phase as any).is_custom` badge "Aangepast" blijft ongewijzigd

### Technisch

Regel 69-83 wordt:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Sparkles className={cn(
        "h-3.5 w-3.5 flex-shrink-0 transition-colors duration-150",
        (assistantEnabled || hasAutomatedTasks)
          ? "text-primary"
          : "text-muted-foreground/40"
      )} />
    </TooltipTrigger>
    <TooltipContent side="top">
      <p>{(assistantEnabled || hasAutomatedTasks)
        ? "Assistent actief voor deze fase"
        : "Assistent niet actief"
      }</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

Vereist toevoegen van `cn` import uit `@/lib/utils`.

