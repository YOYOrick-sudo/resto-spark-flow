

# Fix Assistent-toggle + Takenlijst UI verbeteren

## 1. Bug fix: Assistent toggle altijd tonen voor email-taken

### Probleem
De data in de database voor "Ontvangstbevestiging sturen" heeft `is_automated: false` maar GEEN `task_type` veld. De `isAutomatable()` functie herkent deze taak daardoor niet als automatiseerbaar, waardoor de toggle niet verschijnt en je hem niet meer kunt aanzetten.

### Oplossing
Twee dingen:

**A. Database fix** -- Opnieuw migratie draaien die `task_type: 'send_email'` toevoegt aan taken met email-gerelateerde titels. De vorige migratie heeft dit blijkbaar niet correct gedaan.

**B. isAutomatable() robuuster maken** -- De check aanpassen zodat taken met email-gerelateerde titels ALTIJD als automatiseerbaar worden herkend, ongeacht de huidige waarde van `is_automated` of `task_type`:

```
const isAutomatable = (task) => {
  if (AUTOMATABLE_TYPES.includes(task.task_type || '')) return true;
  // Fallback: herken op titel
  const emailKeywords = /bevestiging|email|sturen|herinnering|reminder/i;
  return emailKeywords.test(task.title);
};
```

Dit zorgt ervoor dat de toggle ALTIJD zichtbaar is voor email-taken, ook als `task_type` ontbreekt. Wanneer de gebruiker de toggle aanzet, wordt `is_automated: true` opgeslagen.

---

## 2. Takenlijst UI opschonen -- Enterprise density

### Huidige situatie (screenshot)
- Losse kaarten met inputvelden en dropdowns
- Geen visuele scheiding tussen automatiseerbare en handmatige taken
- Rol-dropdown zonder context
- Onoverzichtelijk bij meerdere taken

### Nieuw ontwerp
Compactere, tabelachtige rijen met inline informatie:

```text
TAKEN  2

+------------------------------------------------------+
| Ontvangstbevestiging sturen                      [x] |
| [Sparkles] Assistent [ON]  ✉ Automatisch verstuurd   |
+------------------------------------------------------+
| CV en motivatie beoordelen                       [x] |
| Toegewezen aan: Manager [v]                          |
+------------------------------------------------------+

[+ Taak toevoegen]
```

Concrete UI-verbeteringen:
- **Compactere rijen**: padding van p-3 naar p-2.5, minder verticale spacing
- **Duidelijker label bij rol**: "Toegewezen aan:" prefix voor de rol-dropdown bij handmatige taken
- **Assistent-status inline**: Sparkles icoon + toggle + status tekst op een lijn
- **Subtielere delete**: trash icon alleen op hover (dit werkt al)
- **Betere visuele scheiding**: lichtere border, geen hover-effect op de card zelf

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/...` | Opnieuw task_type toevoegen aan taken zonder task_type |
| `src/components/onboarding/settings/TaskTemplateList.tsx` | isAutomatable() fix + UI opschoning |

