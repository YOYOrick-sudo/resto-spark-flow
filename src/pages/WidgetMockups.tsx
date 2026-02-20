import { PhoneFrame } from '@/components/widget-mockups/PhoneFrame';
import { MockWidgetA } from '@/components/widget-mockups/MockWidgetA';
import { MockWidgetB } from '@/components/widget-mockups/MockWidgetB';

export default function WidgetMockups() {
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Widget A/B Mockups</h1>
        <p className="text-sm text-gray-500 mt-1">Vergelijk beide stijlen — klik door alle stappen</p>
      </div>
      <div className="flex flex-wrap justify-center gap-10">
        <PhoneFrame label="Mockup A" sublabel="Current — warm & rounded">
          <MockWidgetA />
        </PhoneFrame>
        <PhoneFrame label="Mockup B" sublabel="Enterprise — strak & compact">
          <MockWidgetB />
        </PhoneFrame>
      </div>
    </div>
  );
}
