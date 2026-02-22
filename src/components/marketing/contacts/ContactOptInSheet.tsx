import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useContactPreferences, useUpdateContactPreference, type MarketingContact } from '@/hooks/useMarketingContacts';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ContactOptInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: MarketingContact | null;
}

const CHANNELS = [
  { key: 'email', label: 'E-mail' },
  { key: 'sms', label: 'SMS' },
];

export function ContactOptInSheet({ open, onOpenChange, contact }: ContactOptInSheetProps) {
  const { data: prefs = [] } = useContactPreferences(contact?.id ?? null);
  const updatePref = useUpdateContactPreference();

  const getChannelPref = (channel: string) => prefs.find(p => p.channel === channel);

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px]">
        <SheetHeader>
          <SheetTitle>{contact.first_name} {contact.last_name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {contact.email && <p>{contact.email}</p>}
          {contact.phone_number && <p>{contact.phone_number}</p>}
        </div>

        <div className="mt-6 space-y-4">
          <h4 className="text-label text-muted-foreground">Marketing voorkeuren</h4>
          {CHANNELS.map(ch => {
            const pref = getChannelPref(ch.key);
            const isOptedIn = pref?.opted_in ?? false;

            return (
              <div key={ch.key} className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <Label className="text-body">{ch.label}</Label>
                  {pref?.consent_source && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bron: {pref.consent_source}
                      {pref.opted_in_at && ` • ${format(new Date(pref.opted_in_at), 'd MMM yyyy', { locale: nl })}`}
                    </p>
                  )}
                </div>
                <Switch
                  checked={isOptedIn}
                  onCheckedChange={(checked) => {
                    updatePref.mutate({
                      customerId: contact.id,
                      channel: ch.key,
                      optedIn: checked,
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
