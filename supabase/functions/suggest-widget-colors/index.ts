import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { primary, accent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
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
          tool_choice: {
            type: "function",
            function: { name: "suggest_color_palettes" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-tegoed op, voeg credits toe in je workspace instellingen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service niet beschikbaar" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-widget-colors error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
