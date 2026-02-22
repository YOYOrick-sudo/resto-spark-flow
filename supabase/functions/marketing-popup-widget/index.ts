// Marketing popup widget - serves embeddable JS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  const isPreview = url.searchParams.get('preview') === 'true';
  const popupId = url.searchParams.get('popup_id');

  if (!slug) {
    return new Response('// Missing slug', {
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }

  const baseUrl = Deno.env.get('SUPABASE_URL')!;
  let configUrl = `${baseUrl}/functions/v1/marketing-popup-config?slug=${encodeURIComponent(slug)}`;
  if (isPreview) {
    configUrl += '&preview=true';
    if (popupId) configUrl += `&popup_id=${encodeURIComponent(popupId)}`;
  }
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
      var popupType=cfg.popup_type||"newsletter";

      var styles=document.createElement("style");
      styles.textContent=\`
        *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
        .nesto-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999998;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;}
        .nesto-overlay.visible{opacity:1;}
        .nesto-popup{background:#fff;border-radius:24px;padding:32px;max-width:420px;width:calc(100vw - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative;transform:translateY(20px);transition:transform .3s ease;text-align:center;}
        .nesto-overlay.visible .nesto-popup{transform:translateY(0);}
        .nesto-close{position:absolute;top:12px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .2s,color .2s;}
        .nesto-close:hover{background:\${primaryColor}10;color:\${primaryColor};}
        .nesto-logo{max-height:40px;max-width:160px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;}
        .nesto-headline{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:8px;line-height:1.3;text-align:center;}
        .nesto-desc{font-size:14px;color:#666;margin-bottom:20px;line-height:1.5;text-align:center;}
        .nesto-form{display:flex;gap:8px;justify-content:center;}
        .nesto-input{flex:1;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:12px;font-size:14px;outline:none;transition:border-color .2s;}
        .nesto-input:focus{border-color:\${primaryColor};}
        .nesto-btn{padding:10px 20px;background:\${primaryColor};color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity .2s;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
        .nesto-btn:hover{opacity:0.9;}
        .nesto-btn:disabled{opacity:0.6;cursor:not-allowed;}
        .nesto-btn-full{width:100%;text-align:center;}
        .nesto-gdpr{font-size:11px;color:#9ca3af;margin-top:12px;line-height:1.4;text-align:center;}
        .nesto-success{text-align:center;padding:16px 0;}
        .nesto-success-icon{font-size:40px;color:\${primaryColor};margin-bottom:12px;}
        .nesto-success-msg{font-size:16px;font-weight:600;color:#1a1a1a;}

        .nesto-featured{display:block;width:100%;padding:16px;border-radius:24px;margin-bottom:16px;text-decoration:none;transition:opacity .2s;cursor:pointer;text-align:left;}
        .nesto-featured:hover{opacity:0.9;}
        .nesto-featured-title{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:4px;}
        .nesto-featured-desc{font-size:13px;color:#666;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

        .nesto-bar{position:fixed;left:0;right:0;z-index:999997;padding:12px 16px;display:flex;align-items:center;gap:12px;transform:translateY(100%);transition:transform .3s ease;}
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
      \`;
      shadow.appendChild(styles);

      function buildFeaturedHTML(){
        if(!ft)return "";
        var bookUrl=SITE_URL+"/book/"+SLUG;
        var bgGradient="linear-gradient(180deg, "+esc(ft.color)+"18 0%, transparent 100%)";
        return '<a class="nesto-featured" href="'+bookUrl+'" target="_blank" rel="noopener" style="background:'+bgGradient+'">'
          +'<div class="nesto-featured-title">'+esc(ft.display_title)+'</div>'
          +(ft.short_description?'<div class="nesto-featured-desc">'+esc(ft.short_description)+'</div>':'')
          +'</a>';
      }

      function buildPopupContent(){
        var logoHtml=cfg.logo_url?'<img class="nesto-logo" src="'+cfg.logo_url+'" alt="Logo">':'';
        var headlineHtml='<div class="nesto-headline">'+esc(cfg.headline)+'</div>';
        var descHtml='<div class="nesto-desc">'+esc(cfg.description).replace(/\\n/g,"<br>")+'</div>';

        if(popupType==="reservation"){
          var bookUrl=SITE_URL+"/book/"+SLUG;
          return logoHtml+headlineHtml+descHtml
            +buildFeaturedHTML()
            +'<a class="nesto-btn nesto-btn-full" href="'+bookUrl+'" target="_blank" rel="noopener">'+esc(cfg.button_text)+'</a>';
        }
        if(popupType==="custom"){
          var customUrl=cfg.custom_button_url||"#";
          return logoHtml+headlineHtml+descHtml
            +'<a class="nesto-btn nesto-btn-full" href="'+esc(customUrl)+'" target="_blank" rel="noopener">'+esc(cfg.button_text)+'</a>';
        }
        // newsletter (default)
        return logoHtml+headlineHtml+descHtml
          +'<form class="nesto-form">'
          +'<input class="nesto-input" type="email" placeholder="je@email.nl" required>'
          +'<button class="nesto-btn" type="submit">'+esc(cfg.button_text)+'</button>'
          +'</form>'
          +'<div class="nesto-gdpr">'+esc(cfg.gdpr_text)+'</div>';
      }

      function showPopup(triggerId){
        if(sessionStorage.getItem(triggerId))return;
        sessionStorage.setItem(triggerId,"1");

        var overlay=document.createElement("div");
        overlay.className="nesto-overlay";
        overlay.innerHTML='<div class="nesto-popup">'
          +'<button class="nesto-close" aria-label="Sluiten">&times;</button>'
          +buildPopupContent()
          +'</div>';
        shadow.appendChild(overlay);
        requestAnimationFrame(function(){overlay.classList.add("visible");});

        function closeOverlay(){
          overlay.classList.remove("visible");
          setTimeout(function(){overlay.remove();},300);
        }

        overlay.querySelector(".nesto-close").addEventListener("click",closeOverlay);
        overlay.addEventListener("click",function(e){if(e.target===overlay)closeOverlay();});

        // Newsletter form handler
        if(popupType==="newsletter"){
          var form=overlay.querySelector("form");
          if(form){
            form.addEventListener("submit",function(e){
              e.preventDefault();
              var input=form.querySelector("input");
              var btn=form.querySelector("button");
              btn.disabled=true;btn.textContent="...";
              subscribe(input.value,function(){
                overlay.querySelector(".nesto-popup").innerHTML=
                  '<div class="nesto-success">'
                  +'<div class="nesto-success-icon">✓</div>'
                  +'<div class="nesto-success-msg">'+esc(cfg.success_message)+'</div>'
                  +'</div>';
                setTimeout(function(){closeOverlay();},2500);
              },function(){
                btn.disabled=false;btn.textContent=cfg.button_text;
              });
            });
          }
        }
      }

      // Sticky bar
      if(cfg.sticky_bar_enabled){
        var barKey="nesto_bar_dismissed";
        if(!sessionStorage.getItem(barKey)){
          var bar=document.createElement("div");
          bar.className="nesto-bar "+(cfg.sticky_bar_position==="top"?"top":"bottom");
          bar.style.background=primaryColor;

          var barHtml='<span class="nesto-bar-text">'+esc(cfg.headline)+'</span>';
          if(popupType==="newsletter"){
            barHtml+='<input class="nesto-input" type="email" placeholder="je@email.nl">'
              +'<button class="nesto-btn">'+esc(cfg.button_text)+'</button>';
          } else if(popupType==="reservation"){
            var bookUrl=SITE_URL+"/book/"+SLUG;
            barHtml+='<a class="nesto-btn" href="'+bookUrl+'" target="_blank" rel="noopener">'+esc(cfg.button_text)+'</a>';
          } else {
            var customUrl=cfg.custom_button_url||"#";
            barHtml+='<a class="nesto-btn" href="'+esc(customUrl)+'" target="_blank" rel="noopener">'+esc(cfg.button_text)+'</a>';
          }
          barHtml+='<button class="nesto-bar-close" aria-label="Sluiten">&times;</button>';
          bar.innerHTML=barHtml;
          shadow.appendChild(bar);
          requestAnimationFrame(function(){bar.classList.add("visible");});

          bar.querySelector(".nesto-bar-close").addEventListener("click",function(){
            sessionStorage.setItem(barKey,"1");
            bar.classList.remove("visible");
            setTimeout(function(){bar.remove();},300);
          });

          // Newsletter bar subscribe
          if(popupType==="newsletter"){
            var barBtn=bar.querySelector(".nesto-btn");
            var barInput=bar.querySelector(".nesto-input");
            barBtn.addEventListener("click",function(){
              if(!barInput.value||!barInput.value.includes("@"))return;
              barBtn.disabled=true;barBtn.textContent="...";
              subscribe(barInput.value,function(){
                bar.innerHTML='<span class="nesto-bar-text" style="text-align:center;width:100%">✓ '+esc(cfg.success_message)+'</span>';
                setTimeout(function(){
                  bar.classList.remove("visible");
                  setTimeout(function(){bar.remove();},300);
                },2500);
              },function(){
                barBtn.disabled=false;barBtn.textContent=cfg.button_text;
              });
            });
          }
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

      // Fallback: show popup immediately if active but no trigger is set
      if(!cfg.timed_popup_enabled && !cfg.exit_intent_enabled){
        setTimeout(function(){
          showPopup("nesto_popup_auto_shown");
        },500);
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
