import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Find all published A/B tests older than 48 hours that haven't been evaluated yet
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: posts, error } = await supabaseAdmin
      .from('marketing_social_posts')
      .select('id, ab_test_id, ab_test_group, analytics, platform')
      .not('ab_test_id', 'is', null)
      .eq('status', 'published')
      .lt('created_at', cutoff);

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ evaluated: 0, message: 'No eligible A/B tests' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by ab_test_id
    const groups: Record<string, typeof posts> = {};
    for (const p of posts) {
      if (!p.ab_test_id) continue;
      if (!groups[p.ab_test_id]) groups[p.ab_test_id] = [];
      groups[p.ab_test_id].push(p);
    }

    let evaluated = 0;
    const results: { ab_test_id: string; winner: string | null }[] = [];

    for (const [testId, testPosts] of Object.entries(groups)) {
      // Skip if already evaluated (any post has ab_test_winner in analytics)
      const alreadyEvaluated = testPosts.some((p) => {
        const a = p.analytics as Record<string, unknown> | null;
        return a?.ab_test_winner === true;
      });
      if (alreadyEvaluated) continue;

      const variantA = testPosts.filter((p) => p.ab_test_group === 'A');
      const variantB = testPosts.filter((p) => p.ab_test_group === 'B');

      if (variantA.length === 0 || variantB.length === 0) continue;

      const engagementRate = (post: (typeof posts)[0]): number => {
        const a = post.analytics as Record<string, unknown> | null;
        if (!a) return 0;
        const reach = Number(a.reach ?? 0);
        const engagement = Number(a.engagement ?? 0);
        return reach > 0 ? engagement / reach : 0;
      };

      const avgA =
        variantA.reduce((s, p) => s + engagementRate(p), 0) / variantA.length;
      const avgB =
        variantB.reduce((s, p) => s + engagementRate(p), 0) / variantB.length;

      const winner = avgA > avgB ? 'A' : avgB > avgA ? 'B' : null;

      // Mark winner posts
      if (winner) {
        const winnerPosts = winner === 'A' ? variantA : variantB;
        for (const wp of winnerPosts) {
          const currentAnalytics =
            (wp.analytics as Record<string, unknown>) ?? {};
          await supabaseAdmin
            .from('marketing_social_posts')
            .update({
              analytics: { ...currentAnalytics, ab_test_winner: true },
            })
            .eq('id', wp.id);
        }
      }

      evaluated++;
      results.push({ ab_test_id: testId, winner });
    }

    return new Response(
      JSON.stringify({ evaluated, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('marketing-evaluate-ab-test error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
