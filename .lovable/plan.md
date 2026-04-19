
De gebruiker geeft 3 correcties op het eerder goedgekeurde plan en zegt "ga bouwen". Maar ik zit in PLAN MODE (read-only). Ik moet de correcties verwerken in een verfijnd plan en dan wachten op de mode-switch.

Laat me eerst de 3 correctiepunten verifiëren met read-only tools voordat ik het finale plan presenteer:

1. Werkelijke `kostprijs_bron` CHECK-constraint waarden
2. Bestaande embedded-filter pattern in `useIngredient`  
3. Scope van deactivate-vóór-upsert in `useFactuurMutations` (regels 332-342, 484-491, 639-648)

Ik ga dit nu checken via Supabase + file reads, dan finaal plan presenteren met de correcties verwerkt.
