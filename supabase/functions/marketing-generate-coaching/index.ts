import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Accept location_ids from request body (triggered by analyze-brand) or process all
    let locationIds: string[] = [];
    try {
      const body = await req.json();
      if (body?.location_ids?.length) locationIds = body.location_ids;
    } catch { /* empty body is fine */ }

    if (locationIds.length === 0) {
      const { data } = await supabase
        .from("marketing_brand_intelligence")
        .select("location_id")
        .limit(500);
      locationIds = (data ?? []).map((r: any) => r.location_id);
    }

    if (locationIds.length === 0) {
      return new Response(JSON.stringify({ message: "No locations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, string> = {};
    for (const locId of locationIds) {
      try {
        await generateCoachingForLocation(supabase, locId, LOVABLE_API_KEY);
        results[locId] = "ok";
      } catch (e) {
        console.error(`Coaching error for ${locId}:`, e);
        results[locId] = "error";
      }
    }

    return new Response(JSON.stringify({ processed: locationIds.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-generate-coaching error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface CandidateTip {
  tip_type: string;
  title: string;
  description: string;
  priority: number;
}

async function generateCoachingForLocation(supabase: any, locationId: string, apiKey: string | undefined) {
  // Load brand intelligence
  const { data: intel } = await supabase
    .from("marketing_brand_intelligence")
    .select("engagement_baseline, content_type_performance, optimal_post_times, posts_analyzed, learning_stage")
    .eq("location_id", locationId)
    .single();

  if (!intel || intel.learning_stage === "onboarding") return;

  // Load posts from last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const { data: recentPosts } = await supabase
    .from("marketing_social_posts")
    .select("content_type_tag, published_at, scheduled_at, analytics, status")
    .eq("location_id", locationId)
    .in("status", ["published", "imported"])
    .gte("published_at", twoWeeksAgo.toISOString())
    .order("published_at", { ascending: false })
    .limit(100);

  const posts = recentPosts ?? [];
  const baseline = intel.engagement_baseline as any;
  const avgEngagement = baseline?.avg_engagement ?? 0;
  const candidates: CandidateTip[] = [];

  // Rule 1: Engagement record
  if (avgEngagement > 0) {
    const record = posts.find((p: any) => {
      const eng = Number(p.analytics?.engagement ?? 0);
      return eng > avgEngagement * 2;
    });
    if (record) {
      const date = record.published_at
        ? new Date(record.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })
        : "recent";
      candidates.push({
        tip_type: "growth",
        title: "Nieuwe record!",
        description: `Je post van ${date} is je best presterende ooit. Maak meer van dit type!`,
        priority: 9,
      });
    }
  }

  // Rule 2: Engagement dropping (average of last 2 weeks < 0.7x baseline)
  if (avgEngagement > 0 && posts.length >= 3) {
    const recentAvg =
      posts.reduce((sum: number, p: any) => sum + Number(p.analytics?.engagement ?? 0), 0) / posts.length;
    if (recentAvg < avgEngagement * 0.7) {
      candidates.push({
        tip_type: "warning",
        title: "Bereik is wat gedaald",
        description: "Wissel content types af en probeer op je beste tijden te posten.",
        priority: 8,
      });
    }
  }

  // Rule 3: Best content type stands out
  const perf = intel.content_type_performance as Record<string, any> | null;
  if (perf) {
    const entries = Object.entries(perf).filter(([, v]) => (v as any).count >= 2);
    if (entries.length >= 2) {
      const sorted = entries.sort((a, b) => ((b[1] as any).avg_engagement ?? 0) - ((a[1] as any).avg_engagement ?? 0));
      const best = sorted[0];
      const secondBest = sorted[1];
      if ((best[1] as any).avg_engagement > (secondBest[1] as any).avg_engagement * 2) {
        const typeLabel = formatContentType(best[0]);
        candidates.push({
          tip_type: "performance",
          title: `${typeLabel} werkt goed`,
          description: `Je ${typeLabel.toLowerCase()} posts scoren het best. Probeer er 2 per week!`,
          priority: 7,
        });
      }
    }
  }

  // Rule 4: Timing mismatch
  const optTimes = intel.optimal_post_times as any[] | null;
  if (optTimes?.length && posts.length >= 3) {
    const optDays = new Set(optTimes.slice(0, 3).map((t: any) => t.day));
    const onOptimal = posts.filter((p: any) => {
      if (!p.published_at) return false;
      return optDays.has(new Date(p.published_at).getUTCDay());
    }).length;
    if (onOptimal < posts.length * 0.5) {
      const DAY_NAMES = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
      const bestDay = DAY_NAMES[optTimes[0].day] ?? "";
      candidates.push({
        tip_type: "timing",
        title: `${bestDay.charAt(0).toUpperCase() + bestDay.slice(1)} is je sterkste dag`,
        description: `Post vaker op ${bestDay} voor meer bereik.`,
        priority: 6,
      });
    }
  }

  // Rule 5: Low posting frequency
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const lastWeekPosts = posts.filter(
    (p: any) => p.published_at && new Date(p.published_at) >= oneWeekAgo
  ).length;
  if (lastWeekPosts < 2) {
    candidates.push({
      tip_type: "content_mix",
      title: "Consistent posten helpt",
      description: "Probeer minimaal 2x per week te posten. Gebruik de weekplan functie!",
      priority: 5,
    });
  }

  // Take top 3
  candidates.sort((a, b) => b.priority - a.priority);
  const top3 = candidates.slice(0, 3);

  if (top3.length === 0) return;

  // Optionally refine wording with AI
  let finalTips = top3;
  if (apiKey && top3.length > 0) {
    try {
      finalTips = await refineTipsWithAI(top3, apiKey);
    } catch (e) {
      console.error("AI tip refinement failed, using raw tips:", e);
    }
  }

  // Delete old active tips, insert new
  await supabase
    .from("marketing_coaching_tips")
    .delete()
    .eq("location_id", locationId)
    .eq("status", "active");

  const inserts = finalTips.map((t) => ({
    location_id: locationId,
    tip_type: t.tip_type,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: "active",
  }));

  const { error } = await supabase.from("marketing_coaching_tips").insert(inserts);
  if (error) {
    console.error(`Coaching insert failed for ${locationId}:`, error);
    throw error;
  }

  console.log(`Coaching: ${inserts.length} tips generated for ${locationId}`);
}

function formatContentType(type: string): string {
  const map: Record<string, string> = {
    food_shot: "Food foto",
    behind_the_scenes: "Behind-the-scenes",
    team: "Team",
    ambiance: "Sfeer",
    seasonal: "Seizoen",
    promo: "Promotie",
    event: "Event",
    user_generated: "Gast content",
  };
  return map[type] ?? type;
}

async function refineTipsWithAI(tips: CandidateTip[], apiKey: string): Promise<CandidateTip[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Je bent een vriendelijke social media coach voor een restaurant.
Herschrijf de volgende tips in positieve, niet-technische taal.
Gebruik GEEN termen als: engagement rate, impressions, reach, conversie.
Max 2 zinnen per tip. Behoud de tip_type en priority exact.`,
        },
        {
          role: "user",
          content: JSON.stringify(tips),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_tips",
            description: "Return the refined coaching tips",
            parameters: {
              type: "object",
              properties: {
                tips: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tip_type: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "number" },
                    },
                    required: ["tip_type", "title", "description", "priority"],
                  },
                },
              },
              required: ["tips"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_tips" } },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call");
  const result = JSON.parse(toolCall.function.arguments);
  return result.tips ?? tips;
}
