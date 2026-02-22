const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response('Missing slug', { status: 400, headers: corsHeaders });
  }

  const baseUrl = Deno.env.get('SUPABASE_URL')!;
  const widgetUrl = `${baseUrl}/functions/v1/marketing-popup-widget?slug=${encodeURIComponent(slug)}`;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Popup Preview – ${slug}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      color: #374151;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .preview-banner {
      background: #111827;
      color: #fff;
      padding: 12px 20px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .preview-banner span { opacity: 0.7; }
    .preview-content {
      flex: 1;
      padding: 60px 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 12px; color: #111827; }
    p { font-size: 15px; line-height: 1.6; color: #6b7280; margin-bottom: 16px; }
    .placeholder-block {
      background: #e5e7eb;
      border-radius: 12px;
      height: 200px;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="preview-banner">
    🔍 <strong>Popup Preview</strong> <span>– Dit is een voorbeeldpagina. De popup verschijnt na de ingestelde tijd of bij exit-intent.</span>
  </div>
  <div class="preview-content">
    <h1>Voorbeeldpagina</h1>
    <p>Dit is een simulatie van je website. De popup en/of sticky bar verschijnen hier zoals je bezoekers ze zullen zien.</p>
    <div class="placeholder-block"></div>
    <p>Beweeg je muis naar de bovenkant van het scherm om de exit-intent popup te testen (alleen op desktop).</p>
    <div class="placeholder-block"></div>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
  </div>
  <script src="${widgetUrl}"></script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
});
