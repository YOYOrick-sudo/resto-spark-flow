import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function WidgetPreviewDemo() {
  const [params] = useSearchParams();
  const slug = params.get('slug') || 'demo';
  const mode = params.get('mode') || 'button';
  const label = params.get('label') || 'Reserveer';
  const position = params.get('position') || 'bottom-right';
  const color = params.get('color') || '#1d979e';
  const logo = params.get('logo') || '';
  const name = params.get('name') || '';
  const buttonLogo = params.get('buttonLogo') || '';

  useEffect(() => {
    // Dynamically inject widget.js with config
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.setAttribute('data-slug', slug);
    script.setAttribute('data-mode', mode);
    script.setAttribute('data-label', label);
    script.setAttribute('data-position', position);
    script.setAttribute('data-color', color);
    script.setAttribute('data-container', 'nesto-booking');
    if (logo) script.setAttribute('data-logo', logo);
    if (name) script.setAttribute('data-name', name);
    if (buttonLogo) script.setAttribute('data-button-logo', buttonLogo);
    document.body.appendChild(script);

    return () => {
      script.remove();
      // Clean up any elements the widget created
      document.querySelectorAll('[data-nesto-widget]').forEach(el => el.remove());
      // Remove floating button if present
      const buttons = document.querySelectorAll('button[aria-label]');
      buttons.forEach(btn => {
        if (btn.getAttribute('aria-label') === label) btn.remove();
      });
    };
  }, [slug, mode, label, position, color, logo, name, buttonLogo]);

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

        {mode === 'inline' && (
          <section>
            <h2 className="text-2xl font-semibold mb-6">Reserveren</h2>
            <div id="nesto-booking" />
          </section>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p className="text-[#666]">
            Via Roma 42, Amsterdam · +31 20 123 4567 · info@bellavista.nl
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e2dc] py-8 text-center text-sm text-[#999]">
        Dit is een preview-pagina · Widget configuratie wordt live geladen
      </footer>
    </div>
  );
}
