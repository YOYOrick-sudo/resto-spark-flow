import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { review_id, response_text } = await req.json();
    if (!review_id || !response_text) {
      return new Response(JSON.stringify({ error: 'review_id and response_text required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch review
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('marketing_reviews')
      .select('id, location_id, external_review_id, platform, ai_original_response')
      .eq('id', review_id)
      .single();

    if (reviewError || !review) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if Google Business account is linked
    const { data: googleAccount } = await supabaseAdmin
      .from('marketing_social_accounts')
      .select('id, access_token, account_id, page_id')
      .eq('location_id', review.location_id)
      .eq('platform', 'google_business')
      .eq('is_active', true)
      .maybeSingle();

    let googleReplySuccess = false;

    if (googleAccount?.access_token && googleAccount?.account_id && googleAccount?.page_id) {
      // Try posting to Google Business Profile API
      try {
        const googleRes = await fetch(
          `https://mybusiness.googleapis.com/v4/accounts/${googleAccount.account_id}/locations/${googleAccount.page_id}/reviews/${review.external_review_id}/reply`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${googleAccount.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment: response_text }),
          }
        );

        if (googleRes.ok) {
          googleReplySuccess = true;
        } else {
          const errText = await googleRes.text();
          console.error('Google Business reply failed:', googleRes.status, errText);
        }
      } catch (e) {
        console.error('Google Business reply error:', e);
      }
    }

    // Determine if operator edited the response
    const operatorEdited = review.ai_original_response
      ? response_text.trim() !== review.ai_original_response.trim()
      : false;

    // Save response locally
    const { error: updateError } = await supabaseAdmin
      .from('marketing_reviews')
      .update({
        response_text,
        responded_at: new Date().toISOString(),
        operator_edited: operatorEdited,
      })
      .eq('id', review_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to save response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        google_reply_posted: googleReplySuccess,
        operator_edited: operatorEdited,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('marketing-reply-review error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
