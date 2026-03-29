import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Clock, AlertCircle, CalendarDays, Users, Utensils } from 'lucide-react';

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waitlist-accept`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface InviteData {
  invite_id: string;
  location_name: string;
  logo_url: string | null;
  slot_date: string;
  slot_time: string;
  party_size: number;
  ticket_name: string | null;
  expires_at: string;
  status: string;
}

type PageState = 'loading' | 'valid' | 'expired' | 'accepted' | 'error';

const MONTH_NAMES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export default function WaitlistAccept() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [countdown, setCountdown] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Load invite data
  useEffect(() => {
    if (!token) { setState('error'); return; }

    fetch(`${BASE_URL}?token=${encodeURIComponent(token)}`, {
      headers: { 'apikey': API_KEY },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 410 || body.code === 'expired') {
            setState('expired');
          } else {
            setErrorMsg(body.error || 'Onbekende fout');
            setState('error');
          }
          return;
        }
        const data = await res.json();
        setInvite(data);
        
        // Check if already expired
        if (new Date(data.expires_at) <= new Date()) {
          setState('expired');
        } else if (data.status === 'accepted') {
          setState('accepted');
        } else {
          setState('valid');
        }
      })
      .catch(() => {
        setErrorMsg('Kan uitnodiging niet laden');
        setState('error');
      });
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (state !== 'valid' || !invite) return;

    const update = () => {
      const now = new Date().getTime();
      const exp = new Date(invite.expires_at).getTime();
      const diff = exp - now;
      if (diff <= 0) {
        setState('expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [state, invite]);

  const handleAccept = useCallback(async () => {
    if (!token || accepting) return;
    setAccepting(true);
    setErrorMsg('');

    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
        },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrorMsg('Helaas, deze plek is net vergeven. Je staat weer op de wachtlijst.');
          setState('expired');
          return;
        }
        if (res.status === 410) {
          setState('expired');
          return;
        }
        throw new Error(body.error || 'Er ging iets mis');
      }

      const result = await res.json();
      setManageUrl(result.manage_url || null);
      setState('accepted');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setAccepting(false);
    }
  }, [token, accepting]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden">
        {/* Header */}
        {invite && (
          <div className="bg-gray-900 text-white px-6 py-5 text-center">
            {invite.logo_url && (
              <img src={invite.logo_url} alt="" className="w-12 h-12 rounded-full mx-auto mb-3 object-cover" />
            )}
            <h1 className="text-lg font-bold">{invite.location_name}</h1>
            <p className="text-gray-400 text-sm mt-1">Wachtlijst uitnodiging</p>
          </div>
        )}

        <div className="p-6">
          {/* Loading */}
          {state === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Valid invite */}
          {state === 'valid' && invite && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">Er is plek!</h2>
                <p className="text-sm text-gray-500 mt-1">Claim je reservering voordat de uitnodiging verloopt.</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700 capitalize">{formatDate(invite.slot_date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{invite.slot_time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{invite.party_size} gasten</span>
                </div>
                {invite.ticket_name && (
                  <div className="flex items-center gap-3">
                    <Utensils className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-700">{invite.ticket_name}</span>
                  </div>
                )}
              </div>

              {/* Countdown */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Verloopt over {countdown}</p>
                  <p className="text-xs text-amber-600">Reserveer nu om je plek te claimen</p>
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-red-500 text-center">{errorMsg}</p>
              )}

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-all"
              >
                {accepting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Reserveer nu →'
                )}
              </button>
            </div>
          )}

          {/* Accepted */}
          {state === 'accepted' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gereserveerd!</h2>
                <p className="text-sm text-gray-500 mt-1">Je reservering is bevestigd. We hebben een bevestigingsmail gestuurd.</p>
              </div>
              {invite && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm text-gray-600 text-left">
                  <p><span className="font-medium">Datum:</span> {formatDate(invite.slot_date)}</p>
                  <p><span className="font-medium">Tijd:</span> {invite.slot_time}</p>
                  <p><span className="font-medium">Gasten:</span> {invite.party_size}</p>
                </div>
              )}
              {manageUrl && (
                <a
                  href={manageUrl}
                  className="inline-block text-sm font-medium text-gray-600 hover:text-gray-800 underline underline-offset-4"
                >
                  Reservering beheren →
                </a>
              )}
            </div>
          )}

          {/* Expired */}
          {state === 'expired' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Uitnodiging verlopen</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {errorMsg || 'Deze uitnodiging is helaas verlopen. Je staat weer op de wachtlijst — we proberen het opnieuw zodra er plek is.'}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Oeps</h2>
                <p className="text-sm text-gray-500 mt-1">{errorMsg || 'Ongeldige link.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
