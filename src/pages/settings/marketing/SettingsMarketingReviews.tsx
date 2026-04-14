import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import ReviewPlatformsTab from "@/components/marketing/settings/ReviewPlatformsTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingReviews() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="Review Platforms"
      description="Review platformen en monitoring."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "Review Platforms" },
      ]}
    >
      <ReviewPlatformsTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
