import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Mail, AlertTriangle, Calendar, User as UserIcon } from 'lucide-react';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface GuestProfileProps {
  customerId: string | null;
}

export function GuestProfile({ customerId }: GuestProfileProps) {
  const { data: customer } = useQuery({
    queryKey: ['customer-profile', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!customerId,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ['customer-reservations-inbox', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('reservations')
        .select('id, reservation_date, start_time, party_size, status')
        .eq('customer_id', customerId)
        .order('reservation_date', { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
    },
    enabled: !!customerId,
  });

  if (!customerId) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4 text-center">
        Selecteer een gesprek om het gastprofiel te bekijken
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const dietaryPrefs = customer.dietary_preferences as any;
  const allergies = dietaryPrefs?.allergies || [];
  const isVegetarian = dietaryPrefs?.vegetarian;
  const isVegan = dietaryPrefs?.vegan;
  const dietItems = [
    ...(isVegan ? ['Vegan'] : []),
    ...(isVegetarian ? ['Vegetarisch'] : []),
    ...allergies,
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* Name */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {customer.first_name} {customer.last_name}
        </h3>
        <div className="mt-2 space-y-1.5">
          {customer.phone_number && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{customer.phone_number}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5" />
            <span>{customer.total_visits} bezoeken</span>
          </div>
        </div>
      </div>

      {/* Dietary */}
      {dietItems.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-medium text-foreground">Dieet & allergieën</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {dietItems.map((item) => (
              <NestoBadge key={item} variant="warning" size="sm">{item}</NestoBadge>
            ))}
          </div>
        </div>
      )}

      {/* Reservations */}
      {reservations.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-foreground mb-2">Reserveringen</h4>
          <div className="space-y-1.5">
            {reservations.map((res) => (
              <div key={res.id} className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  {format(new Date(res.date), 'd MMM', { locale: nl })} {res.time?.slice(0, 5)} ({res.party_size}p)
                </span>
                <NestoBadge
                  variant={res.status === 'confirmed' ? 'primary' : 'default'}
                  size="sm"
                >
                  {res.status === 'confirmed' ? 'Bevestigd' :
                   res.status === 'cancelled' ? 'Geannuleerd' :
                   res.status === 'completed' ? 'Afgerond' :
                   res.status}
                </NestoBadge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {customer.notes && (
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1">Notities</h4>
          <p className="text-xs text-muted-foreground">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}
