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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Find Google Business posts older than 6 days
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    const { data: posts, error: postsError } = await supabase
      .from("marketing_social_posts")
      .select("*")
      .eq("platform", "google_business")
      .eq("status", "published")
      .not("external_post_id", "is", null)
      .lt("published_at", sixDaysAgo.toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No Google posts to refresh", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cache accounts per location
    const accountCache = new Map<string, any>();
    async function getGoogleAccount(locationId: string) {
      if (accountCache.has(locationId)) return accountCache.get(locationId);
      const { data } = await supabase
        .from("marketing_social_accounts")
        .select("*")
        .eq("location_id", locationId)
        .eq("platform", "google_business")
        .eq("is_active", true)
        .single();
      accountCache.set(locationId, data);
      return data;
    }

    const results: {
      post_id: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const post of posts) {
      try {
        const account = await getGoogleAccount(post.location_id);
        if (!account?.access_token || !account?.account_id) {
          results.push({
            post_id: post.id,
            success: false,
            error: "No active Google account or token",
          });
          continue;
        }

        // 2. Delete the old post
        const deleteResp = await fetch(
          `https://mybusiness.googleapis.com/v4/${post.external_post_id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }
        );

        if (!deleteResp.ok) {
          const deleteData = await deleteResp.json();
          // If post already deleted (404), continue with re-creation
          if (deleteResp.status !== 404) {
            throw new Error(
              deleteData.error?.message || `Delete failed: ${deleteResp.status}`
            );
          }
        }

        // 3. Re-create the post with same content
        const createResp = await fetch(
          `https://mybusiness.googleapis.com/v4/${account.account_id}/localPosts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              languageCode: "nl",
              summary: post.content_text || "",
              topicType: "STANDARD",
            }),
          }
        );

        const createData = await createResp.json();
        if (createData.error) {
          throw new Error(
            createData.error.message || JSON.stringify(createData.error)
          );
        }

        // 4. Update the post in database
        await supabase
          .from("marketing_social_posts")
          .update({
            external_post_id: createData.name,
            published_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", post.id);

        results.push({ post_id: post.id, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error refreshing Google post ${post.id}:`, msg);

        // Set error_message but keep status as published
        await supabase
          .from("marketing_social_posts")
          .update({ error_message: msg })
          .eq("id", post.id);

        results.push({ post_id: post.id, success: false, error: msg });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
