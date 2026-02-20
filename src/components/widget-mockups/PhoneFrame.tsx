import React from 'react';

interface PhoneFrameProps {
  label: string;
  sublabel: string;
  children: React.ReactNode;
}

export function PhoneFrame({ label, sublabel, children }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
        <p className="text-xs text-gray-400">{sublabel}</p>
      </div>
      <div
        className="relative bg-black rounded-[3rem] p-3 shadow-2xl"
        style={{ width: 375 + 24, height: 812 + 24 }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-10" />
        {/* Screen */}
        <div className="w-[375px] h-[812px] rounded-[2.25rem] overflow-hidden bg-white">
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
