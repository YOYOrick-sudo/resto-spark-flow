const AI_CHANNELS = ['whatsapp', 'webchat', 'voice'];

export function isAiChannel(channel: string): boolean {
  return AI_CHANNELS.includes(channel);
}
