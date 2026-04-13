import { useState } from 'react';
import { PageHeader } from '@/components/polar/PageHeader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import BereikTab from './tabs/BereikTab';
import ReviewsAnalyticsTab from './tabs/ReviewsAnalyticsTab';
import { WasteOverzicht } from '@/components/inkoop/WasteOverzicht';

type Tab = {
  id: string;
  label: string;
  disabled?: boolean;
};

type TabGroup = {
  label: string;
  tabs: Tab[];
};

const TAB_GROUPS: TabGroup[] = [
  {
    label: 'Online & Gasten',
    tabs: [
      { id: 'bereik', label: 'Bereik' },
      { id: 'reviews', label: 'Reviews' },
      { id: 'reservations', label: 'Reserveringen', disabled: true },
    ],
  },
  {
    label: 'Keuken & Inkoop',
    tabs: [
      { id: 'waste', label: 'Waste' },
      { id: 'kitchen', label: 'Keuken', disabled: true },
    ],
  },
];

export default function AnalyticsPage() {
  const params = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(params.get('tab') || 'bereik');

  const renderTab = (tab: Tab) => {
    const isActive = tab.id === activeTab;
    const button = (
      <button
        key={tab.id}
        role="tab"
        aria-selected={isActive}
        onClick={() => !tab.disabled && setActiveTab(tab.id)}
        disabled={tab.disabled}
        className={[
          'relative pb-3 text-body font-medium transition-colors whitespace-nowrap',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          tab.disabled ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}
      >
        {tab.label}
        {isActive && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
        )}
      </button>
    );

    if (tab.disabled) {
      return (
        <Tooltip key={tab.id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Binnenkort beschikbaar</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Strategisch inzicht over al je modules" />

      <div className="border-b border-border">
        <nav className="flex items-end gap-0" role="tablist" aria-label="Analytics tabs">
          {TAB_GROUPS.map((group, gi) => (
            <div key={group.label} className="flex items-end">
              {gi > 0 && (
                <div className="self-stretch flex items-center px-4">
                  <div className="h-8 border-l border-border" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                  {group.label}
                </span>
                <div className="flex gap-4 sm:gap-6">
                  {group.tabs.map(renderTab)}
                </div>
              </div>
            </div>
          ))}
        </nav>
      </div>

      {activeTab === 'bereik' && <BereikTab />}
      {activeTab === 'reviews' && <ReviewsAnalyticsTab />}
      {activeTab === 'waste' && <WasteOverzicht />}
    </div>
  );
}
