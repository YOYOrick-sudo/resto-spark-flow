import { supabaseAdmin } from './supabaseAdmin.ts';

interface TemplateContext {
  voornaam: string;
  achternaam: string;
  vestiging: string;
  functie: string;
  datum?: string;
}

/**
 * Replaces [variable] placeholders in a template string.
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  return template
    .replace(/\[voornaam\]/g, context.voornaam)
    .replace(/\[achternaam\]/g, context.achternaam)
    .replace(/\[vestiging\]/g, context.vestiging)
    .replace(/\[functie\]/g, context.functie || 'Open positie')
    .replace(/\[datum\]/g, context.datum || '');
}

/**
 * Fetches email templates for a location from onboarding_settings.
 */
export async function getEmailTemplates(locationId: string) {
  const { data, error } = await supabaseAdmin
    .from('onboarding_settings')
    .select('email_templates')
    .eq('location_id', locationId)
    .single();

  if (error || !data) {
    console.warn(`No email templates found for location ${locationId}`);
    return null;
  }
  return data.email_templates as Record<string, { subject: string; html_body: string }>;
}
