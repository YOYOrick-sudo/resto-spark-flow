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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { type } = body;

    const { data: employee } = await supabase
      .from("employees")
      .select("location_id")
      .eq("user_id", user.id)
      .single();
    if (!employee) throw new Error("No location found for user");
    const locationId = employee.location_id;

    const [brandKitRes, locationRes, intelligenceRes] = await Promise.all([
      supabase.from("marketing_brand_kit").select("*").eq("location_id", locationId).maybeSingle(),
      supabase.from("locations").select("name, slug, timezone").eq("id", locationId).single(),
      supabase.from("marketing_brand_intelligence").select("*").eq("location_id", locationId).maybeSingle(),
    ]);
    const brandKit = brandKitRes.data;
    const location = locationRes.data;
    const intelligence = intelligenceRes.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (type === "social") {
      const result = await generateSocialContent(body, brandKit, location, intelligence, LOVABLE_API_KEY);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "email") {
      const result = await generateEmailContent(body, brandKit, location, LOVABLE_API_KEY);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid type: must be 'social' or 'email'");
  } catch (e) {
    console.error("marketing-generate-content error:", e);
    const status = e instanceof Error && e.message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface BrandKit {
  tone_of_voice: string | null;
  tone_description: string | null;
  social_handles: Record<string, string> | null;
  primary_color: string | null;
}

interface Location {
  name: string;
  slug: string;
  timezone: string;
}

interface BrandIntelligence {
  caption_style_profile: string | null;
  visual_style_profile: string | null;
  content_type_performance: Record<string, any> | null;
  optimal_post_times: any[] | null;
  top_hashtag_sets: any[] | null;
  learning_stage: string | null;
}

async function callAI(messages: { role: string; content: string }[], tools: any[], toolChoice: any, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools,
      tool_choice: toolChoice,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw Object.assign(new Error("Te veel verzoeken, probeer het later opnieuw"), { status: 429 });
    }
    if (response.status === 402) {
      throw Object.assign(new Error("AI credits zijn op"), { status: 402 });
    }
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");
  return JSON.parse(toolCall.function.arguments);
}

function buildIntelligenceContext(intelligence: BrandIntelligence | null): { systemExtra: string; userExtra: string } {
  if (!intelligence) return { systemExtra: "", userExtra: "" };

  let systemExtra = "";
  let userExtra = "";

  if (intelligence.caption_style_profile) {
    systemExtra += `\n\nSchrijfstijlprofiel (schrijf in EXACT deze stijl):\n${intelligence.caption_style_profile}`;
  }

  if (intelligence.visual_style_profile) {
    systemExtra += `\n\nVisuele stijl hint (voor foto-gerelateerde suggesties):\n${intelligence.visual_style_profile}`;
    systemExtra += `\n\nGeef ook een concrete foto-tip (1 zin) die past bij de visuele stijl van dit restaurant.`;
  }

  const baseline = intelligence.engagement_baseline as Record<string, any> | null;
  if (baseline && baseline.avg_reach) {
    userExtra += `\nVerwachte performance baseline: gem. bereik ${baseline.avg_reach}, gem. engagement ${baseline.avg_engagement ?? 0}`;
  }

  if (intelligence.learning_stage && intelligence.learning_stage !== "onboarding") {
    systemExtra += `\n\nDit restaurant heeft voldoende data (stage: ${intelligence.learning_stage}). Gebruik de beschikbare performance data en stijlprofielen voor gepersonaliseerde suggesties.`;
  }

  if (intelligence.content_type_performance && Object.keys(intelligence.content_type_performance).length > 0) {
    const sorted = Object.entries(intelligence.content_type_performance)
      .sort((a: any, b: any) => (b[1].avg_engagement ?? 0) - (a[1].avg_engagement ?? 0))
      .slice(0, 3)
      .map(([type, perf]: [string, any]) => `${type} (gem. engagement: ${perf.avg_engagement})`)
      .join(", ");
    userExtra += `\nBest presterende content types: ${sorted}`;
  }

  if (intelligence.top_hashtag_sets && intelligence.top_hashtag_sets.length > 0) {
    const topTags = intelligence.top_hashtag_sets.slice(0, 10).map((h: any) => h.hashtag).join(", ");
    userExtra += `\nBest presterende hashtags: ${topTags}`;
  }

  return { systemExtra, userExtra };
}

async function generateSocialContent(
  body: { context?: string; platforms?: string[]; content_type_tag?: string; ab_test?: boolean },
  brandKit: BrandKit | null,
  location: Location | null,
  intelligence: BrandIntelligence | null,
  apiKey: string
) {
  const platforms = body.platforms ?? ["instagram"];
  const abTest = body.ab_test === true;
  const tone = brandKit?.tone_of_voice ?? "professioneel en gastvrij";
  const toneDesc = brandKit?.tone_description ?? "";
  const restaurantName = location?.name ?? "het restaurant";

  const platformInstructions = platforms.map((p) => {
    if (p === "instagram") {
      return `Instagram: Schrijf een korte caption (max 150 woorden). Visueel beschrijvend, geef sfeer weer. Gebruik 8-12 hashtags (mix van breed en niche). Emoji's passend bij de tone of voice. GEEN links — Instagram caption links werken niet.`;
    }
    if (p === "facebook") {
      return `Facebook: Schrijf een langere post met context en storytelling. GEEN hashtags. Voeg "[RESERVEER_LINK]" toe als placeholder voor de reserveringslink. Sluit af met een vraag of CTA.`;
    }
    if (p === "google_business") {
      return `Google Business: Zakelijk en to-the-point. Focus op het aanbod of de actie. Sterke CTA (bijv. "Reserveer nu", "Bezoek ons"). Vermeld openingstijden als relevant.`;
    }
    return "";
  }).join("\n\n");

  const { systemExtra, userExtra } = buildIntelligenceContext(intelligence);

  const abTestInstruction = abTest
    ? `\n\nGENEREER TWEE VARIANTEN:
- Variant A: Gebruik de huidige stijl en aanpak.
- Variant B: Gebruik een alternatieve aanpak — andere openingszin, andere CTA, andere invalshoek. Hashtags mogen ook variëren.
Beide varianten moeten over hetzelfde onderwerp gaan, maar op een duidelijk andere manier geschreven zijn.`
    : "";

  const systemPrompt = `Je bent een social media copywriter voor ${restaurantName}, een horecabedrijf.

Tone of voice: ${tone}${toneDesc ? ` — ${toneDesc}` : ""}

Per platform schrijf je een unieke, op maat gemaakte caption. Niet dezelfde tekst kopiëren.

${platformInstructions}

Geef ook 10 relevante hashtag suggesties (zonder #) en een optimale publicatietijd en dag.${systemExtra}${abTestInstruction}`;

  let userPrompt = body.context
    ? `Onderwerp: ${body.context}${body.content_type_tag ? `\nContent type: ${body.content_type_tag}` : ""}`
    : `Schrijf een social media post voor ${restaurantName}.${body.content_type_tag ? `\nContent type: ${body.content_type_tag}` : ""}`;
  userPrompt += userExtra;

  const platformProperties: Record<string, any> = {};
  if (platforms.includes("instagram")) {
    platformProperties.instagram = {
      type: "object",
      properties: {
        caption: { type: "string" },
        hashtags: { type: "array", items: { type: "string" } },
      },
      required: ["caption", "hashtags"],
    };
  }
  if (platforms.includes("facebook")) {
    platformProperties.facebook = {
      type: "object",
      properties: { caption: { type: "string" } },
      required: ["caption"],
    };
  }
  if (platforms.includes("google_business")) {
    platformProperties.google_business = {
      type: "object",
      properties: { caption: { type: "string" } },
      required: ["caption"],
    };
  }

  let timeDescription = "Optimal posting time, e.g. 18:00";
  let dayDescription = "Optimal posting day in Dutch, e.g. donderdag";
  if (intelligence?.optimal_post_times && intelligence.optimal_post_times.length > 0) {
    const best = intelligence.optimal_post_times[0];
    const dayNames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    timeDescription = `Optimal posting time based on data. Best slot: ${String(best.hour).padStart(2, "0")}:00 on ${dayNames[best.day]}`;
    dayDescription = `Optimal posting day based on data. Best day: ${dayNames[best.day]}`;
  }

  if (abTest) {
    // A/B test mode: return variants.a and variants.b
    const variantSchema = {
      type: "object",
      properties: {
        platforms: { type: "object", properties: platformProperties, required: Object.keys(platformProperties) },
      },
      required: ["platforms"],
    };

    const tools = [
      {
        type: "function",
        function: {
          name: "return_social_content",
          description: "Return generated social media content with two A/B test variants",
          parameters: {
            type: "object",
            properties: {
              variants: {
                type: "object",
                properties: {
                  a: variantSchema,
                  b: variantSchema,
                },
                required: ["a", "b"],
              },
              suggested_hashtags: { type: "array", items: { type: "string" }, description: "10 suggested hashtags without #" },
              suggested_time: { type: "string", description: timeDescription },
              suggested_day: { type: "string", description: dayDescription },
            },
            required: ["variants", "suggested_hashtags"],
            additionalProperties: false,
          },
        },
      },
    ];

    return await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      { type: "function", function: { name: "return_social_content" } },
      apiKey
    );
  }

  // Normal mode (no A/B)
  const tools = [
    {
      type: "function",
      function: {
        name: "return_social_content",
        description: "Return generated social media content per platform",
        parameters: {
          type: "object",
          properties: {
            platforms: { type: "object", properties: platformProperties, required: Object.keys(platformProperties) },
            suggested_hashtags: { type: "array", items: { type: "string" }, description: "10 suggested hashtags without #" },
            suggested_time: { type: "string", description: timeDescription },
            suggested_day: { type: "string", description: dayDescription },
            photo_suggestion: { type: "string", description: "Concrete foto-tip in 1 zin, passend bij de visuele stijl" },
            content_type: { type: "string", description: "Aanbevolen content type: food_shot, behind_the_scenes, team, ambiance, seasonal, promo, event, user_generated" },
          },
          required: ["platforms", "suggested_hashtags"],
          additionalProperties: false,
        },
      },
    },
  ];

  return await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools,
    { type: "function", function: { name: "return_social_content" } },
    apiKey
  );
}

async function generateEmailContent(
  body: { email_body?: string; instruction?: string },
  brandKit: BrandKit | null,
  location: Location | null,
  apiKey: string
) {
  const tone = brandKit?.tone_of_voice ?? "professioneel en gastvrij";
  const restaurantName = location?.name ?? "het restaurant";

  const systemPrompt = `Je bent een e-mail copywriter voor ${restaurantName}.
Tone of voice: ${tone}
Pas de gegeven e-mailtekst aan volgens de instructie van de gebruiker. Geef alleen de aangepaste tekst terug, geen uitleg.`;

  const userPrompt = `Huidige tekst:\n${body.email_body ?? "(leeg)"}\n\nInstructie: ${body.instruction ?? "Verbeter de tekst"}`;

  const tools = [
    {
      type: "function",
      function: {
        name: "return_email_content",
        description: "Return the updated email body text",
        parameters: {
          type: "object",
          properties: {
            updated_body: { type: "string", description: "The adjusted email body text" },
          },
          required: ["updated_body"],
          additionalProperties: false,
        },
      },
    },
  ];

  return await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools,
    { type: "function", function: { name: "return_email_content" } },
    apiKey
  );
}
