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
    return new Response('// Missing slug', {
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }

  const baseUrl = Deno.env.get('SUPABASE_URL')!;
  const configUrl = `${baseUrl}/functions/v1/marketing-popup-config?slug=${encodeURIComponent(slug)}`;
  const subscribeUrl = `${baseUrl}/functions/v1/marketing-popup-subscribe`;
  const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app';

  const script = `
(function(){
  "use strict";
  var CONFIG_URL="${configUrl}";
  var SUBSCRIBE_URL="${subscribeUrl}";
  var SLUG="${slug}";
  var SITE_URL="${publicSiteUrl}";

  function init(){
    fetch(CONFIG_URL).then(function(r){return r.json()}).then(function(cfg){
      if(!cfg.is_active)return;
      var host=document.createElement("div");
      host.id="nesto-popup-host";
      document.body.appendChild(host);
      var shadow=host.attachShadow({mode:"closed"});

      var primaryColor=cfg.primary_color||"#1d979e";
      var ft=cfg.featured_ticket;

      var styles=document.createElement("style");
      styles.textContent=\`
        *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
        .nesto-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999998;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;}
        .nesto-overlay.visible{opacity:1;}
        .nesto-popup{background:#fff;border-radius:16px;padding:32px;max-width:420px;width:calc(100vw - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative;transform:translateY(20px);transition:transform .3s ease;}
        .nesto-overlay.visible .nesto-popup{transform:translateY(0);}
        .nesto-close{position:absolute;top:12px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;}
        .nesto-close:hover{background:#f3f4f6;}
        .nesto-logo{max-height:40px;max-width:160px;margin-bottom:16px;}
        .nesto-headline{font-size:20px;font-weight:700;color:#111827;margin-bottom:8px;line-height:1.3;}
        .nesto-desc{font-size:14px;color:#6b7280;margin-bottom:20px;line-height:1.5;}
        .nesto-form{display:flex;gap:8px;}
        .nesto-input{flex:1;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;transition:border-color .2s;}
        .nesto-input:focus{border-color:\${primaryColor};}
        .nesto-btn{padding:10px 20px;background:\${primaryColor};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity .2s;}
        .nesto-btn:hover{opacity:0.9;}
        .nesto-btn:disabled{opacity:0.6;cursor:not-allowed;}
        .nesto-gdpr{font-size:11px;color:#9ca3af;margin-top:12px;line-height:1.4;}
        .nesto-success{text-align:center;padding:16px 0;}
        .nesto-success-icon{font-size:40px;color:\${primaryColor};margin-bottom:12px;}
        .nesto-success-msg{font-size:16px;font-weight:600;color:#111827;}

        .nesto-featured{display:flex;align-items:center;gap:10px;margin-top:16px;padding:10px 12px;border-radius:10px;border:1.5px solid #e5e7eb;text-decoration:none;transition:border-color .2s,background .2s;cursor:pointer;}
        .nesto-featured:hover{background:#f9fafb;}
        .nesto-featured-bar{width:4px;height:32px;border-radius:4px;flex-shrink:0;}
        .nesto-featured-info{flex:1;min-width:0;}
        .nesto-featured-title{font-size:13px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .nesto-featured-desc{font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .nesto-featured-cta{font-size:11px;font-weight:600;padding:5px 10px;border-radius:6px;color:#fff;flex-shrink:0;text-decoration:none;}

        .nesto-bar{position:fixed;left:0;right:0;z-index:999997;background:#fff;box-shadow:0 -2px 10px rgba(0,0,0,0.1);padding:12px 16px;display:flex;align-items:center;gap:12px;transform:translateY(100%);transition:transform .3s ease;}
        .nesto-bar.top{top:0;box-shadow:0 2px 10px rgba(0,0,0,0.1);transform:translateY(-100%);}
        .nesto-bar.bottom{bottom:0;}
        .nesto-bar.visible{transform:translateY(0);}
        .nesto-bar-text{flex:1;font-size:14px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .nesto-bar .nesto-input{width:200px;flex:none;padding:8px 12px;font-size:13px;}
        .nesto-bar .nesto-btn{padding:8px 16px;font-size:13px;}
        .nesto-bar-close{background:none;border:none;font-size:18px;cursor:pointer;color:#6b7280;padding:4px;}

        @media(max-width:600px){
          .nesto-form{flex-direction:column;}
          .nesto-bar{flex-wrap:wrap;}
          .nesto-bar .nesto-input{width:100%;flex:1;}
          .nesto-bar-text{width:100%;}
        }
      \`;
      shadow.appendChild(styles);

      function buildFeaturedHTML(){
        if(!ft)return "";
        var bookUrl=SITE_URL+"/reserveren/"+SLUG;
        return '<a class="nesto-featured" href="'+bookUrl+'" target="_blank" rel="noopener">'
          +'<div class="nesto-featured-bar" style="background:'+esc(ft.color)+'"></div>'
          +'<div class="nesto-featured-info">'
          +'<div class="nesto-featured-title">'+esc(ft.display_title)+'</div>'
          +(ft.short_description?'<div class="nesto-featured-desc">'+esc(ft.short_description)+'</div>':'')
          +'</div>'
          +'<span class="nesto-featured-cta" style="background:'+esc(ft.color)+'">Reserveer</span>'
          +'</a>';
      }

      function showPopup(triggerId){
        if(sessionStorage.getItem(triggerId))return;
        sessionStorage.setItem(triggerId,"1");

        var overlay=document.createElement("div");
        overlay.className="nesto-overlay";
        overlay.innerHTML=\`
          <div class="nesto-popup">
            <button class="nesto-close" aria-label="Sluiten">&times;</button>
            \${cfg.logo_url?'<img class="nesto-logo" src="'+cfg.logo_url+'" alt="Logo">':''}
            <div class="nesto-headline">\${esc(cfg.headline)}</div>
            <div class="nesto-desc">\${esc(cfg.description)}</div>
            <form class="nesto-form">
              <input class="nesto-input" type="email" placeholder="je@email.nl" required>
              <button class="nesto-btn" type="submit">\${esc(cfg.button_text)}</button>
            </form>
            \${buildFeaturedHTML()}
            <div class="nesto-gdpr">\${esc(cfg.gdpr_text)}</div>
          </div>
        \`;
        shadow.appendChild(overlay);
        requestAnimationFrame(function(){overlay.classList.add("visible");});

        overlay.querySelector(".nesto-close").addEventListener("click",function(){
          overlay.classList.remove("visible");
          setTimeout(function(){overlay.remove();},300);
        });
        overlay.addEventListener("click",function(e){
          if(e.target===overlay){
            overlay.classList.remove("visible");
            setTimeout(function(){overlay.remove();},300);
          }
        });

        var form=overlay.querySelector("form");
        form.addEventListener("submit",function(e){
          e.preventDefault();
          var input=form.querySelector("input");
          var btn=form.querySelector("button");
          btn.disabled=true;
          btn.textContent="...";
          subscribe(input.value,function(){
            overlay.querySelector(".nesto-popup").innerHTML=\`
              <div class="nesto-success">
                <div class="nesto-success-icon">✓</div>
                <div class="nesto-success-msg">\${esc(cfg.success_message)}</div>
              </div>
            \`;
            setTimeout(function(){
              overlay.classList.remove("visible");
              setTimeout(function(){overlay.remove();},300);
            },2500);
          },function(){
            btn.disabled=false;
            btn.textContent=cfg.button_text;
          });
        });
      }

      // Sticky bar
      if(cfg.sticky_bar_enabled){
        var barKey="nesto_bar_dismissed";
        if(!sessionStorage.getItem(barKey)){
          var bar=document.createElement("div");
          bar.className="nesto-bar "+(cfg.sticky_bar_position==="top"?"top":"bottom");
          bar.innerHTML=\`
            <span class="nesto-bar-text">\${esc(cfg.headline)}</span>
            <input class="nesto-input" type="email" placeholder="je@email.nl">
            <button class="nesto-btn">\${esc(cfg.button_text)}</button>
            <button class="nesto-bar-close" aria-label="Sluiten">&times;</button>
          \`;
          shadow.appendChild(bar);
          requestAnimationFrame(function(){bar.classList.add("visible");});

          bar.querySelector(".nesto-bar-close").addEventListener("click",function(){
            sessionStorage.setItem(barKey,"1");
            bar.classList.remove("visible");
            setTimeout(function(){bar.remove();},300);
          });

          var barBtn=bar.querySelector(".nesto-btn");
          var barInput=bar.querySelector(".nesto-input");
          barBtn.addEventListener("click",function(){
            if(!barInput.value||!barInput.value.includes("@"))return;
            barBtn.disabled=true;
            barBtn.textContent="...";
            subscribe(barInput.value,function(){
              bar.innerHTML='<span class="nesto-bar-text" style="text-align:center;width:100%">✓ '+esc(cfg.success_message)+'</span>';
              setTimeout(function(){
                bar.classList.remove("visible");
                setTimeout(function(){bar.remove();},300);
              },2500);
            },function(){
              barBtn.disabled=false;
              barBtn.textContent=cfg.button_text;
            });
          });
        }
      }

      // Exit-intent popup (desktop only)
      if(cfg.exit_intent_enabled&&!("ontouchstart" in window)){
        document.addEventListener("mouseout",function handler(e){
          if(e.clientY<=0){
            document.removeEventListener("mouseout",handler);
            showPopup("nesto_popup_exit_shown");
          }
        });
      }

      // Timed popup
      if(cfg.timed_popup_enabled){
        setTimeout(function(){
          showPopup("nesto_popup_timed_shown");
        },(cfg.timed_popup_delay_seconds||15)*1000);
      }

      function subscribe(email,onSuccess,onError){
        fetch(SUBSCRIBE_URL,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({slug:SLUG,email:email})
        }).then(function(r){
          if(r.ok)onSuccess();
          else onError();
        }).catch(onError);
      }

      function esc(s){
        var d=document.createElement("div");
        d.textContent=s||"";
        return d.innerHTML;
      }
    }).catch(function(err){console.warn("[Nesto] Widget load failed:",err);});
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();
`;

  return new Response(script, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
});
