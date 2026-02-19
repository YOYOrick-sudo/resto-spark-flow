

# Fix: Widget Logo niet zichtbaar

## Probleem

Het widget logo laadt niet — niet in de boekingswidget en niet in de settings pagina. De browser blokkeert het verzoek met `net::ERR_BLOCKED_BY_ORB`.

**Oorzaak**: De storage bucket `communication-assets` is **privé** (`public: false`). De code gebruikt `getPublicUrl()` om een URL te genereren, maar omdat de bucket niet publiek is, weigert de browser de afbeelding te laden.

Het widget logo moet publiek toegankelijk zijn omdat het getoond wordt op de publieke boekingswidget van gasten — zonder authenticatie.

## Oplossing

1. **Bucket publiek maken** via een SQL migratie:
   ```sql
   UPDATE storage.buckets 
   SET public = true 
   WHERE id = 'communication-assets';
   ```

2. **RLS policies controleren**: Zorgen dat er een policy is die publieke leestoegang geeft op objecten in deze bucket, zodat iedereen de logo's kan bekijken maar alleen geautoriseerde gebruikers kunnen uploaden/verwijderen.

## Wat verandert er voor de gebruiker

- Het widget logo wordt direct zichtbaar in de settings pagina (branding sectie)
- Het logo verschijnt bovenaan de publieke boekingswidget
- Het logo wordt getoond in de splash screen van het widget panel (floating button modus)

## Bestanden

Geen codewijzigingen nodig — alleen een database migratie om de bucket publiek te maken en eventueel ontbrekende RLS policies toe te voegen.
