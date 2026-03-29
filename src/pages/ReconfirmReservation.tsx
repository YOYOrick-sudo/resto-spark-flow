import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

export default function ReconfirmReservation() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'confirm' | 'confirmed' | 'error'>('loading');
  const [reservation, setReservation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('Ongeldige link.');
      return;
    }
    loadReservation();
  }, [token]);

  async function loadReservation() {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, reservation_date, start_time, party_size, reconfirmed_at, location_id, locations:location_id(name)')
      .eq('reconfirm_token', token!)
      .maybeSingle();

    if (error || !data) {
      setState('error');
      setErrorMsg('Reservering niet gevonden of link ongeldig.');
      return;
    }

    if (data.reconfirmed_at) {
      setReservation(data);
      setState('confirmed');
      return;
    }

    setReservation(data);
    setState('confirm');
  }

  async function handleConfirm() {
    setState('loading');
    const { error } = await supabase
      .from('reservations')
      .update({ reconfirmed_at: new Date().toISOString() })
      .eq('reconfirm_token', token!);

    if (error) {
      setState('error');
      setErrorMsg('Er ging iets mis. Probeer het opnieuw.');
      return;
    }
    setState('confirmed');
  }

  const formatDate = (dateStr: string) => {
    const [y, mo, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(mo) - 1, Number(d));
    const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return `${dayNames[dateObj.getDay()]} ${Number(d)} ${monthNames[Number(mo) - 1]} ${y}`;
  };

  const restaurantName = (reservation as any)?.locations?.name || 'Restaurant';

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 text-center">
          {state === 'loading' && (
            <div className="py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-4 text-sm text-muted-foreground">Even laden...</p>
            </div>
          )}

          {state === 'confirm' && reservation && (
            <>
              <h1 className="text-xl font-semibold text-foreground mb-2">Bevestig je reservering</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {restaurantName} vraagt je om je reservering te bevestigen.
              </p>

              <div className="bg-[#f9fafb] rounded-xl p-4 mb-6 text-left space-y-2">
                <p className="text-sm text-muted-foreground">📅 <strong>{formatDate(reservation.reservation_date)}</strong></p>
                <p className="text-sm text-muted-foreground">🕐 <strong>{reservation.start_time?.slice(0, 5)} uur</strong></p>
                <p className="text-sm text-muted-foreground">👥 <strong>{reservation.party_size} {reservation.party_size === 1 ? 'gast' : 'gasten'}</strong></p>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
              >
                Ja, ik kom!
              </button>
            </>
          )}

          {state === 'confirmed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">Bedankt!</h1>
              <p className="text-sm text-muted-foreground">
                Je reservering bij {restaurantName} is bevestigd. We kijken ernaar uit je te verwelkomen!
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">Oeps</h1>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
