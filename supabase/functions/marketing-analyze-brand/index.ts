import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find all locations with at least 1 published/imported post
    const { data: locations } = await supabase
      .from("marketing_social_posts")
      .select("location_id")
      .in("status", ["published", "imported"])
      .limit(1000);

    const uniqueLocationIds = [...new Set((locations ?? []).map((p: any) => p.location_id))];
    if (uniqueLocationIds.length === 0) {
      return new Response(JSON.stringify({ message: "No locations with posts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiAvailable = !!LOVABLE_API_KEY;
    const results: Record<string, string> = {};

    for (const locationId of uniqueLocationIds) {
      try {
        const result = await analyzeLocation(supabase, locationId as string, LOVABLE_API_KEY, aiAvailable);
        results[locationId as string] = result;
        if (result === "rate_limited") aiAvailable = false;
      } catch (e) {
        console.error(`Error analyzing location ${locationId}:`, e);
        results[locationId as string] = "error";
      }
    }

    // Trigger coaching generation (fire-and-forget)
    const successLocations = Object.entries(results).filter(([, v]) => v === "ok").map(([k]) => k);
    if (successLocations.length > 0) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/marketing-generate-coaching`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ location_ids: successLocations }),
      }).catch((e) => console.error("Failed to trigger coaching:", e));
    }

    return new Response(JSON.stringify({ analyzed: uniqueLocationIds.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-analyze-brand error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeLocation(
  supabase: any,
  locationId: string,
  apiKey: string | undefined,
  aiAvailable: boolean
): Promise<string> {
  // Fetch all published/imported posts with analytics for this location
  const { data: posts } = await supabase
    .from("marketing_social_posts")
    .select("content_type_tag, published_at, analytics, hashtags, content_text, media_urls")
    .eq("location_id", locationId)
    .in("status", ["published", "imported"])
    .order("published_at", { ascending: false })
    .limit(500);

  const allPosts = posts ?? [];
  const postsWithAnalytics = allPosts.filter((p: any) => p.analytics && Object.keys(p.analytics).length > 0);

  // --- Layer 0: SQL analysis ---

  // a. content_type_performance
  const typeMap: Record<string, { count: number; totalReach: number; totalEngagement: number; totalImpressions: number }> = {};
  for (const p of postsWithAnalytics) {
    const tag = p.content_type_tag || "unknown";
    if (!typeMap[tag]) typeMap[tag] = { count: 0, totalReach: 0, totalEngagement: 0, totalImpressions: 0 };
    typeMap[tag].count++;
    typeMap[tag].totalReach += Number(p.analytics?.reach ?? 0);
    typeMap[tag].totalEngagement += Number(p.analytics?.engagement ?? 0);
    typeMap[tag].totalImpressions += Number(p.analytics?.impressions ?? 0);
  }
  const contentTypePerformance: Record<string, any> = {};
  for (const [tag, v] of Object.entries(typeMap)) {
    contentTypePerformance[tag] = {
      count: v.count,
      avg_reach: Math.round(v.totalReach / v.count),
      avg_engagement: Math.round(v.totalEngagement / v.count),
      avg_impressions: Math.round(v.totalImpressions / v.count),
    };
  }

  // b. optimal_post_times
  const timeMap: Record<string, { count: number; totalEngagement: number }> = {};
  for (const p of postsWithAnalytics) {
    if (!p.published_at) continue;
    const d = new Date(p.published_at);
    const key = `${d.getUTCDay()}-${d.getUTCHours()}`;
    if (!timeMap[key]) timeMap[key] = { count: 0, totalEngagement: 0 };
    timeMap[key].count++;
    timeMap[key].totalEngagement += Number(p.analytics?.engagement ?? 0);
  }
  const optimalPostTimes = Object.entries(timeMap)
    .map(([key, v]) => {
      const [day, hour] = key.split("-").map(Number);
      return { day, hour, avg_engagement: Math.round(v.totalEngagement / v.count) };
    })
    .sort((a, b) => b.avg_engagement - a.avg_engagement)
    .slice(0, 5);

  // c. top_hashtag_sets
  const hashMap: Record<string, { count: number; totalEngagement: number }> = {};
  for (const p of postsWithAnalytics) {
    const engagement = Number(p.analytics?.engagement ?? 0);
    for (const h of (p.hashtags ?? [])) {
      const tag = h.toLowerCase().replace(/^#/, "");
      if (!tag) continue;
      if (!hashMap[tag]) hashMap[tag] = { count: 0, totalEngagement: 0 };
      hashMap[tag].count++;
      hashMap[tag].totalEngagement += engagement;
    }
  }
  const topHashtagSets = Object.entries(hashMap)
    .map(([hashtag, v]) => ({ hashtag, count: v.count, avg_engagement: Math.round(v.totalEngagement / v.count) }))
    .sort((a, b) => b.avg_engagement - a.avg_engagement)
    .slice(0, 15);

  // d. engagement_baseline
  const totalPosts = postsWithAnalytics.length;
  let totalReach = 0, totalEngagement = 0, totalImpressions = 0;
  for (const p of postsWithAnalytics) {
    totalReach += Number(p.analytics?.reach ?? 0);
    totalEngagement += Number(p.analytics?.engagement ?? 0);
    totalImpressions += Number(p.analytics?.impressions ?? 0);
  }
  const engagementBaseline = totalPosts > 0
    ? {
        avg_reach: Math.round(totalReach / totalPosts),
        avg_engagement: Math.round(totalEngagement / totalPosts),
        avg_impressions: Math.round(totalImpressions / totalPosts),
        total_posts: totalPosts,
      }
    : { avg_reach: 0, avg_engagement: 0, avg_impressions: 0, total_posts: 0 };

  // e. weekly_best_content_type
  let weeklyBest: string | null = null;
  let bestAvg = 0;
  for (const [tag, perf] of Object.entries(contentTypePerformance)) {
    if (perf.avg_engagement > bestAvg) {
      bestAvg = perf.avg_engagement;
      weeklyBest = tag;
    }
  }

  // f. posts_analyzed
  const postsAnalyzed = allPosts.length;

  // g. learning_stage
  let learningStage = "onboarding";
  if (postsAnalyzed >= 51) learningStage = "mature";
  else if (postsAnalyzed >= 16) learningStage = "optimizing";
  else if (postsAnalyzed >= 1) learningStage = "learning";

  // --- Layer 2: AI analysis ---
  let captionStyleProfile: string | null = null;
  let visualStyleProfile: string | null = null;

  if (aiAvailable && apiKey && postsAnalyzed >= 5) {
    // Caption style
    try {
      const captionPosts = allPosts
        .filter((p: any) => p.content_text)
        .slice(0, 20);
      if (captionPosts.length >= 5) {
        const captions = captionPosts.map((p: any) => p.content_text).join("\n---\n");
        captionStyleProfile = await analyzeCaptionStyle(captions, apiKey);
      }
    } catch (e: any) {
      if (e?.status === 429) return "rate_limited";
      console.error("Caption style analysis failed:", e);
    }

    // Visual style
    try {
      const mediaPosts = allPosts
        .filter((p: any) => p.media_urls && p.media_urls.length > 0)
        .slice(0, 10);
      if (mediaPosts.length >= 5) {
        const imageUrls = mediaPosts.flatMap((p: any) => p.media_urls).slice(0, 10);
        visualStyleProfile = await analyzeVisualStyle(imageUrls, apiKey);
      }
    } catch (e: any) {
      if (e?.status === 429) return "rate_limited";
      console.error("Visual style analysis failed:", e);
    }
  }

  // Upsert result
  const upsertData: any = {
    location_id: locationId,
    content_type_performance: contentTypePerformance,
    optimal_post_times: optimalPostTimes,
    top_hashtag_sets: topHashtagSets,
    engagement_baseline: engagementBaseline,
    weekly_best_content_type: weeklyBest,
    posts_analyzed: postsAnalyzed,
    learning_stage: learningStage,
    last_analysis_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (captionStyleProfile) upsertData.caption_style_profile = captionStyleProfile;
  if (visualStyleProfile) upsertData.visual_style_profile = visualStyleProfile;

  const { error } = await supabase
    .from("marketing_brand_intelligence")
    .upsert(upsertData, { onConflict: "location_id" });

  if (error) {
    console.error(`Upsert failed for location ${locationId}:`, error);
    throw error;
  }

  return "ok";
}

async function analyzeCaptionStyle(captions: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Beschrijf de schrijfstijl van dit restaurant in max 100 woorden:
tone, woordkeuze, emoji gebruik, zinslengte, favoriete uitdrukkingen, CTA stijl.
Dit profiel wordt gebruikt om nieuwe captions in exact dezelfde stijl te genereren.`,
        },
        { role: "user", content: `Hier zijn de recente captions:\n\n${captions}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_caption_style",
            description: "Return the caption style profile",
            parameters: {
              type: "object",
              properties: { style_profile: { type: "string", description: "The writing style profile in max 100 words" } },
              required: ["style_profile"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_caption_style" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 });
    const text = await response.text();
    console.error("AI caption style error:", response.status, text);
    throw new Error("AI error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");
  const args = JSON.parse(toolCall.function.arguments);
  return args.style_profile;
}

async function analyzeVisualStyle(imageUrls: string[], apiKey: string): Promise<string> {
  const contentParts: any[] = [
    { type: "text", text: "Analyseer de visuele stijl van deze restaurant foto's." },
  ];
  for (const url of imageUrls) {
    contentParts.push({ type: "image_url", image_url: { url } });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Beschrijf de visuele stijl in max 80 woorden: kleurpalet, lichtgebruik,
compositie, achtergronden, food styling. Dit wordt intern gebruikt voor foto-suggesties.`,
        },
        { role: "user", content: contentParts },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_visual_style",
            description: "Return the visual style profile",
            parameters: {
              type: "object",
              properties: { style_profile: { type: "string", description: "The visual style profile in max 80 words" } },
              required: ["style_profile"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_visual_style" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 });
    const text = await response.text();
    console.error("AI visual style error:", response.status, text);
    throw new Error("AI error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");
  const args = JSON.parse(toolCall.function.arguments);
  return args.style_profile;
}
