import { useBooking } from '@/contexts/BookingContext';

export function BookingProgress() {
  const { step, totalSteps, config } = useBooking();
  const primaryColor = config?.primary_color ?? '#10B981';

  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {dots.map(s => {
        const isActive = s === step;
        const isCompleted = s < step;

        return (
          <div
            key={s}
            className="h-2 rounded-full transition-all duration-200"
            style={{
              width: isActive ? 24 : 8,
              backgroundColor: isActive
                ? primaryColor
                : isCompleted
                  ? primaryColor
                  : '#E5E7EB',
              opacity: isCompleted ? 0.6 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
