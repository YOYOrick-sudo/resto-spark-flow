import { useBooking } from '@/contexts/BookingContext';
import { useWidgetTheme } from '@/hooks/useWidgetTheme';

export function BookingProgress() {
  const { step, totalSteps, config } = useBooking();
  const { progressStyle } = useWidgetTheme();
  const primaryColor = config?.primary_color ?? '#10B981';

  if (progressStyle === 'bar') {
    const progress = ((step - 1) / (totalSteps - 1)) * 100;
    return (
      <div
        className="mx-5 my-3"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Stap ${step} van ${totalSteps}`}
      >
        <div className="h-1 rounded-full bg-gray-200/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: primaryColor }}
          />
        </div>
      </div>
    );
  }

  // Dots style (soft)
  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div
      className="flex items-center justify-center gap-1.5 py-3"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Stap ${step} van ${totalSteps}`}
    >
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
