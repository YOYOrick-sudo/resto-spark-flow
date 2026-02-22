import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch the post
    const { data: post, error: postError } = await supabase
      .from("marketing_social_posts")
      .select("*")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch the social account
    const { data: account, error: accountError } = await supabase
      .from("marketing_social_accounts")
      .select("*")
      .eq("location_id", post.location_id)
      .eq("platform", post.platform)
      .eq("is_active", true)
      .single();

    if (accountError || !account) {
      await supabase
        .from("marketing_social_posts")
        .update({ status: "failed", error_message: "Geen actief account gevonden voor dit platform" })
        .eq("id", post_id);

      return new Response(JSON.stringify({ error: "No active account found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let externalPostId: string | null = null;
    let errorMessage: string | null = null;

    try {
      const accessToken = account.access_token;
      if (!accessToken) throw new Error("Geen access token beschikbaar");

      // 3. Platform-specific publish
      if (post.platform === "instagram") {
        // Instagram Graph API - Feed post
        const igUserId = account.account_id;
        if (!igUserId) throw new Error("Geen Instagram account ID");

        // Create media container
        const containerParams = new URLSearchParams({
          caption: post.content_text || "",
          access_token: accessToken,
        });

        // If media, add image_url; otherwise text-only isn't supported on IG
        if (post.media_urls && post.media_urls.length > 0) {
          containerParams.set("image_url", post.media_urls[0]);
        } else {
          throw new Error("Instagram vereist een afbeelding. Voeg media toe aan je post.");
        }

        const containerResp = await fetch(
          `https://graph.facebook.com/v19.0/${igUserId}/media?${containerParams}`,
          { method: "POST" }
        );
        const containerData = await containerResp.json();
        if (containerData.error) throw new Error(containerData.error.message);

        // Publish the container
        const publishResp = await fetch(
          `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              creation_id: containerData.id,
              access_token: accessToken,
            }),
          }
        );
        const publishData = await publishResp.json();
        if (publishData.error) throw new Error(publishData.error.message);
        externalPostId = publishData.id;

      } else if (post.platform === "facebook") {
        const pageId = account.page_id || account.account_id;
        if (!pageId) throw new Error("Geen Facebook Page ID");

        const body: Record<string, string> = {
          message: post.content_text || "",
          access_token: accessToken,
        };

        let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;

        // If media, use photos endpoint
        if (post.media_urls && post.media_urls.length > 0) {
          endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
          body.url = post.media_urls[0];
        }

        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(body),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);
        externalPostId = data.id || data.post_id;

      } else if (post.platform === "google_business") {
        const accountId = account.account_id;
        if (!accountId) throw new Error("Geen Google Business account ID");

        const resp = await fetch(
          `https://mybusiness.googleapis.com/v4/${accountId}/localPosts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              languageCode: "nl",
              summary: post.content_text || "",
              topicType: "STANDARD",
            }),
          }
        );
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
        externalPostId = data.name;

      } else {
        throw new Error(`Onbekend platform: ${post.platform}`);
      }

      // 4. Update post as published
      await supabase
        .from("marketing_social_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          external_post_id: externalPostId,
          error_message: null,
        })
        .eq("id", post_id);

    } catch (publishError) {
      errorMessage = publishError instanceof Error ? publishError.message : String(publishError);
      await supabase
        .from("marketing_social_posts")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", post_id);
    }

    return new Response(
      JSON.stringify({
        success: !errorMessage,
        post_id,
        external_post_id: externalPostId,
        error: errorMessage,
      }),
      {
        status: errorMessage ? 422 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
