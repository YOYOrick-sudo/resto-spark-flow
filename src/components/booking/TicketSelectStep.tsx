import { useBooking, type TicketInfo } from '@/contexts/BookingContext';

export function TicketSelectStep() {
  const { config, data, setSelectedTicket, goToStep } = useBooking();
  const primaryColor = config?.primary_color ?? '#10B981';
  const accentColor = config?.accent_color ?? '#14B8A6';
  const tickets = config?.tickets ?? [];

  const handleSelect = (ticket: TicketInfo) => {
    setSelectedTicket(ticket);
    goToStep('date');
  };

  return (
    <div className="flex flex-col gap-4 px-5">
      <div className="text-center">
        <h2 className="text-base font-semibold text-gray-900">Kies een type</h2>
        <p className="text-sm text-gray-500 mt-1">Selecteer het type reservering</p>
      </div>

      <div className="flex flex-col gap-3" role="listbox" aria-label="Ticket types">
        {tickets.map(ticket => {
          const isSelected = data.selectedTicket?.id === ticket.id;
          const initial = ticket.name.charAt(0).toUpperCase();

          return (
            <button
              key={ticket.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(ticket)}
              className="w-full text-left rounded-2xl overflow-hidden transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                backgroundColor: isSelected ? `${primaryColor}08` : '#fff',
                boxShadow: isSelected
                  ? `inset 0 0 0 2px ${primaryColor}, 0 4px 12px -2px rgba(0,0,0,0.08)`
                  : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
                // @ts-ignore
                '--tw-ring-color': primaryColor,
              }}
            >
              {/* Image or gradient fallback with initial letter */}
              <div className="relative aspect-[2/1] w-full overflow-hidden">
                {ticket.image_url ? (
                  <img
                    src={ticket.image_url}
                    alt={ticket.display_title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    }}
                  >
                    <span
                      className="text-[80px] font-bold leading-none select-none"
                      style={{ color: 'rgba(255,255,255,0.18)' }}
                    >
                      {initial}
                    </span>
                  </div>
                )}
              </div>

              {/* Card content */}
              <div className="px-4 py-2.5">
                <h3 className="text-base font-semibold text-gray-900">{ticket.display_title}</h3>
                {ticket.short_description && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{ticket.short_description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  {ticket.min_party_size}–{ticket.max_party_size} gasten
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
