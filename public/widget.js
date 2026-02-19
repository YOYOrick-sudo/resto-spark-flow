(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute('data-slug');
  if (!slug) { console.warn('[Nesto] data-slug is required'); return; }

  var mode = script.getAttribute('data-mode') || 'button';
  var label = script.getAttribute('data-label') || 'Reserveer';
  var position = script.getAttribute('data-position') || 'bottom-right';
  var color = script.getAttribute('data-color') || '#1d979e';
  var containerId = script.getAttribute('data-container') || 'nesto-booking';
  var pulse = script.getAttribute('data-pulse') === 'true';
  var logoUrl = script.getAttribute('data-logo') || '';
  var restaurantName = script.getAttribute('data-name') || '';
  var accentColor = script.getAttribute('data-accent') || '#ffffff';

  var src = script.src;
  var baseUrl = src.substring(0, src.lastIndexOf('/'));
  var iframeSrc = baseUrl + '/book/' + encodeURIComponent(slug) + '?embed=true';

  // ─── Helpers ───

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function darkenHex(hex, percent) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    l = Math.max(0, l - percent / 100);
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var rr, gg, bb;
    if (s === 0) { rr = gg = bb = l; } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      rr = hue2rgb(p, q, h + 1/3);
      gg = hue2rgb(p, q, h);
      bb = hue2rgb(p, q, h - 1/3);
    }
    var toHex = function(v) { var x = Math.round(v * 255).toString(16); return x.length === 1 ? '0' + x : x; };
    return '#' + toHex(rr) + toHex(gg) + toHex(bb);
  }

  function isMobile() {
    return window.innerWidth < 768;
  }

  // ─── Preconnect ───

  function injectPreconnect() {
    var link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = baseUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  // ─── Font injection ───

  function injectFont() {
    if (document.getElementById('nesto-font')) return;
    try {
      if (document.fonts && document.fonts.check('600 14px "Plus Jakarta Sans"')) return;
    } catch (e) { /* proceed with injection */ }
    var link = document.createElement('link');
    link.id = 'nesto-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600&display=swap';
    document.head.appendChild(link);
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
      '@keyframes nestoButtonEntrance{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes nestoPulseRing{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.3)}50%{box-shadow:0 0 0 4px rgba(255,255,255,0)}}',
      '@keyframes nestoDotPulse{0%,100%{opacity:1}50%{opacity:0.5}}',
      '@keyframes nestoSkeletonPulse{0%,100%{opacity:.6}50%{opacity:.3}}',
    ].join('');
    document.head.appendChild(style);
  }

  var FONT_FAMILY = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

  // ─── Shadow helpers (premium pill with glassmorphism) ───

  var glassInset = 'inset 0 0 0 1px rgba(255,255,255,0.15)';
  var glassInsetHover = 'inset 0 0 0 1px rgba(255,255,255,0.2)';
  var shadowRest = '0 2px 8px rgba(0,0,0,0.12),0 8px 24px rgba(0,0,0,0.08),' + glassInset;
  var shadowHover = '0 4px 12px rgba(0,0,0,0.15),0 12px 32px rgba(0,0,0,0.12),' + glassInsetHover;

  // ─── Close button factory ───

  function createCloseButton(onClick) {
    var btn = document.createElement('button');
    btn.innerHTML = '&#10005;';
    btn.setAttribute('aria-label', 'Sluiten');
    btn.style.cssText = [
      'position:absolute', 'top:12px', 'right:12px', 'z-index:2',
      'background:rgba(0,0,0,0.06)', 'border:none', 'width:40px', 'height:40px',
      'border-radius:50%', 'font-size:14px', 'cursor:pointer', 'display:flex',
      'align-items:center', 'justify-content:center', 'color:#666',
      'transition:background 0.15s',
    ].join(';');
    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(0,0,0,0.1)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(0,0,0,0.06)'; });
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ─── Skeleton builder ───

  function createSkeleton() {
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;inset:0;z-index:3;background:#fff;display:flex;flex-direction:column;padding:32px 24px;transition:opacity 0.3s ease';

    if (logoUrl || restaurantName) {
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:28px';
      if (logoUrl) {
        var img = document.createElement('img');
        img.src = logoUrl;
        img.alt = '';
        img.style.cssText = 'width:40px;height:40px;border-radius:10px;object-fit:cover';
        header.appendChild(img);
      }
      if (restaurantName) {
        var nameEl = document.createElement('span');
        nameEl.textContent = restaurantName;
        nameEl.style.cssText = 'font-family:' + FONT_FAMILY + ';font-size:16px;font-weight:600;color:#111';
        header.appendChild(nameEl);
      }
      wrapper.appendChild(header);
    }

    var skeletonCSS = 'background:#f3f4f6;border-radius:8px;animation:nestoSkeletonPulse 1.5s ease-in-out infinite';

    var bar = document.createElement('div');
    bar.style.cssText = skeletonCSS + ';height:14px;width:60%;margin-bottom:24px';
    wrapper.appendChild(bar);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:24px';
    for (var i = 0; i < 28; i++) {
      var cell = document.createElement('div');
      cell.style.cssText = skeletonCSS + ';height:36px;border-radius:10px;animation-delay:' + (i * 0.03) + 's';
      grid.appendChild(cell);
    }
    wrapper.appendChild(grid);

    var spacer = document.createElement('div');
    spacer.style.cssText = 'flex:1';
    wrapper.appendChild(spacer);

    var cta = document.createElement('div');
    cta.style.cssText = skeletonCSS + ';height:48px;border-radius:16px;width:100%';
    wrapper.appendChild(cta);

    return wrapper;
  }

  // ─── iframe factory ───

  function createIframe(extraStyles) {
    var iframe = document.createElement('iframe');
    iframe.src = iframeSrc;
    iframe.setAttribute('allow', 'payment');
    iframe.setAttribute('loading', 'lazy');
    iframe.style.cssText = 'border:none;width:100%;' + (extraStyles || '');
    return iframe;
  }

  // ─── Mode 1: Floating Button → Slide-in Panel ───

  if (mode === 'button') {
    injectPreconnect();
    injectFont();
    injectKeyframes();

    // Initialize inset ring with accentColor
    // Override shadows with accentColor inset ring
    glassInset = 'inset 0 0 0 1.5px ' + hexToRgba(accentColor, 0.3);
    glassInsetHover = 'inset 0 0 0 1.5px ' + hexToRgba(accentColor, 0.45);
    shadowRest = '0 2px 8px rgba(0,0,0,0.12),0 8px 24px rgba(0,0,0,0.08),' + glassInset;
    shadowHover = '0 4px 12px rgba(0,0,0,0.15),0 12px 32px rgba(0,0,0,0.12),' + glassInsetHover;

    var mobile = isMobile();

    // ─── Create floating button ───
    var btn = document.createElement('button');
    btn.setAttribute('aria-label', label);

    // Accent dot (always visible, with pulse animation)
    var dot = document.createElement('span');
    dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:' + accentColor + ';margin-right:10px;flex-shrink:0;animation:nestoDotPulse 2s ease-in-out infinite';
    btn.appendChild(dot);

    var textSpan = document.createElement('span');
    textSpan.textContent = label;
    btn.appendChild(textSpan);

    var isRight = position !== 'bottom-left';

    var btnBase = [
      'position:fixed',
      'z-index:99998',
      'background:' + color,
      'color:' + accentColor,
      'border:none',
      'border-radius:50px',
      'font-family:' + FONT_FAMILY,
      'font-weight:600',
      'letter-spacing:0.05em',
      'text-transform:uppercase',
      'cursor:pointer',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'transition:transform 0.2s ease,box-shadow 0.2s ease',
      'opacity:0',
      'animation:nestoButtonEntrance 0.35s ease 0.3s forwards',
      'box-shadow:' + shadowRest,
      'border:none',
    ];

    if (mobile) {
      btnBase.push(
        'bottom:20px', 'right:20px',
        'padding:10px 20px', 'font-size:13px'
      );
    } else {
      btnBase.push(
        'bottom:24px',
        isRight ? 'right:24px' : 'left:24px',
        'padding:12px 24px', 'font-size:14px'
      );
    }

    btn.style.cssText = btnBase.join(';');

    // Hover effects
    btn.addEventListener('mouseenter', function () {
      if (!mobile) {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = shadowHover;
      }
    });
    btn.addEventListener('mouseleave', function () {
      if (!mobile) {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = shadowRest;
      }
    });

    // Active/press state
    var isPressed = false;
    btn.addEventListener('pointerdown', function () {
      isPressed = true;
      btn.style.transform = 'scale(0.98)';
      btn.style.boxShadow = shadowRest;
      btn.style.transitionDuration = '0.1s';
    });
    btn.addEventListener('pointerup', function () {
      isPressed = false;
      btn.style.transitionDuration = '0.2s';
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = shadowRest;
    });
    btn.addEventListener('pointerleave', function () {
      if (isPressed) {
        isPressed = false;
        btn.style.transitionDuration = '0.2s';
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = shadowRest;
      }
    });

    // Pulse dot
    if (pulse) {
      btn.style.animation = 'nestoButtonEntrance 0.35s ease 0.3s forwards,nestoPulseRing 2.5s ease-in-out 1s infinite';
    }

    document.body.appendChild(btn);

    // ─── Preload logic ───
    var preloadedIframe = null;
    var iframeLoaded = false;
    var hiddenContainer = null;

    function preloadIframe() {
      if (preloadedIframe) return;
      hiddenContainer = document.createElement('div');
      hiddenContainer.style.cssText = 'position:fixed;top:0;left:-9999px;width:420px;height:100vh;opacity:0;pointer-events:none;z-index:-1';
      preloadedIframe = createIframe('flex:1;height:100%');
      preloadedIframe.addEventListener('load', function () { iframeLoaded = true; });
      hiddenContainer.appendChild(preloadedIframe);
      document.body.appendChild(hiddenContainer);
    }

    if (!mobile) {
      btn.addEventListener('mouseenter', preloadIframe);
    }

    // ─── Panel overlay ───
    var overlay = null;

    function openPanel() {
      if (overlay) return;

      var m = isMobile();

      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.4);animation:nestoFadeIn 0.2s ease';

      var panel = document.createElement('div');
      if (m) {
        panel.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#fff;display:flex;flex-direction:column;animation:nestoSlideInUp 0.3s ease-out';
      } else {
        panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:420px;z-index:100000;background:#fff;box-shadow:-8px 0 24px rgba(0,0,0,0.12);display:flex;flex-direction:column;animation:nestoSlideInRight 0.3s ease-out';
      }

      var closeBtn = createCloseButton(closePanel);
      panel.appendChild(closeBtn);

      if (preloadedIframe && iframeLoaded) {
        preloadedIframe.style.cssText = 'border:none;width:100%;flex:1;height:100%;opacity:1;pointer-events:auto';
        panel.appendChild(preloadedIframe);
      } else {
        var skeleton = createSkeleton();
        panel.appendChild(skeleton);

        var iframe;
        if (preloadedIframe) {
          iframe = preloadedIframe;
          iframe.style.cssText = 'border:none;width:100%;flex:1;height:100%;opacity:0;position:absolute;inset:0';
        } else {
          iframe = createIframe('flex:1;height:100%;opacity:0;position:absolute;inset:0');
          preloadedIframe = iframe;
        }
        panel.appendChild(iframe);

        var revealed = false;
        function revealIframe() {
          if (revealed) return;
          revealed = true;
          skeleton.style.opacity = '0';
          iframe.style.opacity = '1';
          iframe.style.position = 'relative';
          iframe.style.inset = 'auto';
          setTimeout(function () { skeleton.remove(); }, 300);
        }

        iframe.addEventListener('load', function () {
          iframeLoaded = true;
          revealIframe();
        });

        setTimeout(revealIframe, 8000);
      }

      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closePanel();
      });
    }

    function closePanel() {
      if (!overlay) return;

      if (preloadedIframe && iframeLoaded) {
        if (!hiddenContainer) {
          hiddenContainer = document.createElement('div');
          hiddenContainer.style.cssText = 'position:fixed;top:0;left:-9999px;width:420px;height:100vh;opacity:0;pointer-events:none;z-index:-1';
          document.body.appendChild(hiddenContainer);
        }
        preloadedIframe.style.cssText = 'border:none;width:100%;flex:1;height:100%;opacity:0;pointer-events:none';
        hiddenContainer.appendChild(preloadedIframe);
      }

      overlay.remove();
      overlay = null;
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', openPanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

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

    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'nesto:resize' && typeof e.data.height === 'number') {
        iframe.style.height = e.data.height + 'px';
      }
    });
  }
})();
