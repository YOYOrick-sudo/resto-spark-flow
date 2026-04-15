const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bijna_verlopen, overstocked, aantal_personen } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI niet geconfigureerd" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
- Geen rare combinaties (slagroom + uien = geen maaltijd)

Antwoord ALLEEN in valide JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Je bent een sous-chef. Antwoord uitsluitend in JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
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
        }],
        tool_choice: { type: "function", function: { name: "suggest_meal" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits op." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", status, text);
      return new Response(JSON.stringify({ error: "AI niet beschikbaar" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let suggestion;

    if (toolCall) {
      try {
        suggestion = JSON.parse(toolCall.function.arguments);
      } catch {
        suggestion = { geen_voorstel: true, reden: "Kon het antwoord niet verwerken" };
      }
    } else {
      // Try to extract JSON from message content
      const content = aiResult.choices?.[0]?.message?.content ?? "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : { geen_voorstel: true, reden: "Kon geen voorstel genereren" };
      } catch {
        suggestion = { geen_voorstel: true, reden: "Kon geen voorstel genereren" };
      }
    }

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-staff-meal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
