import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bestelling_id } = await req.json();
    if (!bestelling_id) {
      return new Response(JSON.stringify({ error: "bestelling_id verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch bestelling + leverancier + regels
    const { data: bestelling, error: bErr } = await supabase
      .from("bestellingen")
      .select(`
        *, 
        leveranciers(naam, email, contactpersoon, telefoon),
        bestelregels(*, ingredienten(naam, eenheid))
      `)
      .eq("id", bestelling_id)
      .single();
    if (bErr) throw bErr;

    // Fix 4: dubbel-verzend guard
    if (bestelling.status === "verzonden") {
      return new Response(
        JSON.stringify({ error: "Bestelling is al verzonden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leverancier = bestelling.leveranciers as any;
    if (!leverancier?.email) {
      return new Response(JSON.stringify({ error: "Leverancier heeft geen e-mailadres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch location info
    const { data: location } = await supabase
      .from("locations")
      .select("name")
      .eq("id", bestelling.location_id)
      .single();

    // Build email HTML
    const regels = (bestelling.bestelregels as any[]) ?? [];
    const regelsHtml = regels
      .map(
        (r: any) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${r.ingredienten?.naam ?? "?"}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px">${r.bestelde_hoeveelheid} ${r.eenheid}</td>
          </tr>`
      )
      .join("");

    const locationName = location?.name ?? "Restaurant";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="margin-bottom:4px">Bestelling ${bestelling.bestelnummer || ""}</h2>
        <p style="color:#666;margin-top:0"><strong>${locationName}</strong></p>
        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0"/>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid #333">
              <th style="text-align:left;padding:8px 12px;font-size:13px;text-transform:uppercase;color:#666">Artikel</th>
              <th style="text-align:right;padding:8px 12px;font-size:13px;text-transform:uppercase;color:#666">Hoeveelheid</th>
            </tr>
          </thead>
          <tbody>${regelsHtml}</tbody>
        </table>
        ${bestelling.verwachte_leverdatum ? `<p style="margin-top:20px;font-size:14px"><strong>Verwachte levering:</strong> ${bestelling.verwachte_leverdatum}</p>` : ""}
        ${bestelling.notities ? `<p style="font-size:14px"><strong>Notities:</strong> ${bestelling.notities}</p>` : ""}
        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0"/>
        <p style="font-size:14px">Met vriendelijke groet,<br/>${locationName}</p>
        <p style="color:#999;font-size:12px;margin-top:30px">Verstuurd via Nesto</p>
      </div>
    `;

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "E-mail service niet geconfigureerd. Voeg RESEND_API_KEY toe." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${locationName} <onboarding@resend.dev>`,
        to: [leverancier.email],
        subject: `Bestelling ${bestelling.bestelnummer || ""} — ${locationName}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "E-mail verzending mislukt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status
    await supabase.from("bestellingen").update({
      status: "verzonden",
      besteldatum: new Date().toISOString().split("T")[0],
      laatst_verzonden: new Date().toISOString(),
    } as any).eq("id", bestelling_id);

    return new Response(JSON.stringify({ success: true, email: leverancier.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-order-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
