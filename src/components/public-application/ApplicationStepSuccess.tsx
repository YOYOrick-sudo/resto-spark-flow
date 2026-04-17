import { CheckCircle2 } from 'lucide-react';

interface Props {
  message: string;
  brandColor: string;
}

export function ApplicationStepSuccess({ message, brandColor }: Props) {
  return (
    <div className="text-center py-6">
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
        style={{ backgroundColor: `${brandColor}15` }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: brandColor }} />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Bedankt!</h2>
      <p className="text-sm text-gray-600 whitespace-pre-line">{message}</p>
    </div>
  );
}
