import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get published posts from the last 30 days with external_post_id
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: posts, error: postsError } = await supabase
      .from("marketing_social_posts")
      .select("id, location_id, platform, external_post_id, analytics")
      .eq("status", "published")
      .not("external_post_id", "is", null)
      .gte("published_at", thirtyDaysAgo.toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No posts to sync", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Batch account lookups per location+platform
    const accountCache = new Map<string, any>();
    async function getAccount(locationId: string, platform: string) {
      const key = `${locationId}:${platform}`;
      if (accountCache.has(key)) return accountCache.get(key);
      const { data } = await supabase
        .from("marketing_social_accounts")
        .select("*")
        .eq("location_id", locationId)
        .eq("platform", platform)
        .eq("is_active", true)
        .single();
      accountCache.set(key, data);
      return data;
    }

    const results: {
      post_id: string;
      success: boolean;
      error?: string;
    }[] = [];

    // 3. Process each post
    for (const post of posts) {
      try {
        const account = await getAccount(post.location_id, post.platform);
        if (!account?.access_token) {
          results.push({
            post_id: post.id,
            success: false,
            error: "No active account or token",
          });
          continue;
        }

        let metrics: Record<string, number> = {};

        if (post.platform === "instagram") {
          const resp = await fetch(
            `https://graph.facebook.com/v19.0/${post.external_post_id}/insights?metric=impressions,reach,saved,engagement&access_token=${account.access_token}`
          );
          const data = await resp.json();

          if (data.error) {
            // Code 4 = rate limit, code 190 = expired token
            if (data.error.code === 4 || data.error.code === 190) {
              console.warn(
                `Skipping Instagram post ${post.id}: ${data.error.message}`
              );
              results.push({
                post_id: post.id,
                success: false,
                error: data.error.message,
              });
              continue;
            }
            throw new Error(data.error.message);
          }

          for (const metric of data.data ?? []) {
            metrics[metric.name] = metric.values?.[0]?.value ?? 0;
          }
        } else if (post.platform === "facebook") {
          const resp = await fetch(
            `https://graph.facebook.com/v19.0/${post.external_post_id}?fields=insights.metric(post_impressions,post_reach,post_clicks)&access_token=${account.access_token}`
          );
          const data = await resp.json();

          if (data.error) {
            if (data.error.code === 4 || data.error.code === 190) {
              console.warn(
                `Skipping Facebook post ${post.id}: ${data.error.message}`
              );
              results.push({
                post_id: post.id,
                success: false,
                error: data.error.message,
              });
              continue;
            }
            throw new Error(data.error.message);
          }

          const insights = data.insights?.data ?? [];
          for (const metric of insights) {
            const name = metric.name
              .replace("post_", "")
              .replace("clicks", "clicks");
            metrics[name] = metric.values?.[0]?.value ?? 0;
          }
        } else if (post.platform === "google_business") {
          const resp = await fetch(
            `https://mybusiness.googleapis.com/v4/${post.external_post_id}?readMask=localPostMetrics`,
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          );
          const data = await resp.json();

          if (data.error) {
            console.warn(
              `Skipping Google post ${post.id}: ${data.error.message}`
            );
            results.push({
              post_id: post.id,
              success: false,
              error: data.error.message,
            });
            continue;
          }

          const metricValues = data.localPostMetrics?.metricValues ?? [];
          for (const mv of metricValues) {
            if (mv.metric === "LOCAL_POST_VIEWS_SEARCH")
              metrics.views = mv.totalValue?.value ?? 0;
            if (mv.metric === "LOCAL_POST_ACTIONS_CALL_TO_ACTION")
              metrics.clicks = mv.totalValue?.value ?? 0;
          }
        }

        // 4. Merge with existing analytics and add last_synced
        const existingAnalytics =
          typeof post.analytics === "object" && post.analytics !== null
            ? post.analytics
            : {};
        const updatedAnalytics = {
          ...existingAnalytics,
          ...metrics,
          last_synced: new Date().toISOString(),
        };

        await supabase
          .from("marketing_social_posts")
          .update({ analytics: updatedAnalytics })
          .eq("id", post.id);

        results.push({ post_id: post.id, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error syncing post ${post.id}:`, msg);
        results.push({ post_id: post.id, success: false, error: msg });
      }
    }

    // ── Re-analysis trigger: check if 5+ new posts since last analysis ──
    const locationIds = [...new Set(posts!.map((p) => p.location_id))];
    for (const locId of locationIds) {
      try {
        const { data: bi } = await supabase
          .from("marketing_brand_intelligence")
          .select("posts_analyzed")
          .eq("location_id", locId)
          .maybeSingle();

        const { count } = await supabase
          .from("marketing_social_posts")
          .select("id", { count: "exact", head: true })
          .eq("location_id", locId)
          .in("status", ["published", "imported"]);

        const currentCount = count ?? 0;
        const analyzed = bi?.posts_analyzed ?? 0;

        if (currentCount - analyzed >= 5) {
          console.log(`Triggered re-analysis for location ${locId}`);
          fetch(`${supabaseUrl}/functions/v1/marketing-analyze-brand`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ triggered_by: "sync_reanalysis", location_id: locId }),
          }).catch((e) => console.error("Re-analysis trigger failed:", e));
        }
      } catch (e) {
        console.error(`Re-analysis check failed for ${locId}:`, e);
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
