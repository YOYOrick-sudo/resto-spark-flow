import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export interface EmailTemplate {
  id: string;
  location_id: string;
  template_key: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const TEMPLATE_KEYS = [
  'confirmation',
  'waitlist_confirmation',
  'waitlist_invite',
  'cancellation',
  'reminder_24h',
  'reminder_3h',
  'reconfirm',
] as const;

export type TemplateKey = typeof TEMPLATE_KEYS[number];

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  confirmation: 'Bevestiging',
  waitlist_confirmation: 'Wachtlijst bevestiging',
  waitlist_invite: 'Wachtlijst uitnodiging',
  cancellation: 'Annulering',
  reminder_24h: 'Herinnering (24u)',
  reminder_3h: 'Herinnering (3u)',
  reconfirm: 'Herbevestiging',
};

export const DEFAULT_TEMPLATES: Record<TemplateKey, { subject: string; body: string }> = {
  confirmation: {
    subject: 'Bevestiging: {restaurant} op {datum} om {tijd}',
    body: 'Hoi {voornaam},\n\nJe reservering is bevestigd!\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nBeheer je reservering: {beheerlink}\n\nTot dan!\n{restaurant}',
  },
  waitlist_confirmation: {
    subject: 'Je staat op de wachtlijst bij {restaurant}',
    body: 'Hoi {voornaam},\n\nJe staat op de wachtlijst voor {datum}. We laten het je weten zodra er een plek vrijkomt!\n\n{restaurant}',
  },
  waitlist_invite: {
    subject: 'Er is een plek vrijgekomen bij {restaurant}!',
    body: 'Hoi {voornaam},\n\nGoed nieuws — er is een plek vrijgekomen!\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nReserveer snel via de link in de email.',
  },
  cancellation: {
    subject: 'Annulering: {restaurant} op {datum}',
    body: 'Hoi {voornaam},\n\nJe reservering op {datum} om {tijd} is geannuleerd.\n\nWe hopen je snel weer te zien!\n\n{restaurant}',
  },
  reminder_24h: {
    subject: 'Herinnering: je reservering morgen bij {restaurant}',
    body: 'Hoi {voornaam},\n\nDit is een herinnering voor je reservering morgen.\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nWe kijken ernaar uit je te verwelkomen!\n\n{restaurant}',
  },
  reminder_3h: {
    subject: 'Vanavond: je reservering bij {restaurant} om {tijd}',
    body: 'Hoi {voornaam},\n\nNog even ter herinnering — je reservering is vandaag!\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nTot straks!\n\n{restaurant}',
  },
  reconfirm: {
    subject: 'Bevestig je reservering bij {restaurant}',
    body: 'Hoi {voornaam},\n\nWil je je reservering even bevestigen?\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nKlik op de knop om te bevestigen.',
  },
};

export const MERGE_FIELDS = [
  { key: '{voornaam}', label: 'Voornaam' },
  { key: '{achternaam}', label: 'Achternaam' },
  { key: '{datum}', label: 'Datum' },
  { key: '{tijd}', label: 'Tijd' },
  { key: '{gasten}', label: 'Aantal gasten' },
  { key: '{restaurant}', label: 'Restaurantnaam' },
  { key: '{beheerlink}', label: 'Beheerlink' },
  { key: '{ticket}', label: 'Ticketnaam' },
];

export function useReservationEmailTemplates() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['reservation-email-templates', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('reservation_email_templates')
        .select('*')
        .eq('location_id', locationId)
        .order('template_key');
      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
    enabled: !!locationId,
  });
}

export function useUpsertEmailTemplate() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (data: { template_key: string; subject: string; body: string; is_active?: boolean }) => {
      if (!locationId) throw new Error('No location');
      const { error } = await supabase
        .from('reservation_email_templates')
        .upsert({
          location_id: locationId,
          template_key: data.template_key,
          subject: data.subject,
          body: data.body,
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'location_id,template_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation-email-templates', locationId] });
    },
    onError: (err: Error) => {
      nestoToast.error(`Opslaan mislukt: ${err.message}`);
    },
  });
}
