import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find accounts with tokens expiring within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringAccounts, error: fetchError } = await supabase
      .from("marketing_social_accounts")
      .select("*")
      .eq("is_active", true)
      .not("refresh_token", "is", null)
      .lt("token_expires_at", sevenDaysFromNow.toISOString());

    if (fetchError) throw fetchError;

    const results: { platform: string; location_id: string; success: boolean; error?: string }[] = [];

    for (const account of expiringAccounts ?? []) {
      try {
        if (account.platform === "instagram" || account.platform === "facebook") {
          // Meta Graph API token refresh
          // Requires META_APP_ID and META_APP_SECRET secrets
          const appId = Deno.env.get("META_APP_ID");
          const appSecret = Deno.env.get("META_APP_SECRET");

          if (!appId || !appSecret) {
            results.push({
              platform: account.platform,
              location_id: account.location_id,
              success: false,
              error: "META_APP_ID or META_APP_SECRET not configured",
            });
            continue;
          }

          const response = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${account.access_token}`
          );
          const data = await response.json();

          if (data.access_token) {
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 5184000));

            await supabase
              .from("marketing_social_accounts")
              .update({
                access_token: data.access_token,
                token_expires_at: expiresAt.toISOString(),
              })
              .eq("id", account.id);

            results.push({ platform: account.platform, location_id: account.location_id, success: true });
          } else {
            throw new Error(data.error?.message || "Token refresh failed");
          }
        } else if (account.platform === "google_business") {
          const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
          const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

          if (!clientId || !clientSecret) {
            results.push({
              platform: account.platform,
              location_id: account.location_id,
              success: false,
              error: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured",
            });
            continue;
          }

          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: account.refresh_token!,
              grant_type: "refresh_token",
            }),
          });
          const data = await response.json();

          if (data.access_token) {
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));

            await supabase
              .from("marketing_social_accounts")
              .update({
                access_token: data.access_token,
                token_expires_at: expiresAt.toISOString(),
              })
              .eq("id", account.id);

            results.push({ platform: account.platform, location_id: account.location_id, success: true });
          } else {
            throw new Error(data.error_description || "Token refresh failed");
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        results.push({
          platform: account.platform,
          location_id: account.location_id,
          success: false,
          error: errorMsg,
        });

        // Insert cross_module_event for failed refreshes so Assistent can signal
        await supabase.from("cross_module_events").insert({
          location_id: account.location_id,
          source_module: "marketing",
          event_type: "social_token_expiring",
          payload: { platform: account.platform, error: errorMsg },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
