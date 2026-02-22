import { useState } from 'react';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoTabs, NestoTabContent } from '@/components/polar/NestoTabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import MarketingAnalyticsTab from './tabs/MarketingAnalyticsTab';
import SocialAnalyticsTab from './tabs/SocialAnalyticsTab';
import ReviewsAnalyticsTab from './tabs/ReviewsAnalyticsTab';

const TABS = [
  { id: 'marketing', label: 'Marketing' },
  { id: 'social', label: 'Social' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'reservations', label: 'Reserveringen', disabled: true },
  { id: 'kitchen', label: 'Keuken', disabled: true },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('marketing');

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Strategisch inzicht over al je modules" />

      {/* Custom tab bar with tooltips on disabled tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6" role="tablist" aria-label="Analytics tabs">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            const button = (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={[
                  'relative pb-3 text-body font-medium transition-colors',
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
          })}
        </nav>
      </div>

      {activeTab === 'marketing' && <MarketingAnalyticsTab />}
      {activeTab === 'social' && <SocialAnalyticsTab />}
      {activeTab === 'reviews' && <ReviewsAnalyticsTab />}
    </div>
  );
}
