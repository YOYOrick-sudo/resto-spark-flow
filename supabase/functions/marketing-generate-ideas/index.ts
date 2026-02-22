import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Seasonal ingredients per quarter (Dutch)
const SEASONAL_MAP: Record<string, { ingredients: string[]; theme: string }> = {
  "1": { ingredients: ["wintergroenten", "mosselen", "stamppot", "boerenkool"], theme: "winter comfort food" },
  "2": { ingredients: ["asperges", "aardbeien", "hollandse nieuwe", "rabarber"], theme: "lente versheid" },
  "3": { ingredients: ["tomaten", "zomerfruit", "watermeloen", "terras"], theme: "zomer & terras" },
  "4": { ingredients: ["wild", "paddenstoelen", "pompoen", "kerst"], theme: "herfst & feestdagen" },
};

function getQuarter(date: Date): string {
  return String(Math.ceil((date.getMonth() + 1) / 3));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const WEATHER_API_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY");

    // Get all locations
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, google_place_id")
      .eq("is_active", true)
      .limit(500);

    if (!locations?.length) {
      return new Response(JSON.stringify({ message: "No locations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, string> = {};
    for (const loc of locations) {
      try {
        await generateIdeasForLocation(supabase, loc, WEATHER_API_KEY);
        results[loc.id] = "ok";
      } catch (e) {
        console.error(`Ideas error for ${loc.id}:`, e);
        results[loc.id] = "error";
      }
    }

    return new Response(JSON.stringify({ processed: locations.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-generate-ideas error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateIdeasForLocation(supabase: any, location: any, weatherApiKey: string | undefined) {
  const locationId = location.id;
  const today = new Date().toISOString().slice(0, 10);

  // Clean old seasonal/weather ideas that are still 'suggested' (stale)
  await supabase
    .from("marketing_content_ideas")
    .delete()
    .eq("location_id", locationId)
    .in("source", ["seasonal", "weather"])
    .eq("status", "active")
    .lt("created_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

  // Check if we already generated today
  const { data: todayIdeas } = await supabase
    .from("marketing_content_ideas")
    .select("id")
    .eq("location_id", locationId)
    .in("source", ["seasonal", "weather"])
    .gte("created_at", today + "T00:00:00Z")
    .limit(1);

  if (todayIdeas?.length) return; // Already generated today

  const ideas: any[] = [];
  const now = new Date();
  const quarter = getQuarter(now);
  const seasonal = SEASONAL_MAP[quarter];

  // Seasonal ideas (1-2)
  if (seasonal) {
    const randomIngredient = seasonal.ingredients[Math.floor(Math.random() * seasonal.ingredients.length)];
    ideas.push({
      location_id: locationId,
      title: `Seizoenshighlight: ${randomIngredient}`,
      description: `${seasonal.theme} — laat zien wat je met ${randomIngredient} doet!`,
      idea_type: "social_post",
      source: "seasonal",
      priority: 6,
      status: "active",
    });
  }

  // Weather ideas (use location's Google Place ID for geocoding, or fallback to Amsterdam)
  if (weatherApiKey) {
    try {
      const weatherIdea = await getWeatherIdea(weatherApiKey, location);
      if (weatherIdea) {
        ideas.push({
          location_id: locationId,
          title: weatherIdea.title,
          description: weatherIdea.description,
          idea_type: "social_post",
          source: "weather",
          priority: 7,
          status: "active",
        });
      }
    } catch (e) {
      console.error(`Weather fetch failed for ${locationId}:`, e);
    }
  }

  // Cross-module events
  try {
    const { data: events } = await supabase
      .from("cross_module_events")
      .select("id, event_type, payload, consumed_by")
      .eq("location_id", locationId)
      .gt("expires_at", new Date().toISOString())
      .limit(5);

    for (const event of events ?? []) {
      const consumed = event.consumed_by as string[] ?? [];
      if (consumed.includes("marketing-generate-ideas")) continue;

      const idea = eventToIdea(event, locationId);
      if (idea) ideas.push(idea);

      // Mark as consumed
      await supabase
        .from("cross_module_events")
        .update({ consumed_by: [...consumed, "marketing-generate-ideas"] })
        .eq("id", event.id);
    }
  } catch (e) {
    console.error(`Cross-module events error for ${locationId}:`, e);
  }

  if (ideas.length > 0) {
    const { error } = await supabase.from("marketing_content_ideas").insert(ideas);
    if (error) {
      console.error(`Ideas insert failed for ${locationId}:`, error);
      throw error;
    }
    console.log(`Ideas: ${ideas.length} generated for ${locationId}`);
  }
}

async function getWeatherIdea(
  apiKey: string,
  location: { name: string; google_place_id: string | null }
): Promise<{ title: string; description: string } | null> {
  // Use location name for weather query, fallback to Amsterdam
  const query = location.name ? `${location.name},NL` : "Amsterdam,NL";

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(query)}&cnt=8&appid=${apiKey}&units=metric`;
  const res = await fetch(url);

  if (!res.ok) {
    // If location name doesn't match, try Amsterdam as fallback
    if (res.status === 404 && query !== "Amsterdam,NL") {
      const fallbackUrl = `https://api.openweathermap.org/data/2.5/forecast?q=Amsterdam,NL&cnt=8&appid=${apiKey}&units=metric`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) return null;
      return parseWeatherResponse(await fallbackRes.json());
    }
    return null;
  }

  return parseWeatherResponse(await res.json());
}

function parseWeatherResponse(data: any): { title: string; description: string } | null {
  const forecasts = data?.list ?? [];
  if (forecasts.length === 0) return null;

  // Check tomorrow's conditions (forecasts 3-8 are roughly tomorrow)
  const tomorrowForecasts = forecasts.slice(3, 8);
  const maxTemp = Math.max(...tomorrowForecasts.map((f: any) => f.main?.temp ?? 0));
  const hasRain = tomorrowForecasts.some((f: any) =>
    f.weather?.some((w: any) => ["Rain", "Drizzle", "Thunderstorm"].includes(w.main))
  );

  if (maxTemp > 22) {
    return {
      title: "☀️ Terras weer morgen!",
      description: `Het wordt ${Math.round(maxTemp)}°C — perfect voor een post over je buitenkaart of terras.`,
    };
  }

  if (hasRain) {
    return {
      title: "🌧️ Comfort food weer",
      description: "Regen verwacht — deel een gezellige interieur foto of comfort food suggestie.",
    };
  }

  return null;
}

function eventToIdea(event: any, locationId: string): any | null {
  const payload = typeof event.payload === "object" ? event.payload : {};
  switch (event.event_type) {
    case "new_menu_item_added":
      return {
        location_id: locationId,
        title: `Nieuw op de kaart: ${payload.name ?? "nieuw gerecht"}`,
        description: "Deel een foto en maak je gasten enthousiast!",
        idea_type: "social_post",
        source: "cross_module",
        priority: 8,
        status: "active",
        source_event_id: event.id,
      };
    case "empty_shift_detected":
      return {
        location_id: locationId,
        title: `Rustige ${payload.day ?? "dag"} — promotie?`,
        description: "Maak een last-minute actie of speciale aanbieding.",
        idea_type: "social_post",
        source: "cross_module",
        priority: 7,
        status: "active",
        source_event_id: event.id,
      };
    default:
      return null;
  }
}
