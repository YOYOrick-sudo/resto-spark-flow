import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Public endpoint for double opt-in email confirmation.
 * GET ?token=xxx
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return htmlResponse(`
      <!DOCTYPE html>
      <html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Ongeldige link</title>
      <style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151;}
      .card{text-align:center;padding:48px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}
      h1{font-size:20px;margin-bottom:8px;}p{font-size:14px;color:#6b7280;}</style>
      </head><body><div class="card"><h1>Ongeldige link</h1><p>Deze bevestigingslink is ongeldig of verlopen.</p></div></body></html>
    `, 400);
  }

  try {
    // Look up the token
    const { data: pref, error } = await supabaseAdmin
      .from('marketing_contact_preferences')
      .select('id, customer_id, location_id, opted_in, double_opt_in_confirmed')
      .eq('double_opt_in_token', token)
      .single();

    if (error || !pref) {
      return htmlResponse(`
        <!DOCTYPE html>
        <html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Ongeldige link</title>
        <style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151;}
        .card{text-align:center;padding:48px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}
        h1{font-size:20px;margin-bottom:8px;}p{font-size:14px;color:#6b7280;}</style>
        </head><body><div class="card"><h1>Ongeldige link</h1><p>Deze bevestigingslink is ongeldig of al gebruikt.</p></div></body></html>
      `, 400);
    }

    // Already confirmed?
    if (pref.double_opt_in_confirmed) {
      return htmlResponse(`
        <!DOCTYPE html>
        <html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Al bevestigd</title>
        <style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151;}
        .card{text-align:center;padding:48px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}
        h1{font-size:20px;margin-bottom:8px;}p{font-size:14px;color:#6b7280;}.check{font-size:48px;margin-bottom:16px;}</style>
        </head><body><div class="card"><div class="check">✓</div><h1>Al bevestigd</h1><p>Je inschrijving was al bevestigd.</p></div></body></html>
      `);
    }

    // Confirm opt-in
    await supabaseAdmin
      .from('marketing_contact_preferences')
      .update({
        opted_in: true,
        double_opt_in_confirmed: true,
        opted_in_at: new Date().toISOString(),
        double_opt_in_token: null,
      })
      .eq('id', pref.id);

    // Get restaurant name for the thank you page
    const { data: location } = await supabaseAdmin
      .from('locations')
      .select('name')
      .eq('id', pref.location_id)
      .single();

    const restaurantName = location?.name || 'het restaurant';

    return htmlResponse(`
      <!DOCTYPE html>
      <html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Inschrijving bevestigd</title>
      <style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151;}
      .card{text-align:center;padding:48px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}
      h1{font-size:20px;margin-bottom:8px;}p{font-size:14px;color:#6b7280;}.check{font-size:48px;margin-bottom:16px;color:#10b981;}</style>
      </head><body><div class="card"><div class="check">✓</div><h1>Bedankt!</h1><p>Je bent nu ingeschreven voor updates van ${restaurantName}.</p></div></body></html>
    `);
  } catch (err) {
    console.error('[CONFIRM-OPTIN] Error:', err);
    return htmlResponse(`
      <!DOCTYPE html>
      <html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Fout</title>
      <style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151;}
      .card{text-align:center;padding:48px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}
      h1{font-size:20px;margin-bottom:8px;}p{font-size:14px;color:#6b7280;}</style>
      </head><body><div class="card"><h1>Er ging iets mis</h1><p>Probeer het later opnieuw.</p></div></body></html>
    `, 500);
  }
});
