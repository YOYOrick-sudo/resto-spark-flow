import {
  Minimize2, AlertTriangle, ShieldAlert, Crown, Wheat,
  CreditCard, Clock, CheckCheck, Users, Globe, Phone,
  Search, MessageCircle, Footprints,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation, ReservationChannel } from '@/types/reservation';

interface ReservationBadgesProps {
  reservation: Reservation;
  className?: string;
}

interface BadgeItem {
  key: string;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}

const CHANNEL_ICON_MAP: Record<ReservationChannel, React.ElementType> = {
  widget: Globe,
  operator: () => null, // hidden
  phone: Phone,
  google: Search,
  whatsapp: MessageCircle,
  walk_in: Footprints,
};

export function ReservationBadges({ reservation, className }: ReservationBadgesProps) {
  const badges: BadgeItem[] = [];

  // 1. Squeeze
  if (reservation.is_squeeze) {
    badges.push({ key: 'squeeze', label: 'Squeeze', icon: Minimize2, colorClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' });
  }

  // 2. Hoog risico (>= 50)
  if (reservation.no_show_risk_score !== null && reservation.no_show_risk_score !== undefined && reservation.no_show_risk_score >= 50) {
    badges.push({ key: 'high_risk', label: 'Hoog risico', icon: ShieldAlert, colorClass: 'bg-destructive/10 text-destructive' });
  }
  // 3. Verhoogd risico (30-49)
  else if (reservation.no_show_risk_score !== null && reservation.no_show_risk_score !== undefined && reservation.no_show_risk_score >= 30) {
    badges.push({ key: 'elevated_risk', label: 'Verhoogd risico', icon: AlertTriangle, colorClass: 'bg-warning/10 text-warning' });
  }

  // 4. VIP
  if (reservation.customer && Array.isArray(reservation.customer.tags) && (reservation.customer.tags as string[]).includes('vip')) {
    badges.push({ key: 'vip', label: 'VIP', icon: Crown, colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' });
  }

  // 5. Allergieën
  if (reservation.badges?.allergies) {
    badges.push({ key: 'allergies', label: 'Allergieën', icon: Wheat, colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' });
  }

  // 6. Prepaid
  if (reservation.payment_status === 'paid') {
    badges.push({ key: 'prepaid', label: 'Prepaid', icon: CreditCard, colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' });
  }

  // 7. Deposit
  if (reservation.payment_status === 'deposit_paid') {
    badges.push({ key: 'deposit', label: 'Deposit', icon: CreditCard, colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' });
  }

  // 8. Optie verloopt
  if (reservation.status === 'option' && reservation.option_expires_at) {
    badges.push({ key: 'option_expires', label: 'Optie verloopt', icon: Clock, colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' });
  }

  // 9. Herbevestigd
  if (reservation.reconfirmed_at) {
    badges.push({ key: 'reconfirmed', label: 'Herbevestigd', icon: CheckCheck, colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' });
  }

  // 10. Wachtlijst gevuld
  if (reservation.badges?.waitlist_filled) {
    badges.push({ key: 'waitlist', label: 'Wachtlijst', icon: Users, colorClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' });
  }

  // 11. Channel (always, unless walk_in or operator)
  if (reservation.channel !== 'walk_in' && reservation.channel !== 'operator') {
    const ChannelIcon = CHANNEL_ICON_MAP[reservation.channel];
    if (ChannelIcon) {
      badges.push({
        key: 'channel',
        label: reservation.channel,
        icon: ChannelIcon,
        colorClass: 'bg-muted text-muted-foreground',
      });
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map(({ key, label, icon: Icon, colorClass }) => (
        <span
          key={key}
          className={cn(
            'inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-xs font-medium',
            colorClass
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  );
}
