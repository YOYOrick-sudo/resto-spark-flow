

# Uitvoering: van rollen naar echte teamleden

## Wat verandert

De `RoleSelect` dropdown toont nu generieke rollen ("Eigenaar", "Manager", "Service", "Keuken"). Dit moet vervangen worden door een dropdown met **echte teamleden** van de huidige locatie -- naam + rol als context.

## Datamodel

- **Veld `assigned_role`** wordt **`assigned_to`** (of we hergebruiken hetzelfde veld) met een `user_id` als waarde in plaats van een rol-string.
- Geen database-migratie nodig: `task_templates` is een JSONB-array op `onboarding_phases`. We veranderen alleen de waarde die erin wordt opgeslagen (van `"manager"` naar een UUID).
- Bestaande waarden (`"manager"`, `"owner"`, etc.) worden backward-compatible behandeld: als de waarde geen UUID is, tonen we "Niet toegewezen" en laten we de gebruiker opnieuw kiezen.

## UI-wijziging

### `RoleSelect` wordt `TeamMemberSelect`

- Haalt teamleden op via de bestaande `useLocationTeamMembers()` hook
- Toont per optie: **naam** (of email als naam ontbreekt) + rol-badge als context
- Trigger toont de geselecteerde naam in plaats van een rol
- Breedte gaat van `w-[120px]` naar `w-[160px]` om namen te accommoderen
- Placeholder: "Selecteer persoon"

### Props-wijziging

`TaskTemplateList` krijgt geen extra props -- de component importeert `useLocationTeamMembers` zelf.

## Technische stappen

| # | Bestand | Wat |
|---|---------|-----|
| 1 | `TaskTemplateList.tsx` | Vervang `RoleSelect` component door `TeamMemberSelect` die `useLocationTeamMembers()` gebruikt |
| 2 | `TaskTemplateList.tsx` | Update het veld van `assigned_role` naar `assigned_to` in de `TaskTemplate` interface |
| 3 | `TaskTemplateList.tsx` | `addTask()` zet `assigned_to: null` in plaats van `assigned_role: 'manager'` |
| 4 | `PhaseConfigCard.tsx` | Geen wijzigingen nodig (delegeert alles aan TaskTemplateList) |

## Backward compatibility

- Bestaande taken met `assigned_role: "manager"` matchen niet met een UUID. De select toont dan geen waarde (placeholder). Bij volgende keuze wordt het correct opgeslagen.
- Geen migratie nodig -- het is een JSONB-veld dat vrije waarden accepteert.

