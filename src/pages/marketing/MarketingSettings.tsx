import { useState } from 'react';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoTabs, NestoTabContent } from '@/components/polar/NestoTabs';
import { EmptyState } from '@/components/polar/EmptyState';
import { usePermission } from '@/hooks/usePermission';
import AlgemeenTab from '@/components/marketing/settings/AlgemeenTab';
import BrandKitTab from '@/components/marketing/settings/BrandKitTab';
import EmailSettingsTab from '@/components/marketing/settings/EmailSettingsTab';
import AutomationFlowsTab from '@/components/marketing/settings/AutomationFlowsTab';
import GDPRTab from '@/components/marketing/settings/GDPRTab';
import SocialAccountsTab from '@/components/marketing/settings/SocialAccountsTab';
import PopupSettingsTab from '@/components/marketing/settings/PopupSettingsTab';
import ReviewPlatformsTab from '@/components/marketing/settings/ReviewPlatformsTab';

const TABS = [
  { id: 'algemeen', label: 'Algemeen' },
  { id: 'brand-kit', label: 'Brand Kit' },
  { id: 'email', label: 'Email' },
  { id: 'flows', label: 'Automation Flows' },
  { id: 'gdpr', label: 'GDPR' },
  { id: 'social', label: 'Social Accounts' },
  { id: 'popup', label: 'Website Popup' },
  { id: 'reviews', label: 'Review Platforms' },
];

export default function MarketingSettings() {
  const [activeTab, setActiveTab] = useState('algemeen');
  const canView = usePermission('marketing.view');
  const canManage = usePermission('marketing.manage');

  if (!canView) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <EmptyState
          title="Geen toegang"
          description="Je hebt geen rechten om marketing-instellingen te bekijken."
        />
      </div>
    );
  }

  return (
    <SettingsDetailLayout
      title="Marketing"
      description="Beheer je marketing branding, email configuratie, automation flows en GDPR instellingen."
      breadcrumbs={[
        { label: 'Instellingen', path: '/instellingen/voorkeuren' },
        { label: 'Marketing' },
      ]}
    >
      <NestoTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <NestoTabContent value="algemeen" activeValue={activeTab}>
        <AlgemeenTab readOnly={!canManage} />
      </NestoTabContent>

      <NestoTabContent value="brand-kit" activeValue={activeTab}>
        <BrandKitTab readOnly={!canManage} />
      </NestoTabContent>

      <NestoTabContent value="email" activeValue={activeTab}>
        <EmailSettingsTab readOnly={!canManage} />
      </NestoTabContent>

      <NestoTabContent value="flows" activeValue={activeTab}>
        <AutomationFlowsTab readOnly={!canManage} />
      </NestoTabContent>

      <NestoTabContent value="gdpr" activeValue={activeTab}>
        <GDPRTab readOnly={!canManage} />
      </NestoTabContent>

      <NestoTabContent value="social" activeValue={activeTab}>
        <SocialAccountsTab readOnly={!canManage} />
      </NestoTabContent>

      <NestoTabContent value="popup" activeValue={activeTab}>
        <PopupSettingsTab readOnly={!canManage} />
      </NestoTabContent>

      <NestoTabContent value="reviews" activeValue={activeTab}>
        <ReviewPlatformsTab readOnly={!canManage} />
      </NestoTabContent>
    </SettingsDetailLayout>
  );
}
