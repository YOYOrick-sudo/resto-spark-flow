import { callAIWithTools, resolveOrgId } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { primary, accent, location_id } = await req.json();

    // If no location_id, return empty suggestions (frontend falls back to curated palettes)
    if (!location_id) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = await resolveOrgId(location_id);

    const result = await callAIWithTools({
      featureKey: "suggest_widget_colors",
      organizationId,
      locationId: location_id,
      messages: [
        {
          role: "system",
          content: `Je bent een expert kleuradviseur voor restaurant branding. Geef kleurcombinaties die professioneel, uitnodigend en toegankelijk zijn (WCAG contrast). Antwoord altijd in het Nederlands. Geef precies 3 suggesties.`,
        },
        {
          role: "user",
          content: `Mijn restaurant widget gebruikt nu primary=${primary} en accent=${accent}. Stel 3 betere kleurencombinaties voor die harmonieus samengaan en geschikt zijn voor een horeca boekingswidget. Elke combinatie moet een primary kleur (voor knoppen/CTA's) en een accent kleur (voor badges/highlights) bevatten.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_color_palettes",
            description:
              "Return 3 harmonious color palette suggestions for a restaurant booking widget.",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      primary: {
                        type: "string",
                        description: "Primary hex color for buttons/CTAs",
                      },
                      accent: {
                        type: "string",
                        description:
                          "Accent hex color for badges/highlights",
                      },
                      name: {
                        type: "string",
                        description:
                          "Short Dutch name for this palette (2-3 words)",
                      },
                      reasoning: {
                        type: "string",
                        description:
                          "One sentence in Dutch explaining why these colors work well together",
                      },
                    },
                    required: ["primary", "accent", "name", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        },
      ],
      toolChoice: {
        type: "function",
        function: { name: "suggest_color_palettes" },
      },
    });

    if (result.toolCalls?.length) {
      return new Response(JSON.stringify(result.toolCalls[0].arguments), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No tool call response from AI");
  } catch (e) {
    console.error("suggest-widget-colors error:", e);

    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("429") || msg.includes("rate")) {
      return new Response(
        JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (msg.includes("402") || msg.includes("credit")) {
      return new Response(
        JSON.stringify({ error: "AI-tegoed op, voeg credits toe in je workspace instellingen." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
