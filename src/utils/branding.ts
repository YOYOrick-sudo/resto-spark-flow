// Client-side branding utilities

export const BRANDING_DEFAULTS = {
  brandColorPrimary: '#0F766E',
  brandColorSecondary: '#F0FDFA',
} as const;

/**
 * Returns a system prompt instruction for AI agents based on tone_of_voice.
 * Used by the AI-agent sprint (E.3).
 */
export function getSystemPromptTone(tone: string): string {
  switch (tone) {
    case 'formeel':
      return 'Spreek de gast aan met "u". Gebruik volledige zinnen. Professioneel en beleefd.';
    case 'casual':
      return 'Spreek de gast aan met "je". Kort en los. Vriendelijk en ontspannen.';
    default: // 'informeel'
      return 'Spreek de gast aan met "je". Vriendelijk en behulpzaam, maar professioneel.';
  }
}

/**
 * Returns a sample greeting for tone preview in the UI.
 */
export function getTonePreviewText(tone: string): string {
  switch (tone) {
    case 'formeel':
      return 'Geachte heer/mevrouw, hartelijk dank voor uw reservering. Wij kijken ernaar uit u te verwelkomen.';
    case 'casual':
      return 'Hey! Leuk dat je komt. We zien je snel!';
    default:
      return 'Beste gast, bedankt voor je reservering. We kijken ernaar uit je te verwelkomen.';
  }
}
