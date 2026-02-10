

# Roadmap bijwerken: Fase 4.3.C + 4.3.D als COMPLEET

## Wat verandert

Alleen `docs/ROADMAP.md` wordt aangepast:

### 1. HUIDIGE STATUS sectie (regel 22-28)

**Was:**
```
### IN UITVOERING
- Fase 4.3: Shifts + Exceptions
  - 4.3.A Shifts CRUD - COMPLEET
  - 4.3.B Live Preview Panel - COMPLEET
  - 4.3.C Shift Exceptions UI - VOLGENDE
```

**Wordt:**
```
### AFGEROND (toevoegen):
- Fase 4.3.C: Shift Exceptions UI
- Fase 4.3.D: Bulk Exceptions

### IN UITVOERING wordt leeg / verwijst naar 4.4
```

### 2. Fase 4.3.C sectie (regel 361-382)

Alle checkboxes worden aangevinkt en status wordt "COMPLEET". Checklist aanpassen naar wat daadwerkelijk gebouwd is:

- ShiftExceptionsSection met kalender + lijstweergave
- ShiftExceptionModal (create/edit, single date)
- ExceptionCalendar met gekleurde markers
- ExceptionListItem met edit/delete
- Quick actions (Dag sluiten, Aangepaste tijden, Speciaal)
- Type-specifieke kleuren (rood/oranje/paars)
- ConfirmDialog voor verwijderen

### 3. Nieuwe sectie: Fase 4.3.D Bulk Exceptions (COMPLEET)

Toevoegen na 4.3.C:

- BulkExceptionModal met periode/herhaling
- BulkExceptionPreview met conflict-detectie
- bulkExceptionGenerator.ts (weekly, monthly-day, monthly-nth, n-occurrences)
- useBulkCreateShiftExceptions hook (batch processing, skip/replace)
- Limieten: 500 records, 2 jaar bereik

### 4. Volgende stap updaten

"IN UITVOERING" verwijst nu naar Fase 4.4: Tickets + PolicySet Foundation.

## Wat niet verandert

- Geen code wijzigingen
- Geen database migraties
- Geen andere documenten

