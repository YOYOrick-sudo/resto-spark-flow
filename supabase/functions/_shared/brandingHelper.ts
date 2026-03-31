import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface LocationBrandingData {
  logoUrl: string | null;
  brandColor: string;
  footerText: string;
  senderName: string;
  replyTo: string | undefined;
  restaurantName: string;
  toneOfVoice: string;
  guestGreeting: string | null;
}

const DEFAULT_BRAND_COLOR = '#0F766E';

/**
 * Resolves branding with 3-step fallback:
 * 1. locations table (primary source)
 * 2. communication_settings (legacy fallback)
 * 3. Hardcoded defaults
 */
export async function getLocationBranding(
  admin: ReturnType<typeof createClient>,
  locationId: string,
): Promise<LocationBrandingData> {
  const [{ data: loc }, { data: comm }] = await Promise.all([
    admin
      .from('locations')
      .select('name, logo_url, brand_color_primary, tone_of_voice, guest_greeting')
      .eq('id', locationId)
      .single(),
    admin
      .from('communication_settings')
      .select('sender_name, reply_to, brand_color, logo_url, footer_text')
      .eq('location_id', locationId)
      .maybeSingle(),
  ]);

  const restaurantName = loc?.name ?? 'Restaurant';

  return {
    logoUrl: loc?.logo_url || comm?.logo_url || null,
    brandColor: loc?.brand_color_primary || comm?.brand_color || DEFAULT_BRAND_COLOR,
    footerText: comm?.footer_text || '',
    senderName: comm?.sender_name || restaurantName,
    replyTo: comm?.reply_to || undefined,
    restaurantName,
    toneOfVoice: loc?.tone_of_voice || 'informeel',
    guestGreeting: loc?.guest_greeting || null,
  };
}

export function getSystemPromptTone(tone: string): string {
  switch (tone) {
    case 'formeel':
      return 'Spreek de gast aan met "u". Gebruik volledige zinnen. Professioneel en beleefd.';
    case 'casual':
      return 'Spreek de gast aan met "je". Kort en los. Vriendelijk en ontspannen.';
    default:
      return 'Spreek de gast aan met "je". Vriendelijk en behulpzaam, maar professioneel.';
  }
}
