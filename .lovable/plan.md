

# Takenlijst omzetten naar Enterprise Inline Table

## Probleem
De huidige takenlijst gebruikt losse kaarten met inputvelden en dropdowns per taak. Dit ziet er rommelig uit en past niet bij de enterprise-esthetiek van de rest van de app.

## Nieuw ontwerp: Inline Data Table

De taken worden weergegeven als rijen in een compacte tabel, conform het Inline Data Tables pattern (INLINE_DATA_TABLES.md):

```text
TAKEN  2

Taak                              Uitvoering                        
─────────────────────────────────────────────────────────────────────
Aanvullende vragen sturen         ✦ Assistent [ON]  ✉ Automatisch  ⓘ     
Antwoorden beoordelen             Manager ▼                          🗑
                                                                     
[+ Taak toevoegen]
```

## Concrete wijzigingen in TaskTemplateList.tsx

### Header row
- Twee kolommen: "Taak" en "Uitvoering"
- Enterprise styling: `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
- Floating header (geen achtergrond), `border-b border-border/50`

### Data rows
- Eenregelig per taak in een grid: `grid-cols-[1fr_auto_32px]`
- Kolom 1: taaknaam als inline-editable input (geen border, border alleen on focus)
- Kolom 2: uitvoering -- ofwel Assistent toggle + status, ofwel rol-dropdown
- Kolom 3: delete icon (hover-reveal)
- Row styling: `hover:bg-accent/40 transition-colors duration-150`, `divide-y divide-border/50`
- Geen borders rondom individuele taken, geen card-per-task

### Input styling
- Taaknaam input wordt een "ghost input": transparante achtergrond, border alleen bij focus
- `bg-transparent border-transparent focus:border-border focus:bg-card`

### Assistent kolom
- Automatiseerbaar + AAN: `Sparkles` + Switch + `Mail` icoon + "Automatisch" + info tooltip
- Automatiseerbaar + UIT: `Sparkles` + Switch + rol-dropdown
- Niet automatiseerbaar: rol-dropdown

## Technische details

### Bestand
`src/components/onboarding/settings/TaskTemplateList.tsx` -- volledige herstructurering van de render.

### Geen andere bestanden wijzigen
PhaseConfigCard.tsx en de database blijven ongewijzigd.
