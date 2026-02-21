import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Loader2, Clock, Users, Calendar, Minus, Plus, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { NestoLogo } from '@/components/polar/NestoLogo';

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
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const statusLabel: Record<string, string> = {
  confirmed: 'Bevestigd',
  cancelled: 'Geannuleerd',
  option: 'Optie',
  seated: 'Gezeten',
  completed: 'Afgerond',
  no_show: 'No-show',
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#ECFDF5', text: '#065F46' },
  cancelled: { bg: '#FEF2F2', text: '#991B1B' },
  option: { bg: '#FFFBEB', text: '#92400E' },
  seated: { bg: '#EFF6FF', text: '#1E40AF' },
  completed: { bg: '#F3F4F6', text: '#374151' },
  no_show: { bg: '#FEF2F2', text: '#991B1B' },
};

// ── Components ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}

function DetailRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-700">
      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function ManageReservation() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Modify state
  const [modifying, setModifying] = useState(false);
  const [modifyMode, setModifyMode] = useState(false);
  const [newPartySize, setNewPartySize] = useState(0);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [modifyError, setModifyError] = useState<string | null>(null);

  // Load reservation
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

  // Load availability when modify mode date changes
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

  // Cancel handler
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

  // Modify handler
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
        <p className="text-sm text-gray-400">Ongeldige link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <h1 className="text-base font-semibold text-gray-800">Niet gevonden</h1>
          <p className="text-sm text-gray-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { reservation: res } = data;

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4" style={{ background: '#FAFAFA' }}>
      <main className="w-full max-w-md bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Restaurant branding */}
        <div className="pt-6 pb-4 flex flex-col items-center gap-3 border-b border-gray-100">
          {data.logo_url ? (
            <img src={data.logo_url} alt={data.restaurant_name ?? ''} className="max-h-12 max-w-[200px] object-contain" />
          ) : data.restaurant_name ? (
            <span className="text-base font-semibold text-gray-800">{data.restaurant_name}</span>
          ) : null}
        </div>

        {/* Guest name + status */}
        <div className="px-5 pt-5 pb-1 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {res.customer ? `${res.customer.first_name} ${res.customer.last_name}` : 'Je reservering'}
            </h1>
          </div>
          <StatusBadge status={res.status} />
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          <DetailRow icon={Calendar}>{formatDate(res.date)}</DetailRow>
          <DetailRow icon={Clock}>{formatTime(res.start_time)} – {formatTime(res.end_time)}</DetailRow>
          <DetailRow icon={Users}>{res.party_size} {res.party_size === 1 ? 'gast' : 'gasten'}</DetailRow>
          {res.ticket && (
            <DetailRow icon={UtensilsCrossed}>{res.ticket.display_title || res.ticket.name}</DetailRow>
          )}
          {res.guest_notes && (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 ml-7">
              {res.guest_notes}
            </div>
          )}
        </div>

        {/* Modify mode */}
        {modifyMode && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Reservering wijzigen</h3>

            {/* Party size */}
            <div>
              <label className="text-xs text-gray-500">Aantal gasten</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => setNewPartySize(Math.max(1, newPartySize - 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  disabled={newPartySize <= 1}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-lg font-semibold w-8 text-center">{newPartySize}</span>
                <button
                  onClick={() => setNewPartySize(newPartySize + 1)}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs text-gray-500">Datum</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            {/* Time selection */}
            {slotsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500">Tijd</label>
                <div className="mt-1 grid grid-cols-4 gap-1.5">
                  {availableShifts.flatMap(s => s.slots.filter(sl => sl.available)).map(slot => (
                    <button
                      key={`${slot.time}-${slot.ticket_id}`}
                      onClick={() => setNewTime(slot.time)}
                      className="py-2 rounded-xl text-xs font-medium border transition-all"
                      style={{
                        borderColor: newTime === slot.time ? '#111' : '#e5e7eb',
                        backgroundColor: newTime === slot.time ? '#111' : '#fff',
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
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {modifyError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setModifyMode(false);
                  setNewPartySize(res.party_size);
                  setNewDate(res.date);
                  setNewTime(res.start_time);
                }}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Annuleren
              </button>
              <button
                onClick={handleModify}
                disabled={modifying || !newTime}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1 transition-all"
              >
                {modifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Opslaan'}
              </button>
            </div>
          </div>
        )}

        {/* Cancel confirm */}
        {showCancelConfirm && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Weet je het zeker?</h3>
            <p className="text-xs text-gray-500">Je reservering wordt geannuleerd. Dit kan niet ongedaan gemaakt worden.</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Reden (optioneel)"
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Terug
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1 transition-all"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Annuleer reservering'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!modifyMode && !showCancelConfirm && (res.status === 'confirmed' || res.status === 'option') && (
          <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
            {data.can_modify !== false && (
              <button
                onClick={() => setModifyMode(true)}
                className="w-full py-2.5 rounded-2xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Wijzig reservering
              </button>
            )}
            {data.can_cancel && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-2.5 rounded-2xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 active:scale-[0.98] transition-all"
              >
                Annuleer reservering
              </button>
            )}
            {!data.can_cancel && (
              <p className="text-xs text-gray-400 text-center">
                Deze reservering kan niet online geannuleerd worden. Neem contact op met het restaurant.
              </p>
            )}
          </div>
        )}
      </main>

      {/* Powered by Nesto */}
      <footer className="mt-6 flex items-center justify-center gap-1.5">
        <span className="text-xs text-gray-300">Powered by</span>
        <NestoLogo size="sm" showWordmark showIcon={false} className="text-gray-400" />
      </footer>
    </div>
  );
}
