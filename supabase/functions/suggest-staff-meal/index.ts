import { callAIWithTools, resolveOrgId } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bijna_verlopen, overstocked, aantal_personen, location_id } = await req.json();

    if (!location_id) {
      return new Response(
        JSON.stringify({ error: "location_id is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = await resolveOrgId(location_id);

    const bijnaVerlopenList = (bijna_verlopen ?? [])
      .map((i: any) => `- ${i.naam}: ${i.hoeveelheid} (verloopt over ${i.dagen_resterend} dag${i.dagen_resterend !== 1 ? "en" : ""})`)
      .join("\n");

    const overstockedList = (overstocked ?? []).length > 0
      ? `\nDeze ingrediënten zijn overstocked en mogen ook gebruikt worden:\n${(overstocked ?? []).map((i: any) => `- ${i.naam}: ${i.hoeveelheid}`).join("\n")}`
      : "";

    const prompt = `Je bent een ervaren sous-chef in een Nederlands casual dining restaurant.
Bedenk een simpele, snelle personeelsmaaltijd (max 20 minuten bereidingstijd).

Gebruik PRIORITAIR deze bijna-verlopende items (moeten op):
${bijnaVerlopenList}
${overstockedList}

Aantal personen: ${aantal_personen || 4}
Beschikbare basiskruiden: zout, peper, olijfolie, boter, knoflook, ui, brood

Regels:
- Het moet echt lekker zijn, niet alleen "opgebruikt"
- Maximaal 20 minuten bereidingstijd
- Gebruik alleen de genoemde ingrediënten (+ basis)
- Geef exacte hoeveelheden per ingrediënt
- Prioriteit: verwerk eerst de bijna-verlopende items, dan overstocked
- Als de ingrediënten niet tot een goed gerecht leiden, zeg dat eerlijk
- Geen rare combinaties (slagroom + uien = geen maaltijd)`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "suggest_meal",
        description: "Stel een personeelsmaaltijd voor",
        parameters: {
          type: "object",
          properties: {
            naam: { type: "string", description: "Gerechtnaam" },
            beschrijving: { type: "string", description: "Korte beschrijving" },
            bereidingstijd_min: { type: "number" },
            ingredienten: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  naam: { type: "string" },
                  hoeveelheid: { type: "number" },
                  eenheid: { type: "string" },
                  bron: { type: "string", enum: ["bijna_verlopen", "overstocked", "basis"] },
                },
                required: ["naam", "hoeveelheid", "eenheid", "bron"],
              },
            },
            geen_voorstel: { type: "boolean", description: "true als geen goed gerecht mogelijk" },
            reden: { type: "string", description: "Waarom geen voorstel (als geen_voorstel=true)" },
          },
          required: ["naam", "ingredienten"],
        },
      },
    }];

    const result = await callAIWithTools({
      featureKey: "suggest_staff_meal",
      organizationId,
      locationId: location_id,
      prompt,
      systemPrompt: "Je bent een sous-chef. Antwoord uitsluitend via de suggest_meal tool.",
      tools,
      toolChoice: { type: "function", function: { name: "suggest_meal" } },
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Extract suggestion from tool call or fallback to text
    let suggestion;
    if (result.toolCalls.length > 0) {
      suggestion = result.toolCalls[0].arguments;
    } else {
      // Fallback: try to parse JSON from text response
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        suggestion = jsonMatch
          ? JSON.parse(jsonMatch[0])
          : { geen_voorstel: true, reden: "Kon geen voorstel genereren" };
      } catch {
        suggestion = { geen_voorstel: true, reden: "Kon geen voorstel genereren" };
      }
    }

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-staff-meal error:", e);

    // Surface specific errors
    const message = e instanceof Error ? e.message : "Onbekende fout";
    const status = message.includes("both models failed") ? 503 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
