import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAY_NAMES = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

// Nederlandse feestdagen 2026
const DUTCH_HOLIDAYS_2026: Record<string, string> = {
  "2026-01-01": "Nieuwjaarsdag",
  "2026-04-03": "Goede Vrijdag",
  "2026-04-05": "Eerste Paasdag",
  "2026-04-06": "Tweede Paasdag",
  "2026-04-27": "Koningsdag",
  "2026-05-05": "Bevrijdingsdag",
  "2026-05-14": "Hemelvaartsdag",
  "2026-05-24": "Eerste Pinksterdag",
  "2026-05-25": "Tweede Pinksterdag",
  "2026-12-25": "Eerste Kerstdag",
  "2026-12-26": "Tweede Kerstdag",
  "2026-12-31": "Oudejaarsavond",
};

function getSeason(date: Date): string {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "lente";
  if (m >= 5 && m <= 7) return "zomer";
  if (m >= 8 && m <= 10) return "herfst";
  return "winter";
}

function getWeekDates(from: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get all locations with brand intelligence
    const { data: intelligenceRows } = await supabase
      .from("marketing_brand_intelligence")
      .select("location_id, optimal_post_times, content_type_performance, caption_style_profile, visual_style_profile, learning_stage, top_hashtag_sets")
      .limit(500);

    if (!intelligenceRows || intelligenceRows.length === 0) {
      return new Response(JSON.stringify({ message: "No locations with brand intelligence" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiAvailable = true;
    const results: Record<string, string> = {};

    for (const intel of intelligenceRows) {
      if (!aiAvailable) {
        results[intel.location_id] = "skipped_rate_limit";
        continue;
      }
      try {
        await generateWeekplanForLocation(supabase, intel, LOVABLE_API_KEY);
        results[intel.location_id] = "ok";
      } catch (e: any) {
        if (e?.status === 429) {
          aiAvailable = false;
          results[intel.location_id] = "rate_limited";
        } else {
          console.error(`Weekplan error for ${intel.location_id}:`, e);
          results[intel.location_id] = "error";
        }
      }

      // Popup suggestion (non-blocking, separate try/catch)
      if (aiAvailable) {
        try {
          await generatePopupSuggestion(supabase, intel.location_id, intel, LOVABLE_API_KEY);
        } catch (e: any) {
          if (e?.status === 429) aiAvailable = false;
          else console.error(`Popup suggestion error for ${intel.location_id}:`, e);
        }
      }
    }

    return new Response(JSON.stringify({ processed: intelligenceRows.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-generate-weekplan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateWeekplanForLocation(supabase: any, intel: any, apiKey: string) {
  const locationId = intel.location_id;

  // Load location name
  const { data: location } = await supabase
    .from("locations")
    .select("name")
    .eq("id", locationId)
    .single();

  // Load recent posts (avoid repetition)
  const { data: recentPosts } = await supabase
    .from("marketing_social_posts")
    .select("content_text, content_type_tag, scheduled_at, published_at")
    .eq("location_id", locationId)
    .in("status", ["published", "scheduled", "imported"])
    .order("scheduled_at", { ascending: false })
    .limit(10);

  // Load cross-module events
  const { data: events } = await supabase
    .from("cross_module_events")
    .select("event_type, payload, source_module")
    .eq("location_id", locationId)
    .gt("expires_at", new Date().toISOString())
    .limit(10);

  // Calendar context
  const now = new Date();
  // Next Monday
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  const weekDates = getWeekDates(nextMonday);
  const weekStart = weekDates[0];
  const season = getSeason(nextMonday);

  const holidays = weekDates
    .filter((d) => DUTCH_HOLIDAYS_2026[d])
    .map((d) => `${DUTCH_HOLIDAYS_2026[d]} (${d})`);

  // Build prompts
  const isOnboarding = intel.learning_stage === "onboarding";

  let systemPrompt = `Je bent een social media planner voor een horecabedrijf.
Genereer een weekplan met 3-5 posts voor de komende week.

Per post geef je:
- day: dag van de week (maandag t/m zondag)
- time: optimale posttijd (HH:MM)
- platform: instagram, facebook, of google_business
- content_type: food_shot, behind_the_scenes, team, ambiance, seasonal, promo, event, user_generated
- caption: concept caption (max 2 zinnen)
- hashtags: 5-8 hashtags (zonder #)
- photo_suggestion: concrete foto-tip (1 zin)

Regels:
- Wissel content types af (niet 2x hetzelfde type achter elkaar)
- Focus op best presterende types maar varieer
- Gebruik de optimale posttijden als beschikbaar
- Vermijd herhaling van recente posts`;

  if (!isOnboarding) {
    if (intel.caption_style_profile) {
      systemPrompt += `\n\nSchrijfstijlprofiel (schrijf in EXACT deze stijl):\n${intel.caption_style_profile}`;
    }
    if (intel.visual_style_profile) {
      systemPrompt += `\n\nVisuele stijl (voor foto-suggesties):\n${intel.visual_style_profile}`;
    }
  }

  // User prompt
  const recentSummary = (recentPosts ?? [])
    .slice(0, 5)
    .map((p: any) => `[${p.content_type_tag ?? "?"}] ${(p.content_text ?? "").slice(0, 60)}`)
    .join("\n");

  const eventsSummary = (events ?? [])
    .map((e: any) => {
      const payload = typeof e.payload === "object" ? JSON.stringify(e.payload) : String(e.payload);
      return `${e.event_type}: ${payload.slice(0, 80)}`;
    })
    .join("\n");

  // Top content types
  let topTypes = "";
  if (!isOnboarding && intel.content_type_performance) {
    const sorted = Object.entries(intel.content_type_performance)
      .sort((a: any, b: any) => (b[1].avg_engagement ?? 0) - (a[1].avg_engagement ?? 0))
      .slice(0, 3)
      .map(([type]: [string, any]) => type);
    topTypes = sorted.join(", ");
  }

  // Optimal times
  let timesStr = "niet beschikbaar (gebruik best practices: di-do 11:00-12:00, vr 17:00-18:00)";
  if (!isOnboarding && intel.optimal_post_times?.length > 0) {
    timesStr = intel.optimal_post_times
      .slice(0, 3)
      .map((t: any) => `${DAY_NAMES[t.day]} ${String(t.hour).padStart(2, "0")}:00`)
      .join(", ");
  }

  const userPrompt = `Restaurant: ${location?.name ?? "onbekend"}
Learning stage: ${intel.learning_stage}
${topTypes ? `Best presterende content types: ${topTypes}` : ""}
Optimale posttijden: ${timesStr}
${recentSummary ? `Recente posts (vermijd herhaling):\n${recentSummary}` : ""}
${eventsSummary ? `Cross-module events:\n${eventsSummary}` : ""}
Kalender: Week van ${weekStart}, seizoen: ${season}, feestdagen: ${holidays.length > 0 ? holidays.join(", ") : "geen"}`;

  const tools = [
    {
      type: "function",
      function: {
        name: "return_weekplan",
        description: "Return the generated weekplan with 3-5 posts",
        parameters: {
          type: "object",
          properties: {
            posts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string", description: "Dag van de week in het Nederlands" },
                  time: { type: "string", description: "Posttijd in HH:MM formaat" },
                  platform: { type: "string", enum: ["instagram", "facebook", "google_business"] },
                  content_type: { type: "string", enum: ["food_shot", "behind_the_scenes", "team", "ambiance", "seasonal", "promo", "event", "user_generated"] },
                  caption: { type: "string", description: "Concept caption, max 2 zinnen" },
                  hashtags: { type: "array", items: { type: "string" } },
                  photo_suggestion: { type: "string", description: "Concrete foto-tip in 1 zin" },
                },
                required: ["day", "time", "platform", "content_type", "caption", "hashtags", "photo_suggestion"],
              },
            },
          },
          required: ["posts"],
          additionalProperties: false,
        },
      },
    },
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_weekplan" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 });
    const text = await response.text();
    console.error("AI weekplan error:", response.status, text);
    throw new Error("AI error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");

  const result = JSON.parse(toolCall.function.arguments);

  // Store weekplan
  const weekplan = {
    generated_at: new Date().toISOString(),
    week_start: weekStart,
    posts: result.posts ?? [],
  };

  const { error } = await supabase
    .from("marketing_brand_intelligence")
    .update({ current_weekplan: weekplan, updated_at: new Date().toISOString() })
    .eq("location_id", locationId);

  if (error) {
    console.error(`Weekplan update failed for ${locationId}:`, error);
    throw error;
}

// ============================================
// POPUP SUGGESTION GENERATION
// ============================================

async function generatePopupSuggestion(supabase: any, locationId: string, intel: any, apiKey: string) {
  // Check if popup config exists
  const { data: popupConfig } = await supabase
    .from("marketing_popup_config")
    .select("is_active, popup_type, headline, description")
    .eq("location_id", locationId)
    .maybeSingle();

  if (!popupConfig) return; // No popup configured, skip

  // Get last 5 suggestions for learning context
  const { data: previousSuggestions } = await supabase
    .from("marketing_popup_suggestions")
    .select("headline, popup_type, status, dismiss_reason")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Frequency check: if 3+ of last 5 dismissed, skip unless holiday
  const prev = previousSuggestions ?? [];
  const dismissedCount = prev.filter((s: any) => s.status === "dismissed").length;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  const weekDates = getWeekDates(nextMonday);
  const holidays = weekDates.filter((d) => DUTCH_HOLIDAYS_2026[d]);

  if (dismissedCount >= 3 && holidays.length === 0) {
    console.log(`Popup suggestion skipped for ${locationId}: too many dismissals`);
    return;
  }

  // Get active tickets
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, name, short_description, color")
    .eq("location_id", locationId)
    .eq("status", "active")
    .limit(10);

  // Get location name
  const { data: location } = await supabase
    .from("locations")
    .select("name")
    .eq("id", locationId)
    .single();

  const season = getSeason(nextMonday);

  // Build learning context
  let learningContext = "";
  if (prev.length > 0) {
    learningContext = "Eerdere popup suggesties en resultaat:\n" +
      prev.map((s: any, i: number) => {
        const statusLabel = s.status === "accepted" ? "GEACCEPTEERD" : s.status === "dismissed" ? `AFGEWEZEN: ${s.dismiss_reason || "geen reden"}` : "PENDING";
        return `${i + 1}. "${s.headline}" (${s.popup_type}) → ${statusLabel}`;
      }).join("\n");

    const acceptedCount = prev.filter((s: any) => s.status === "accepted").length;
    learningContext += `\n\nPatronen: ${acceptedCount}/${prev.length} geaccepteerd.`;
    if (dismissedCount >= 2) {
      learningContext += " Operator wijst regelmatig suggesties af — wees selectiever en relevanter.";
    }
  }

  const ticketList = (tickets ?? []).map((t: any) => `- ${t.name}: ${t.short_description || "geen beschrijving"} (id: ${t.id})`).join("\n");
  const holidayList = holidays.map((d) => `${DUTCH_HOLIDAYS_2026[d]} (${d})`).join(", ");

  const systemPrompt = `Je bent een marketing assistent voor een horecabedrijf.
Genereer EEN popup-suggestie voor de komende week. De popup verschijnt op de website van het restaurant.

Kies het beste type:
- reservation: koppel aan een ticket/evenement, CTA is "Reserveer"
- newsletter: nieuwsbrief aanmelding, gebruik bij rustige weken zonder events
- custom: vrije link, gebruik voor speciale pagina's of externe acties

Regels:
- Headline: max 60 tekens, pakkend en specifiek
- Description: max 120 tekens, concreet en uitnodigend
- Als je type "reservation" kiest, geef een featured_ticket_id uit de beschikbare tickets
- Reasoning: leg kort uit WAAROM dit de beste keuze is (max 2 zinnen)
- Vermijd herhaling van eerdere suggesties
${intel.caption_style_profile ? `\nSchrijfstijl: ${intel.caption_style_profile}` : ""}`;

  const userPrompt = `Restaurant: ${location?.name ?? "onbekend"}
Seizoen: ${season}
Feestdagen komende week: ${holidayList || "geen"}
Huidige popup: type=${popupConfig.popup_type}, headline="${popupConfig.headline}"

Beschikbare tickets:
${ticketList || "Geen actieve tickets"}

${learningContext}`;

  const tools = [{
    type: "function",
    function: {
      name: "return_popup_suggestion",
      description: "Return a single popup suggestion",
      parameters: {
        type: "object",
        properties: {
          popup_type: { type: "string", enum: ["reservation", "newsletter", "custom"] },
          headline: { type: "string", description: "Headline, max 60 tekens" },
          description: { type: "string", description: "Description, max 120 tekens" },
          featured_ticket_id: { type: "string", description: "UUID van het ticket (alleen bij reservation type)" },
          button_text: { type: "string", description: "Knoptekst" },
          custom_button_url: { type: "string", description: "URL (alleen bij custom type)" },
          reasoning: { type: "string", description: "Waarom dit de beste keuze is, max 2 zinnen" },
        },
        required: ["popup_type", "headline", "description", "reasoning"],
        additionalProperties: false,
      },
    },
  }];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_popup_suggestion" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 });
    console.error("AI popup suggestion error:", response.status, await response.text());
    return;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    console.error("No tool call in popup suggestion response");
    return;
  }

  const result = JSON.parse(toolCall.function.arguments);

  // Auto-dismiss old pending suggestions
  await supabase
    .from("marketing_popup_suggestions")
    .update({ status: "dismissed", dismiss_reason: "Vervangen door nieuwe suggestie", responded_at: new Date().toISOString() })
    .eq("location_id", locationId)
    .eq("status", "pending");

  // Insert new suggestion
  const { error } = await supabase
    .from("marketing_popup_suggestions")
    .insert({
      location_id: locationId,
      popup_type: result.popup_type,
      headline: result.headline,
      description: result.description,
      featured_ticket_id: result.featured_ticket_id || null,
      custom_button_url: result.custom_button_url || null,
      button_text: result.button_text || null,
      reasoning: result.reasoning,
    });

  if (error) {
    console.error(`Popup suggestion insert failed for ${locationId}:`, error);
  } else {
    console.log(`Popup suggestion generated for ${locationId}: "${result.headline}"`);
  }
}

  console.log(`Weekplan generated for ${locationId}: ${(result.posts ?? []).length} posts`);
}
