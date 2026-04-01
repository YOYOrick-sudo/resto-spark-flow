import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Loader2, Clock, Users, Calendar, Minus, Plus, AlertCircle, UtensilsCrossed, MessageCircle, Info } from 'lucide-react';
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

const statusLabel: Record<string, string> = {
  confirmed: 'Bevestigd',
  cancelled: 'Geannuleerd',
  option: 'Optie',
  seated: 'Gezeten',
  completed: 'Afgerond',
  no_show: 'No-show',
};

// ── Sub-components ─────────────────────────────────────
function StatusBadge({ status, brandColor }: { status: string; brandColor: string }) {
  const isPositive = status === 'confirmed' || status === 'seated';
  const bg = isPositive ? brandColor + '18' : status === 'cancelled' || status === 'no_show' ? '#FEF2F2' : '#F3F4F6';
  const text = isPositive ? brandColor : status === 'cancelled' || status === 'no_show' ? '#991B1B' : '#374151';
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: bg, color: text }}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  brandColor,
  badge,
  isActive,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  brandColor: string;
  badge?: number;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] relative"
      style={{
        boxShadow: isActive ? `0 0 0 1.5px ${brandColor}, 0 2px 8px rgba(0,0,0,0.06)` : '0 1px 4px rgba(0,0,0,0.06)',
        backgroundColor: isActive ? brandColor + '06' : '#fff',
      }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{ backgroundColor: brandColor + '12' }}
      >
        <Icon className="w-[22px] h-[22px]" style={{ color: brandColor }} />
      </div>
      <div>
        <span className="text-xs font-semibold text-gray-800 leading-tight block">{title}</span>
        <span className="text-[10px] text-gray-400 leading-tight block mt-0.5">{subtitle}</span>
      </div>
      {badge != null && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
          style={{ backgroundColor: brandColor }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Expandable section wrapper ─────────────────────────
function ExpandableSection({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Sluiten
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function ManageReservation() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<string | null>(null);

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
  const brandColor = data.brand_color || '#0F766E';
  const isActive = res.status === 'confirmed' || res.status === 'option';
  const manageToken = data.manage_token || token;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAFA' }}>
      {/* ── Hero header ── */}
      {data.hero_image_url ? (
        /* With hero image: large photo header */
        <div className="w-full relative overflow-hidden" style={{ height: '14rem' }}>
          <img src={data.hero_image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/65" />
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <div className="max-w-lg mx-auto flex items-end gap-3">
              {data.logo_url && (
                <div className="w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm p-1.5 shrink-0 shadow-sm">
                  <img src={data.logo_url} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-white font-semibold text-lg leading-tight truncate drop-shadow-sm" style={{ fontFamily: 'Georgia, serif' }}>
                  {data.restaurant_name || 'Restaurant'}
                </h1>
                {data.description_short && (
                  <p className="text-white/70 text-xs mt-0.5 truncate drop-shadow-sm">{data.description_short}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Without hero image: clean white header */
        <div className="w-full bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-5 py-8 flex flex-col items-center text-center">
            {data.logo_url ? (
              <div className="w-16 h-16 rounded-2xl bg-gray-50 p-2 mb-3">
                <img src={data.logo_url} alt="" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 text-white text-xl font-bold"
                style={{ backgroundColor: brandColor }}
              >
                {(data.restaurant_name || 'R')[0]}
              </div>
            )}
            <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              {data.restaurant_name || 'Restaurant'}
            </h1>
            {data.description_short && (
              <p className="text-xs text-gray-400 mt-1 max-w-xs">{data.description_short}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main className="w-full max-w-lg mx-auto px-4 relative z-10 flex-1" style={{ marginTop: data.hero_image_url ? '-1.5rem' : '1.5rem' }}>
        {/* Reservation card */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {/* Guest + status row */}
          <div className="px-5 pt-5 pb-3 flex items-start justify-between">
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {res.customer ? `${res.customer.first_name} ${res.customer.last_name}` : 'Je reservering'}
              </p>
              {res.ticket?.display_title && (
                <p className="text-[11px] text-gray-400 mt-0.5">{res.ticket.display_title}</p>
              )}
            </div>
            <StatusBadge status={res.status} brandColor={brandColor} />
          </div>

          {/* Compact details row with · separators */}
          <div className="px-5 pb-4 flex items-center text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(res.date)}
            </span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatTime(res.start_time)}
            </span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {res.party_size}
            </span>
          </div>

          {res.guest_notes && (
            <div className="px-5 pb-4">
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{res.guest_notes}</div>
            </div>
          )}

          {/* Action links */}
          {!modifyMode && !showCancelConfirm && isActive && (
            <div className="px-5 pb-4 flex items-center gap-4">
              {data.can_modify !== false && (
                <button
                  onClick={() => setModifyMode(true)}
                  className="text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: brandColor }}
                >
                  Wijzigen
                </button>
              )}
              {data.can_cancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs font-medium text-red-400 hover:text-red-500 transition-colors"
                >
                  Annuleren
                </button>
              )}
              {!data.can_cancel && !data.can_modify && (
                <p className="text-[10px] text-gray-400">
                  Deze reservering kan niet meer online gewijzigd worden.
                </p>
              )}
            </div>
          )}

          {/* ── Modify mode ── */}
          {modifyMode && (
            <div className="px-5 py-4 border-t border-gray-100 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Reservering wijzigen</h3>
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
                  <span className="text-lg font-semibold w-8 text-center tabular-nums">{newPartySize}</span>
                  <button
                    onClick={() => setNewPartySize(newPartySize + 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
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
                          borderColor: newTime === slot.time ? brandColor : '#e5e7eb',
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
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {modifyError}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setModifyMode(false); setNewPartySize(res.party_size); setNewDate(res.date); setNewTime(res.start_time); }}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
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
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Annuleer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Interactive cards ── */}
        {manageToken && isActive && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <ActionCard
              icon={UtensilsCrossed}
              title="Allergieën"
              subtitle="& voorkeuren"
              onClick={() => setActiveSection(activeSection === 'preferences' ? null : 'preferences')}
              brandColor={brandColor}
              isActive={activeSection === 'preferences'}
            />
            <ActionCard
              icon={MessageCircle}
              title="Stel een vraag"
              subtitle="Chat met ons"
              onClick={() => setActiveSection(activeSection === 'chat' ? null : 'chat')}
              brandColor={brandColor}
              isActive={activeSection === 'chat'}
            />
            <ActionCard
              icon={Info}
              title="Restaurant"
              subtitle="info"
              onClick={() => setActiveSection(activeSection === 'info' ? null : 'info')}
              brandColor={brandColor}
              isActive={activeSection === 'info'}
            />
          </div>
        )}

        {/* ── Expandable sections ── */}
        {manageToken && isActive && activeSection && (
          <div
            className="mt-4 bg-white rounded-2xl p-5"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)' }}
          >
            {activeSection === 'preferences' && (
              <ExpandableSection isOpen title="Allergieën & voorkeuren" onClose={() => setActiveSection(null)}>
                <GuestPreferences manageToken={manageToken} brandColor={brandColor} />
              </ExpandableSection>
            )}
            {activeSection === 'chat' && (
              <ExpandableSection isOpen title="Stel een vraag" onClose={() => setActiveSection(null)}>
                <GuestChat manageToken={manageToken} brandColor={brandColor} inline />
              </ExpandableSection>
            )}
            {activeSection === 'info' && (
              <ExpandableSection isOpen title="Restaurant informatie" onClose={() => setActiveSection(null)}>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">{data.restaurant_name}</p>
                  {data.description_short && <p className="text-xs text-gray-500">{data.description_short}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    Neem contact op via de chat voor vragen over openingstijden, bereikbaarheid of het menu.
                  </p>
                </div>
              </ExpandableSection>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto pt-10 pb-6 flex items-center justify-center gap-1.5 opacity-40">
        <span className="text-[10px] text-gray-400">Powered by</span>
        <NestoLogo size="sm" showWordmark showIcon={false} className="text-gray-400 scale-90" />
      </footer>
    </div>
  );
}
