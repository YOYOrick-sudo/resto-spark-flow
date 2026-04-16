import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { pairing_code, device_name } = body;

    // Validate pairing_code
    if (!pairing_code || typeof pairing_code !== "string" || pairing_code.length !== 6) {
      return new Response(
        JSON.stringify({ error: "pairing_code must be exactly 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Find device with valid pairing code
    const { data: device, error: deviceError } = await supabaseAdmin
      .from("devices")
      .select("id, location_id, device_name, device_role, pairing_expires_at, status")
      .eq("pairing_code", pairing_code)
      .eq("status", "pending_activation")
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired pairing code" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check expiry
    if (device.pairing_expires_at && new Date(device.pairing_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Pairing code expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get location slug for email
    const { data: location } = await supabaseAdmin
      .from("locations")
      .select("slug, organization_id")
      .eq("id", device.location_id)
      .single();

    const slug = location?.slug || "device";
    const deviceEmail = `${slug}-${device.id.substring(0, 8)}@devices.nesto.app`;
    const devicePassword = crypto.randomUUID() + crypto.randomUUID().substring(0, 8);

    // 4. Create auth user for device
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: deviceEmail,
      password: devicePassword,
      email_confirm: true,
      user_metadata: {
        is_device: true,
        device_id: device.id,
        location_id: device.location_id,
      },
    });

    if (authError) {
      console.error("Auth user creation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create device account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Update device row
    const { error: updateError } = await supabaseAdmin
      .from("devices")
      .update({
        auth_user_id: authData.user.id,
        status: "active",
        paired_at: new Date().toISOString(),
        pairing_code: null,
        pairing_expires_at: null,
        device_name: device_name || device.device_name,
      })
      .eq("id", device.id);

    if (updateError) {
      console.error("Device update failed:", updateError);
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to activate device" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Audit log
    await supabaseAdmin.from("audit_logs").insert({
      organization_id: location?.organization_id,
      location_id: device.location_id,
      actor_type: "system",
      device_id: device.id,
      action: "device.paired",
      target_type: "device",
      target_id: device.id,
      details: { device_name: device_name || device.device_name },
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });

    // 7. Return credentials — client stores in secure storage
    //    and calls signInWithPassword() to get a session
    return new Response(
      JSON.stringify({
        success: true,
        device_id: device.id,
        email: deviceEmail,
        password: devicePassword,
        location_id: device.location_id,
        device_role: device.device_role,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("pair-device error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
