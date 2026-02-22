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

const AI_GATEWAY = 'https://ai.gateway.lovable.dev';

// SHA-256 hash for external_review_id
async function hashReviewId(authorName: string, text: string, time: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${authorName}|${text}|${time}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fetch reviews from Google Places API
async function fetchGoogleReviews(placeId: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total,reviews&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (data.status !== 'OK') {
    throw new Error(`Google Places API status: ${data.status}`);
  }
  return data.result;
}

// Batch sentiment analysis
async function analyzeSentiment(reviews: { id: string; text: string }[]): Promise<Record<string, { sentiment: string; aspects: Record<string, string> }>> {
  if (reviews.length === 0) return {};

  const reviewTexts = reviews.map((r, i) => `Review ${i + 1} (ID: ${r.id}):\n${r.text}`).join('\n\n---\n\n');

  try {
    const res = await fetch(`${AI_GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Je bent een sentiment-analysist voor restaurantreviews. Analyseer elke review en geef per review:
- sentiment: "positive", "neutral", of "negative"
- sentiment_aspects: een object met keys "food", "service", "ambiance" en waarden "positive", "neutral", of "negative" (alleen als de review dat aspect noemt, anders weglaten)

Antwoord in JSON format: { "results": [{ "id": "...", "sentiment": "...", "sentiment_aspects": {...} }] }`
          },
          { role: 'user', content: reviewTexts }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      console.error('Sentiment analysis API error:', res.status);
      await res.text();
      return {};
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return {};

    const parsed = JSON.parse(content);
    const map: Record<string, { sentiment: string; aspects: Record<string, string> }> = {};
    for (const r of (parsed.results || [])) {
      map[r.id] = { sentiment: r.sentiment, aspects: r.sentiment_aspects || {} };
    }
    return map;
  } catch (err) {
    console.error('Sentiment analysis failed:', err);
    return {};
  }
}

// Generate AI response for negative reviews
async function generateResponse(reviewText: string, authorName: string, rating: number, brandVoice: string | null): Promise<string | null> {
  try {
    const voiceInstruction = brandVoice
      ? `Schrijf in de volgende brand voice: ${brandVoice}`
      : 'Schrijf professioneel en vriendelijk.';

    const res = await fetch(`${AI_GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Je schrijft antwoorden op restaurantreviews namens het restaurant. ${voiceInstruction}

Regels:
- Spreek de reviewer aan met hun voornaam
- Erken het probleem specifiek (niet generiek)
- Bied een concrete oplossing of verbetering aan
- Nodig de gast uit om terug te komen
- Houd het kort (max 3-4 zinnen)
- Toon empathie zonder excuses te zoeken`
          },
          {
            role: 'user',
            content: `Review van ${authorName} (${rating}/5 sterren):\n${reviewText}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      await res.text();
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('Response generation failed:', err);
    return null;
  }
}

async function processLocation(locationId: string, placeId: string, apiKey: string) {
  const result = { reviews_inserted: 0, reviews_skipped: 0, errors: [] as string[] };

  try {
    // 1. Fetch from Google Places API
    const placeData = await fetchGoogleReviews(placeId, apiKey);

    // 2. Store aggregate ratings in brand_intelligence
    if (placeData.rating !== undefined || placeData.user_ratings_total !== undefined) {
      const { data: existing } = await supabaseAdmin
        .from('marketing_brand_intelligence')
        .select('engagement_baseline')
        .eq('location_id', locationId)
        .maybeSingle();

      const baseline = (existing?.engagement_baseline as Record<string, unknown>) || {};
      const updated = {
        ...baseline,
        google_rating: placeData.rating ?? baseline.google_rating,
        google_review_count: placeData.user_ratings_total ?? baseline.google_review_count,
        google_updated_at: new Date().toISOString(),
      };

      await supabaseAdmin
        .from('marketing_brand_intelligence')
        .upsert({
          location_id: locationId,
          engagement_baseline: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'location_id' });
    }

    // 3. Process individual reviews
    const reviews = placeData.reviews || [];
    const newReviews: { id: string; text: string; dbId: string }[] = [];

    for (const review of reviews) {
      const externalId = await hashReviewId(
        review.author_name || '',
        review.text || '',
        review.time || 0
      );

      const { data: inserted, error } = await supabaseAdmin
        .from('marketing_reviews')
        .upsert({
          location_id: locationId,
          platform: 'google',
          external_review_id: externalId,
          author_name: review.author_name || '',
          author_photo_url: review.profile_photo_url || null,
          rating: review.rating || 3,
          review_text: review.text || null,
          review_language: review.language || 'nl',
          published_at: review.time ? new Date(review.time * 1000).toISOString() : null,
        }, { onConflict: 'location_id,platform,external_review_id', ignoreDuplicates: true })
        .select('id, review_text')
        .single();

      if (error) {
        if (error.code === '23505') {
          result.reviews_skipped++;
        } else {
          result.errors.push(`Insert error: ${error.message}`);
        }
        continue;
      }

      if (inserted && inserted.review_text) {
        result.reviews_inserted++;
        newReviews.push({ id: externalId, text: inserted.review_text, dbId: inserted.id });
      }
    }

    // 4. Sentiment analysis for new reviews
    if (newReviews.length > 0) {
      const sentimentMap = await analyzeSentiment(
        newReviews.map(r => ({ id: r.dbId, text: r.text }))
      );

      for (const review of newReviews) {
        const sentiment = sentimentMap[review.dbId];
        if (sentiment) {
          await supabaseAdmin
            .from('marketing_reviews')
            .update({
              sentiment: sentiment.sentiment,
              sentiment_aspects: sentiment.aspects,
            })
            .eq('id', review.dbId);
        }
      }
    }

    // 5. Generate AI responses for low-rated reviews
    const { data: lowRated } = await supabaseAdmin
      .from('marketing_reviews')
      .select('id, review_text, author_name, rating')
      .eq('location_id', locationId)
      .lte('rating', 3)
      .is('ai_suggested_response', null)
      .not('review_text', 'is', null);

    if (lowRated && lowRated.length > 0) {
      // Get brand voice
      const { data: brandKit } = await supabaseAdmin
        .from('marketing_brand_intelligence')
        .select('caption_style_profile')
        .eq('location_id', locationId)
        .maybeSingle();

      for (const review of lowRated) {
        const response = await generateResponse(
          review.review_text!,
          review.author_name,
          review.rating,
          brandKit?.caption_style_profile || null
        );

        if (response) {
          await supabaseAdmin
            .from('marketing_reviews')
            .update({ ai_suggested_response: response })
            .eq('id', review.id);
        }
      }
    }
  } catch (err) {
    result.errors.push(err.message);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get locations with google_place_id
    const { data: locations, error } = await supabaseAdmin
      .from('locations')
      .select('id, google_place_id')
      .eq('is_active', true)
      .not('google_place_id', 'is', null);

    if (error) throw error;

    if (!locations || locations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No locations with Google Place ID configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    for (const loc of locations) {
      const result = await processLocation(loc.id, loc.google_place_id!, apiKey);
      results.push({ location_id: loc.id, ...result });
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('marketing-sync-reviews error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
