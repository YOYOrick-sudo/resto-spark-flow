import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Loader2, Check, Minus, Plus, AlertCircle, MapPin, ExternalLink } from 'lucide-react';
import { NestoLogo } from '@/components/polar/NestoLogo';
import { GuestChat } from '@/components/guest/GuestChat';
import { GuestPreferences } from '@/components/guest/GuestPreferences';

// ── Types ──────────────────────────────────────────────
interface ReservationData {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: string;
  guest_notes: string | null;
  duration_minutes: number;
  tags: string[];
  customer: { first_name: string; last_name: string; email: string; phone_number: string | null } | null;
  ticket: { name: string; display_title: string | null } | null;
  shift: { name: string; short_name: string | null } | null;
}

interface ManageData {
  location_id: string;
  restaurant_name: string | null;
  logo_url: string | null;
  brand_color: string;
  hero_image_url: string | null;
  description_short: string | null;
  google_place_id: string | null;
  customer_id: string | null;
  manage_token: string;
  reservation: ReservationData;
  cancel_policy: any;
  can_cancel: boolean;
  can_modify: boolean;
}

interface AvailableSlot {
  time: string;
  available: boolean;
  slot_type: string | null;
  ticket_id: string;
  ticket_name: string;
  duration_minutes: number;
}

interface AvailableShift {
  shift_id: string;
  shift_name: string;
  slots: AvailableSlot[];
}

// ── Helpers ────────────────────────────────────────────
const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const formatTime = (t: string) => t.slice(0, 5);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
};

const statusConfig: Record<string, { label: string; icon: boolean; color: string }> = {
  confirmed: { label: 'Bevestigd', icon: true, color: '' },
  option: { label: 'Optie', icon: false, color: '' },
  cancelled: { label: 'Geannuleerd', icon: false, color: '#991B1B' },
  seated: { label: 'Gezeten', icon: true, color: '' },
  completed: { label: 'Afgerond', icon: true, color: '' },
  no_show: { label: 'No-show', icon: false, color: '#991B1B' },
};

// ── Main ───────────────────────────────────────────────
export default function ManageReservation() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [modifying, setModifying] = useState(false);
  const [modifyMode, setModifyMode] = useState(false);
  const [newPartySize, setNewPartySize] = useState(0);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [modifyError, setModifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${BASE_URL}/manage?token=${encodeURIComponent(token)}`, {
      headers: { 'apikey': API_KEY },
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data: d }) => {
        if (!ok) throw new Error(d.error || 'Reservering niet gevonden');
        setData(d);
        setNewPartySize(d.reservation.party_size);
        setNewDate(d.reservation.date);
        setNewTime(d.reservation.start_time);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!modifyMode || !data || !newDate) return;
    setSlotsLoading(true);
    fetch(`${BASE_URL}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
      body: JSON.stringify({ location_id: data.location_id, date: newDate, party_size: newPartySize }),
    })
      .then(r => r.json())
      .then(d => setAvailableShifts(d.shifts ?? []))
      .catch(() => setAvailableShifts([]))
      .finally(() => setSlotsLoading(false));
  }, [modifyMode, newDate, newPartySize]);

  const handleCancel = async () => {
    if (!token) return;
    setCancelling(true);
    try {
      const res = await fetch(`${BASE_URL}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify({ token, action: 'cancel', cancellation_reason: cancelReason || undefined }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Annulering mislukt');
      setData(prev => prev ? { ...prev, reservation: { ...prev.reservation, status: 'cancelled' }, can_cancel: false, can_modify: false } : prev);
      setShowCancelConfirm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleModify = async () => {
    if (!token) return;
    setModifying(true);
    setModifyError(null);
    try {
      const res = await fetch(`${BASE_URL}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify({ token, action: 'modify', new_date: newDate, new_start_time: newTime, new_party_size: newPartySize }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Wijzigen mislukt');
      window.location.reload();
    } catch (e: any) {
      setModifyError(e.message);
    } finally {
      setModifying(false);
    }
  };

  // ── Render states ──
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <p className="text-sm" style={{ color: '#6B7280' }}>Ongeldige link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#D1D5DB' }} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <h1 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>Niet gevonden</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { reservation: res } = data;
  const brandColor = data.brand_color || '#0F766E';
  const isActive = res.status === 'confirmed' || res.status === 'option';
  const manageToken = data.manage_token || token;
  const status = statusConfig[res.status] ?? { label: res.status, icon: false, color: '#6B7280' };
  const isNegative = res.status === 'cancelled' || res.status === 'no_show';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAFA' }}>
      {/* ── Hero ── */}
      {data.hero_image_url ? (
        <div className="w-full relative overflow-hidden" style={{ height: '14rem' }}>
          <img src={data.hero_image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2) 50%, transparent)' }} />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
            <div className="max-w-md mx-auto flex items-end gap-3">
              {data.logo_url && (
                <div className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm p-1.5 shrink-0">
                  <img src={data.logo_url} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              <h1 className="text-white font-semibold text-lg leading-tight truncate drop-shadow-sm">
                {data.restaurant_name || 'Restaurant'}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="w-full"
          style={{ background: `linear-gradient(to bottom, ${brandColor}14, #FAFAFA)` }}
        >
          <div className="max-w-md mx-auto px-6 py-10 flex flex-col items-center text-center">
            {data.logo_url ? (
              <img src={data.logo_url} alt="" className="h-14 w-auto object-contain mb-3" />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-white text-xl font-bold"
                style={{ backgroundColor: brandColor }}
              >
                {(data.restaurant_name || 'R')[0]}
              </div>
            )}
            <h1 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>
              {data.restaurant_name || 'Restaurant'}
            </h1>
          </div>
        </div>
      )}

      {/* ── Confirmation ── */}
      <main className="w-full max-w-md mx-auto px-6 flex-1" style={{ marginTop: data.hero_image_url ? '-0.5rem' : '0' }}>
        <div className="text-center py-8">
          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {status.icon && !isNegative && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: brandColor + '18' }}
              >
                <Check className="w-4 h-4" style={{ color: brandColor }} />
              </div>
            )}
            <span
              className="text-xl font-semibold"
              style={{ color: isNegative ? status.color : '#1A1A1A' }}
            >
              {status.label}
            </span>
          </div>

          {/* Date & time */}
          <p className="text-lg" style={{ color: '#1A1A1A' }}>
            {formatDate(res.date)} · {formatTime(res.start_time)}
          </p>
          <p className="text-base mt-1" style={{ color: '#6B7280' }}>
            {res.party_size} {res.party_size === 1 ? 'persoon' : 'personen'}
          </p>

          {/* Action links */}
          {!modifyMode && !showCancelConfirm && isActive && (
            <div className="mt-4 flex items-center justify-center gap-1">
              {data.can_modify !== false && (
                <button
                  onClick={() => setModifyMode(true)}
                  className="text-sm font-medium px-2 py-1 transition-opacity hover:opacity-70"
                  style={{ color: brandColor }}
                >
                  Wijzigen
                </button>
              )}
              {data.can_modify !== false && data.can_cancel && (
                <span style={{ color: '#D1D5DB' }}>·</span>
              )}
              {data.can_cancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-sm font-medium px-2 py-1 transition-opacity hover:opacity-70"
                  style={{ color: '#EF4444' }}
                >
                  Annuleren
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Modify mode ── */}
        {modifyMode && (
          <div className="bg-white rounded-2xl p-6 mb-6 space-y-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Reservering wijzigen</h3>
            <div>
              <label className="text-xs" style={{ color: '#6B7280' }}>Aantal gasten</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => setNewPartySize(Math.max(1, newPartySize - 1))}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                  disabled={newPartySize <= 1}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-lg font-semibold w-8 text-center tabular-nums">{newPartySize}</span>
                <button
                  onClick={() => setNewPartySize(newPartySize + 1)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs" style={{ color: '#6B7280' }}>Datum</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
            {slotsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#D1D5DB' }} />
              </div>
            ) : (
              <div>
                <label className="text-xs" style={{ color: '#6B7280' }}>Tijd</label>
                <div className="mt-1 grid grid-cols-4 gap-1.5">
                  {availableShifts.flatMap(s => s.slots.filter(sl => sl.available)).map(slot => (
                    <button
                      key={`${slot.time}-${slot.ticket_id}`}
                      onClick={() => setNewTime(slot.time)}
                      className="py-2 rounded-xl text-xs font-medium border transition-all"
                      style={{
                        borderColor: newTime === slot.time ? brandColor : '#E5E7EB',
                        backgroundColor: newTime === slot.time ? brandColor : '#fff',
                        color: newTime === slot.time ? '#fff' : '#374151',
                      }}
                    >
                      {formatTime(slot.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {modifyError && (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#DC2626' }}>
                <AlertCircle className="h-4 w-4" />
                {modifyError}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setModifyMode(false); setNewPartySize(res.party_size); setNewDate(res.date); setNewTime(res.start_time); }}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium border hover:bg-gray-50 active:scale-[0.98] transition-all"
                style={{ borderColor: '#E5E7EB', color: '#374151' }}
              >
                Terug
              </button>
              <button
                onClick={handleModify}
                disabled={modifying || !newTime}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1 transition-all"
                style={{ backgroundColor: brandColor }}
              >
                {modifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Opslaan'}
              </button>
            </div>
          </div>
        )}

        {/* ── Cancel confirm ── */}
        {showCancelConfirm && (
          <div className="bg-white rounded-2xl p-6 mb-6 space-y-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Weet je het zeker?</h3>
            <p className="text-xs" style={{ color: '#6B7280' }}>Je reservering wordt geannuleerd. Dit kan niet ongedaan gemaakt worden.</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Reden (optioneel)"
              rows={2}
              className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              style={{ borderColor: '#E5E7EB' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium border hover:bg-gray-50 active:scale-[0.98] transition-all"
                style={{ borderColor: '#E5E7EB', color: '#374151' }}
              >
                Terug
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1 transition-all"
                style={{ backgroundColor: '#EF4444' }}
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Annuleer'}
              </button>
            </div>
          </div>
        )}

        {/* ── Below the fold sections ── */}
        {manageToken && (
          <div className="space-y-0">
            {/* Divider */}
            <div className="border-t border-dashed" style={{ borderColor: '#E5E7EB' }} />

            {/* Chat section */}
            <div className="py-8">
              <GuestChat
                manageToken={manageToken}
                brandColor={brandColor}
                restaurantName={data.restaurant_name || 'Restaurant'}
                inline
              />
            </div>

            <div className="border-t border-dashed" style={{ borderColor: '#E5E7EB' }} />

            {/* Allergies section */}
            <div className="py-8">
              <GuestPreferences
                manageToken={manageToken}
                brandColor={brandColor}
                summaryMode
              />
            </div>

            {/* Location section */}
            {data.google_place_id && (
              <>
                <div className="border-t border-dashed" style={{ borderColor: '#E5E7EB' }} />
                <div className="py-8">
                  <p className="text-sm font-medium uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>
                    Locatie
                  </p>
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${data.google_place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: brandColor }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Route
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto pt-10 pb-8 flex items-center justify-center gap-1.5" style={{ opacity: 0.3 }}>
        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Powered by</span>
        <NestoLogo size="sm" showWordmark showIcon={false} className="text-gray-400 scale-90" />
      </footer>
    </div>
  );
}
