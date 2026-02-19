import { useBooking, type BookingStep } from '@/contexts/BookingContext';

const STEPS: { step: BookingStep; label: string }[] = [
  { step: 1, label: 'Datum' },
  { step: 2, label: 'Tijd' },
  { step: 3, label: 'Gegevens' },
  { step: 4, label: 'Bevestiging' },
];

export function BookingProgress() {
  const { step, config } = useBooking();
  const primaryColor = config?.primary_color ?? '#10B981';

  return (
    <div className="flex items-center gap-1 w-full px-2 py-4">
      {STEPS.map(({ step: s, label }, i) => {
        const isActive = s === step;
        const isCompleted = s < step;

        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive || isCompleted ? primaryColor : '#e5e7eb',
                  color: isActive || isCompleted ? '#fff' : '#9ca3af',
                }}
              >
                {isCompleted ? '✓' : s}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: isActive ? primaryColor : '#6b7280' }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mt-[-1rem]"
                style={{
                  backgroundColor: isCompleted ? primaryColor : '#e5e7eb',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
