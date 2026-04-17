
Read-only mode kan geen UPDATE draaien. Plan is simpel: in default-mode de UPDATE uitvoeren via insert-tool, daarna SELECT ter verificatie.

## Stappen
1. `UPDATE locations SET assistent_min_waarde_verlopen = 5, haccp_freeze_tijd = '03:00:00' WHERE slug = 'pura-vida-daily';`
2. `SELECT slug, assistent_min_waarde_verlopen, haccp_freeze_tijd FROM locations WHERE slug = 'pura-vida-daily';`
3. Output van SELECT terugkoppelen — verwacht: `5` en `03:00:00`.

Geen code-wijzigingen, alleen data-reset.
