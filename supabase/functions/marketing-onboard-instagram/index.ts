import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v19.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { account_id } = await req.json();
    if (!account_id) throw new Error("Missing account_id");

    // Get employee -> location
    const { data: employee } = await supabase
      .from("employees")
      .select("location_id")
      .eq("user_id", user.id)
      .single();
    if (!employee) throw new Error("No location found");
    const locationId = employee.location_id;

    // Get social account
    const { data: account } = await supabase
      .from("marketing_social_accounts")
      .select("*")
      .eq("id", account_id)
      .eq("location_id", locationId)
      .eq("platform", "instagram")
      .eq("is_active", true)
      .single();
    if (!account?.access_token || !account?.account_id) {
      throw new Error("Instagram account not found or missing token");
    }

    const igUserId = account.account_id;
    const accessToken = account.access_token;
    let imported = 0;
    let insightsFetched = 0;
    let classified = 0;

    // ── Step 1: Fetch last 30 posts ──
    const mediaResp = await fetch(
      `${GRAPH_API}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=30&access_token=${accessToken}`
    );
    const mediaData = await mediaResp.json();
    if (mediaData.error) {
      console.error("Graph API media error:", mediaData.error);
      throw new Error(mediaData.error.message);
    }

    const mediaItems = mediaData.data ?? [];
    const insertedPosts: { id: string; externalId: string; caption: string | null }[] = [];

    for (const media of mediaItems) {
      // Skip if already exists
      const { data: existing } = await supabase
        .from("marketing_social_posts")
        .select("id")
        .eq("external_post_id", media.id)
        .eq("location_id", locationId)
        .maybeSingle();

      if (existing) continue;

      const mediaUrl = media.media_url || media.thumbnail_url;
      const { data: inserted, error: insertErr } = await supabase
        .from("marketing_social_posts")
        .insert({
          location_id: locationId,
          platform: "instagram",
          status: "imported",
          external_post_id: media.id,
          content_text: media.caption || null,
          media_urls: mediaUrl ? [mediaUrl] : [],
          published_at: media.timestamp,
          analytics: { likes: media.like_count ?? 0, comments: media.comments_count ?? 0 },
          hashtags: extractHashtags(media.caption),
          post_type: media.media_type?.toLowerCase() === "video" ? "video" : "image",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr.message);
        continue;
      }

      imported++;
      insertedPosts.push({ id: inserted.id, externalId: media.id, caption: media.caption || null });
    }

    // ── Step 2: Fetch insights per post ──
    let stopInsights = false;
    for (const post of insertedPosts) {
      if (stopInsights) break;
      try {
        const resp = await fetch(
          `${GRAPH_API}/${post.externalId}/insights?metric=impressions,reach,saved,engagement&access_token=${accessToken}`
        );
        const data = await resp.json();

        if (data.error) {
          if (data.error.code === 4 || data.error.code === 190) {
            console.warn(`Rate limit/token issue, stopping insights: ${data.error.message}`);
            stopInsights = true;
            continue;
          }
          console.warn(`Insights error for ${post.externalId}: ${data.error.message}`);
          continue;
        }

        const metrics: Record<string, number> = {};
        for (const metric of data.data ?? []) {
          metrics[metric.name] = metric.values?.[0]?.value ?? 0;
        }

        // Merge with existing analytics
        const { data: current } = await supabase
          .from("marketing_social_posts")
          .select("analytics")
          .eq("id", post.id)
          .single();

        const existing = typeof current?.analytics === "object" && current.analytics !== null ? current.analytics : {};
        await supabase
          .from("marketing_social_posts")
          .update({ analytics: { ...existing, ...metrics } })
          .eq("id", post.id);

        insightsFetched++;
      } catch (err) {
        console.error(`Insights error for ${post.externalId}:`, err);
      }
    }

    // ── Step 3: Content type classification (AI batch) ──
    const captionsForClassification = insertedPosts
      .map((p, i) => ({ index: i, caption: p.caption }))
      .filter((c) => c.caption && c.caption.trim().length > 0);

    if (captionsForClassification.length > 0) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const captionList = captionsForClassification
            .map((c) => `${c.index}: ${c.caption}`)
            .join("\n");

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `Classificeer elke Instagram caption in exact 1 van deze categorieën:
food_shot, behind_the_scenes, team, ambiance, seasonal, promo, event, user_generated.
Geef voor elke caption het nummer en de categorie.`,
                },
                { role: "user", content: captionList },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "classify_captions",
                    description: "Classify each caption into a content type",
                    parameters: {
                      type: "object",
                      properties: {
                        classifications: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              index: { type: "number" },
                              tag: {
                                type: "string",
                                enum: [
                                  "food_shot", "behind_the_scenes", "team", "ambiance",
                                  "seasonal", "promo", "event", "user_generated",
                                ],
                              },
                            },
                            required: ["index", "tag"],
                          },
                        },
                      },
                      required: ["classifications"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "classify_captions" } },
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              const { classifications } = JSON.parse(toolCall.function.arguments);
              for (const c of classifications ?? []) {
                const post = insertedPosts[c.index];
                if (post) {
                  await supabase
                    .from("marketing_social_posts")
                    .update({ content_type_tag: c.tag })
                    .eq("id", post.id);
                  classified++;
                }
              }
            }
          } else {
            console.error("AI classification failed:", aiResp.status);
          }
        }
      } catch (err) {
        console.error("Classification error:", err);
      }
    }

    // ── Step 4: Trigger brand analysis (fire-and-forget) ──
    try {
      const analyzeUrl = `${supabaseUrl}/functions/v1/marketing-analyze-brand`;
      fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ triggered_by: "instagram_onboarding", location_id: locationId }),
      }).catch((e) => console.error("Brand analysis trigger failed:", e));
    } catch (e) {
      console.error("Brand analysis trigger error:", e);
    }

    return new Response(
      JSON.stringify({ imported, insights_fetched: insightsFetched, classified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractHashtags(caption: string | null): string[] {
  if (!caption) return [];
  const matches = caption.match(/#(\w+)/g);
  return matches ? matches.map((h) => h.replace("#", "")) : [];
}
