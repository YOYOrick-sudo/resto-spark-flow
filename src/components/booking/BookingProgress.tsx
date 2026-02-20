import { useBooking } from '@/contexts/BookingContext';

export function BookingProgress() {
  const { step } = useBooking();

  // Only show on steps 1 and 2 (2 progress bars for 2 actionable steps)
  const progressSteps = 2;

  return (
    <div
      className="flex items-center justify-center gap-1.5 py-3"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-label={`Stap ${step} van 3`}
    >
      {Array.from({ length: progressSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === step;
        const isCompleted = stepNum < step;

        return (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isActive ? 'w-6 bg-gray-800' : isCompleted ? 'w-1.5 bg-gray-800' : 'w-1.5 bg-gray-300'
            }`}
          />
        );
      })}
    </div>
  );
}
