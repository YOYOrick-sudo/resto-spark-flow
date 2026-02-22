import { useMarketingBrandKit } from './useMarketingBrandKit';

export function useMarketingOnboardingStatus() {
  const { data, isLoading } = useMarketingBrandKit();

  return {
    needsOnboarding: !isLoading && (!data || !data.tone_of_voice),
    isLoading,
  };
}
