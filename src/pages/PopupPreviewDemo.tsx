import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PopupConfig {
  headline: string;
  description: string;
  button_text: string;
  popup_type: string;
  primary_color: string;
  logo_url?: string;
  featured_ticket?: { display_title: string; short_description?: string; color: string } | null;
  sticky_bar_enabled: boolean;
  sticky_bar_position: string;
  exit_intent_enabled: boolean;
  timed_popup_enabled: boolean;
  timed_popup_delay_seconds: number;
  success_message: string;
  gdpr_text: string;
  custom_button_url?: string;
  is_active?: boolean;
  slug?: string;
}

function esc(s: string | undefined | null): string {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function buildStyles(primaryColor: string): string {
  return `
    *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
    .nesto-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999998;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;}
    .nesto-overlay.visible{opacity:1;}
    .nesto-popup{background:#fff;border-radius:24px;padding:32px;max-width:420px;width:calc(100vw - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative;transform:translateY(20px);transition:transform .3s ease;text-align:center;}
    .nesto-overlay.visible .nesto-popup{transform:translateY(0);}
    .nesto-close{position:absolute;top:12px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .2s,color .2s;}
    .nesto-close:hover{background:${primaryColor}10;color:${primaryColor};}
    .nesto-logo{max-height:40px;max-width:160px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;}
    .nesto-headline{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:8px;line-height:1.3;text-align:center;}
    .nesto-desc{font-size:14px;color:#666;margin-bottom:20px;line-height:1.5;text-align:center;}
    .nesto-form{display:flex;gap:8px;justify-content:center;}
    .nesto-input{flex:1;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:12px;font-size:14px;outline:none;transition:border-color .2s;}
    .nesto-input:focus{border-color:${primaryColor};}
    .nesto-btn{padding:10px 20px;background:${primaryColor};color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity .2s;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
    .nesto-btn:hover{opacity:0.9;}
    .nesto-btn-full{width:100%;text-align:center;}
    .nesto-gdpr{font-size:11px;color:#9ca3af;margin-top:12px;line-height:1.4;text-align:center;}
    .nesto-featured{display:block;width:100%;padding:16px;border-radius:24px;margin-bottom:16px;text-decoration:none;transition:opacity .2s;cursor:pointer;text-align:left;}
    .nesto-featured:hover{opacity:0.9;}
    .nesto-featured-title{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:4px;}
    .nesto-featured-desc{font-size:13px;color:#666;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

    .nesto-bar{position:fixed;left:0;right:0;z-index:999999;padding:12px 16px;display:flex;align-items:center;gap:12px;transform:translateY(100%);transition:transform .3s ease;}
    .nesto-bar.top{top:0;box-shadow:0 2px 10px rgba(0,0,0,0.1);transform:translateY(-100%);}
    .nesto-bar.bottom{bottom:0;box-shadow:0 -2px 10px rgba(0,0,0,0.1);}
    .nesto-bar.visible{transform:translateY(0);}
    .nesto-bar-text{flex:1;font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .nesto-bar .nesto-input{width:200px;flex:none;padding:8px 12px;font-size:13px;background:#fff;border:1.5px solid rgba(255,255,255,0.3);}
    .nesto-bar .nesto-btn{padding:8px 16px;font-size:13px;background:transparent;border:1.5px solid #fff;color:#fff;}
    .nesto-bar .nesto-btn:hover{background:rgba(255,255,255,0.15);}
    .nesto-bar-close{background:none;border:none;font-size:18px;cursor:pointer;color:#fff;padding:4px;opacity:0.8;}
    .nesto-bar-close:hover{opacity:1;}

    @media(max-width:600px){
      .nesto-form{flex-direction:column;}
      .nesto-bar{flex-wrap:wrap;}
      .nesto-bar .nesto-input{width:100%;flex:1;}
      .nesto-bar-text{width:100%;}
    }
  `;
}

function renderPopupInShadow(shadow: ShadowRoot, cfg: PopupConfig) {
  // Clear shadow DOM
  shadow.innerHTML = '';

  const primaryColor = cfg.primary_color || '#1d979e';
  const popupType = cfg.popup_type || 'newsletter';
  const ft = cfg.featured_ticket;

  // Styles
  const styles = document.createElement('style');
  styles.textContent = buildStyles(primaryColor);
  shadow.appendChild(styles);

  // Build popup content
  function buildFeaturedHTML() {
    if (!ft) return '';
    const bgGradient = `linear-gradient(180deg, ${esc(ft.color)}18 0%, transparent 100%)`;
    return `<div class="nesto-featured" style="background:${bgGradient}">
      <div class="nesto-featured-title">${esc(ft.display_title)}</div>
      ${ft.short_description ? `<div class="nesto-featured-desc">${esc(ft.short_description)}</div>` : ''}
    </div>`;
  }

  function buildPopupContent() {
    const logoHtml = cfg.logo_url ? `<img class="nesto-logo" src="${cfg.logo_url}" alt="Logo">` : '';
    const headlineHtml = `<div class="nesto-headline">${esc(cfg.headline)}</div>`;
    const descHtml = `<div class="nesto-desc">${esc(cfg.description).replace(/\n/g, '<br>')}</div>`;

    if (popupType === 'reservation') {
      return logoHtml + headlineHtml + descHtml + buildFeaturedHTML()
        + `<span class="nesto-btn nesto-btn-full">${esc(cfg.button_text)}</span>`;
    }
    if (popupType === 'custom') {
      return logoHtml + headlineHtml + descHtml
        + `<span class="nesto-btn nesto-btn-full">${esc(cfg.button_text)}</span>`;
    }
    // newsletter
    return logoHtml + headlineHtml + descHtml
      + `<div class="nesto-form">
        <input class="nesto-input" type="email" placeholder="je@email.nl" disabled>
        <button class="nesto-btn" disabled>${esc(cfg.button_text)}</button>
      </div>
      <div class="nesto-gdpr">${esc(cfg.gdpr_text)}</div>`;
  }

  // Always show the popup immediately in preview mode
  const overlay = document.createElement('div');
  overlay.className = 'nesto-overlay';
  overlay.setAttribute('data-nesto-popup', 'true');
  overlay.innerHTML = `<div class="nesto-popup">
    <button class="nesto-close" aria-label="Sluiten">&times;</button>
    ${buildPopupContent()}
  </div>`;
  shadow.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  overlay.querySelector('.nesto-close')?.addEventListener('click', () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 300);
    }
  });

  // Sticky bar
  if (cfg.sticky_bar_enabled) {
    const bar = document.createElement('div');
    bar.className = `nesto-bar ${cfg.sticky_bar_position === 'top' ? 'top' : 'bottom'}`;
    bar.style.background = primaryColor;

    let barHtml = `<span class="nesto-bar-text">${esc(cfg.headline)}</span>`;
    if (popupType === 'newsletter') {
      barHtml += `<input class="nesto-input" type="email" placeholder="je@email.nl" disabled>
        <button class="nesto-btn" disabled>${esc(cfg.button_text)}</button>`;
    } else {
      barHtml += `<span class="nesto-btn">${esc(cfg.button_text)}</span>`;
    }
    barHtml += `<button class="nesto-bar-close" aria-label="Sluiten">&times;</button>`;
    bar.innerHTML = barHtml;
    shadow.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add('visible'));

    bar.querySelector('.nesto-bar-close')?.addEventListener('click', () => {
      bar.classList.remove('visible');
      setTimeout(() => bar.remove(), 300);
    });
  }
}

export default function PopupPreviewDemo() {
  const [params] = useSearchParams();
  const slug = params.get('slug') || 'demo';
  const popupId = params.get('popup_id') || '';
  const shadowHostRef = useRef<HTMLDivElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  // Load initial widget via edge function (first load)
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let widgetUrl = `${supabaseUrl}/functions/v1/marketing-popup-widget?slug=${encodeURIComponent(slug)}&preview=true`;
    if (popupId) {
      widgetUrl += `&popup_id=${encodeURIComponent(popupId)}`;
    }

    const script = document.createElement('script');
    script.src = widgetUrl;
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.querySelectorAll('[data-nesto-popup]').forEach(el => el.remove());
      document.querySelectorAll('.nesto-popup-overlay, .nesto-sticky-bar').forEach(el => el.remove());
      // Also remove the edge function host
      document.getElementById('nesto-popup-host')?.remove();
    };
  }, [slug, popupId]);

  // Ensure our shadow host exists
  useEffect(() => {
    const host = document.createElement('div');
    host.id = 'nesto-popup-preview-host';
    document.body.appendChild(host);
    shadowHostRef.current = host;
    shadowRootRef.current = host.attachShadow({ mode: 'open' });

    return () => {
      host.remove();
      shadowHostRef.current = null;
      shadowRootRef.current = null;
    };
  }, []);

  // Listen for postMessage config updates
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || event.data.type !== 'nesto-popup-config-update') return;
    const cfg = event.data.config as PopupConfig;
    if (!cfg) return;

    // Remove the edge function widget so our local render takes over
    document.getElementById('nesto-popup-host')?.remove();

    if (shadowRootRef.current) {
      renderPopupInShadow(shadowRootRef.current, cfg);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2d2d2d] font-sans">
      {/* Nav */}
      <header className="border-b border-[#e5e2dc] bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Ristorante Bella Vista</span>
          <nav className="hidden sm:flex gap-6 text-sm text-[#666]">
            <span className="cursor-default">Menu</span>
            <span className="cursor-default">Over ons</span>
            <span className="cursor-default">Contact</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Authentieke Italiaanse<br />keuken in het hart van de stad
          </h1>
          <p className="text-lg text-white/70 max-w-lg">
            Al meer dan 15 jaar serveren wij de beste pasta's, pizza's en huisgemaakte desserts. Reserveer uw tafel en beleef een onvergetelijke avond.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        <section>
          <h2 className="text-2xl font-semibold mb-6">Ons Menu</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {['Antipasti', 'Primi Piatti', 'Secondi'].map(cat => (
              <div key={cat} className="bg-white rounded-xl border border-[#e5e2dc] p-6">
                <h3 className="font-medium mb-2">{cat}</h3>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-[#f0ede8] rounded" />
                  <div className="h-3 w-4/5 bg-[#f0ede8] rounded" />
                  <div className="h-3 w-3/5 bg-[#f0ede8] rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p className="text-[#666]">
            Via Roma 42, Amsterdam · +31 20 123 4567 · info@bellavista.nl
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e2dc] py-8 text-center text-sm text-[#999]">
        Dit is een preview-pagina · Popup wordt live geladen
      </footer>
    </div>
  );
}
