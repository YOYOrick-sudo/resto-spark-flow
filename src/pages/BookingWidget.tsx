import { useParams } from 'react-router-dom';
import { BookingProvider, useBooking } from '@/contexts/BookingContext';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { DateGuestsStep } from '@/components/booking/DateGuestsStep';
import { TimeTicketStep } from '@/components/booking/TimeTicketStep';
import { GuestDetailsStep } from '@/components/booking/GuestDetailsStep';
import { ConfirmationStep } from '@/components/booking/ConfirmationStep';
import { Loader2 } from 'lucide-react';

function BookingWidgetInner() {
  const { config, configLoading, configError, step } = useBooking();

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">Niet beschikbaar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {configError || 'Deze widget is niet actief.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-md px-4 pt-6 pb-2 flex flex-col items-center gap-3">
        {config.logo_url && (
          <img
            src={config.logo_url}
            alt={config.location_name ?? 'Restaurant'}
            className="h-12 object-contain"
          />
        )}
        {config.location_name && (
          <h1 className="text-lg font-semibold text-gray-900">{config.location_name}</h1>
        )}
      </header>

      {/* Card */}
      <main className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-8 overflow-hidden">
        {step < 4 && <BookingProgress />}

        <div className="pb-6">
          {step === 1 && <DateGuestsStep />}
          {step === 2 && <TimeTicketStep />}
          {step === 3 && <GuestDetailsStep />}
          {step === 4 && <ConfirmationStep />}
        </div>
      </main>

      {/* Powered by */}
      {config.show_nesto_branding && (
        <footer className="pb-6 text-center">
          <span className="text-xs text-gray-400">Powered by Nesto</span>
        </footer>
      )}
    </div>
  );
}

export default function BookingWidget() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Geen restaurant opgegeven.</p>
      </div>
    );
  }

  return (
    <BookingProvider slug={slug}>
      <BookingWidgetInner />
    </BookingProvider>
  );
}
