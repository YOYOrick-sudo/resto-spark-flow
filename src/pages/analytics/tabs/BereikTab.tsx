import MarketingAnalyticsTab from './MarketingAnalyticsTab';
import SocialAnalyticsTab from './SocialAnalyticsTab';

export default function BereikTab() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-h2 text-foreground mb-6">Marketing & Campagnes</h2>
        <MarketingAnalyticsTab />
      </section>

      <div className="border-t border-border" />

      <section>
        <h2 className="text-h2 text-foreground mb-6">Social Media</h2>
        <SocialAnalyticsTab />
      </section>
    </div>
  );
}
