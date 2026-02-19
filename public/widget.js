(function () {
  'use strict';

  // Find the current script tag
  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute('data-slug');
  if (!slug) { console.warn('[Nesto] data-slug is required'); return; }

  var mode = script.getAttribute('data-mode') || 'button';
  var label = script.getAttribute('data-label') || 'Reserveer';
  var position = script.getAttribute('data-position') || 'bottom-right';
  var color = script.getAttribute('data-color') || '#1d979e';
  var containerId = script.getAttribute('data-container') || 'nesto-booking';

  // Determine base URL from script src
  var src = script.src;
  var baseUrl = src.substring(0, src.lastIndexOf('/'));
  var iframeSrc = baseUrl + '/book/' + encodeURIComponent(slug) + '?embed=true';

  // ─── Helpers ───

  function createIframe(extraStyles) {
    var iframe = document.createElement('iframe');
    iframe.src = iframeSrc;
    iframe.setAttribute('allow', 'payment');
    iframe.setAttribute('loading', 'lazy');
    iframe.style.cssText = 'border:none;width:100%;' + (extraStyles || '');
    return iframe;
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ─── Mode 1: Floating Button ───

  if (mode === 'button') {
    // Create floating button
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.setAttribute('aria-label', label);
    var isRight = position !== 'bottom-left';
    btn.style.cssText = [
      'position:fixed',
      'bottom:24px',
      isRight ? 'right:24px' : 'left:24px',
      'z-index:99998',
      'background:' + color,
      'color:#fff',
      'border:none',
      'padding:14px 28px',
      'border-radius:50px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'font-size:15px',
      'font-weight:600',
      'cursor:pointer',
      'box-shadow:0 4px 14px ' + hexToRgba(color, 0.4),
      'transition:transform 0.2s ease,box-shadow 0.2s ease',
      'letter-spacing:0.01em',
    ].join(';');

    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 20px ' + hexToRgba(color, 0.5);
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 14px ' + hexToRgba(color, 0.4);
    });

    document.body.appendChild(btn);

    // Overlay
    var overlay = null;

    function openOverlay() {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:99999',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:rgba(0,0,0,0.45)',
        'backdrop-filter:blur(2px)',
        'animation:nestoFadeIn 0.2s ease',
      ].join(';');

      // Inject animation keyframes
      if (!document.getElementById('nesto-keyframes')) {
        var style = document.createElement('style');
        style.id = 'nesto-keyframes';
        style.textContent =
          '@keyframes nestoFadeIn{from{opacity:0}to{opacity:1}}' +
          '@keyframes nestoSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(style);
      }

      // Container card
      var card = document.createElement('div');
      card.style.cssText = [
        'position:relative',
        'width:100%',
        'max-width:440px',
        'max-height:90vh',
        'margin:16px',
        'border-radius:20px',
        'overflow:hidden',
        'background:#fff',
        'box-shadow:0 25px 60px rgba(0,0,0,0.3)',
        'animation:nestoSlideUp 0.25s ease',
      ].join(';');

      // Close button
      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&#10005;';
      closeBtn.setAttribute('aria-label', 'Sluiten');
      closeBtn.style.cssText = [
        'position:absolute',
        'top:12px',
        'right:12px',
        'z-index:2',
        'background:rgba(0,0,0,0.06)',
        'border:none',
        'width:32px',
        'height:32px',
        'border-radius:50%',
        'font-size:14px',
        'cursor:pointer',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'color:#666',
        'transition:background 0.15s',
      ].join(';');
      closeBtn.addEventListener('mouseenter', function () { closeBtn.style.background = 'rgba(0,0,0,0.1)'; });
      closeBtn.addEventListener('mouseleave', function () { closeBtn.style.background = 'rgba(0,0,0,0.06)'; });
      closeBtn.addEventListener('click', closeOverlay);

      var iframe = createIframe('height:600px;max-height:80vh;border-radius:20px;');

      card.appendChild(closeBtn);
      card.appendChild(iframe);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Close on backdrop click
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeOverlay();
      });
    }

    function closeOverlay() {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', openOverlay);

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOverlay();
    });

    // postMessage listener
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'nesto:close') closeOverlay();
    });
  }

  // ─── Mode 2: Inline Embed ───

  if (mode === 'inline') {
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[Nesto] Container #' + containerId + ' not found');
      return;
    }

    var iframe = createIframe('height:700px;');
    container.appendChild(iframe);

    // Auto-resize via postMessage
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'nesto:resize' && typeof e.data.height === 'number') {
        iframe.style.height = e.data.height + 'px';
      }
    });
  }
})();
