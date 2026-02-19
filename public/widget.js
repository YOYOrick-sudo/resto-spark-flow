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

  function isMobile() {
    return window.innerWidth < 768;
  }

  // ─── Keyframes injection ───

  function injectKeyframes() {
    if (document.getElementById('nesto-keyframes')) return;
    var style = document.createElement('style');
    style.id = 'nesto-keyframes';
    style.textContent = [
      '@keyframes nestoFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes nestoSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}',
      '@keyframes nestoSlideInUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    ].join('');
    document.head.appendChild(style);
  }

  // ─── Close button factory ───

  function createCloseButton(onClick) {
    var btn = document.createElement('button');
    btn.innerHTML = '&#10005;';
    btn.setAttribute('aria-label', 'Sluiten');
    btn.style.cssText = [
      'position:absolute',
      'top:12px',
      'right:12px',
      'z-index:2',
      'background:rgba(0,0,0,0.06)',
      'border:none',
      'width:40px',
      'height:40px',
      'border-radius:50%',
      'font-size:14px',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'color:#666',
      'transition:background 0.15s',
    ].join(';');
    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(0,0,0,0.1)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(0,0,0,0.06)'; });
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ─── Mode 1: Floating Button → Slide-in Panel ───

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

    // Panel overlay
    var overlay = null;

    function openPanel() {
      if (overlay) return;
      injectKeyframes();

      var mobile = isMobile();

      // Backdrop
      overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:99999',
        'background:rgba(0,0,0,0.4)',
        'animation:nestoFadeIn 0.2s ease',
      ].join(';');

      // Panel container
      var panel = document.createElement('div');
      if (mobile) {
        panel.style.cssText = [
          'position:fixed',
          'inset:0',
          'z-index:100000',
          'background:#fff',
          'display:flex',
          'flex-direction:column',
          'animation:nestoSlideInUp 0.3s ease-out',
        ].join(';');
      } else {
        panel.style.cssText = [
          'position:fixed',
          'top:0',
          'right:0',
          'bottom:0',
          'width:420px',
          'z-index:100000',
          'background:#fff',
          'box-shadow:-8px 0 24px rgba(0,0,0,0.12)',
          'display:flex',
          'flex-direction:column',
          'animation:nestoSlideInRight 0.3s ease-out',
        ].join(';');
      }

      var iframe = createIframe('flex:1;height:100%;');
      var closeBtn = createCloseButton(closePanel);

      panel.appendChild(closeBtn);
      panel.appendChild(iframe);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Close on backdrop click (not on panel)
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closePanel();
      });
    }

    function closePanel() {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', openPanel);

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    // postMessage listener
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'nesto:close') closePanel();
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
