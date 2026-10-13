// Empresas: WhatsApp con mensaje de cotización, opciones del formulario en el idioma elegido y envío a Netlify Forms.
(function(){
  var WHATSAPP = "573108286602";
  var root = document.documentElement;
  var lang = function(){ return root.getAttribute("data-lang") === "es" ? "es" : "en"; };
  function sync(){
    var l = lang();
    document.querySelectorAll("a[data-wa-es]").forEach(function(a){
      a.setAttribute("href", "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(a.getAttribute("data-wa-" + l)));
      a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
    });
    document.querySelectorAll("option[data-es]").forEach(function(o){
      if(!o.dataset.en) o.dataset.en = o.textContent;
      o.textContent = o.dataset[l];
    });
    var idi = document.getElementById("ev-idioma"); if(idi) idi.value = l;
  }
  sync();
  // site.js cambia data-lang en su propio click; este listener se registra después y lee el idioma ya cambiado.
  document.querySelectorAll(".lang button").forEach(function(b){ b.addEventListener("click", sync); });

  var form = document.getElementById("eventos");
  if(!form) return;
  try{
    var q = new URLSearchParams(location.search);
    var src = q.get("utm_source") || q.get("origen") || q.get("ref") || sessionStorage.getItem("cs-origen");
    if(src) document.getElementById("ev-origen").value = src;
  }catch(e){}
  var hosted = /netlify\.app$|casa-?salvaje\.com$/.test(location.hostname);
  var sending = false;
  function done(){
    form.hidden = true;
    var ok = document.getElementById("ev-ok"); ok.hidden = false;
    try{ ok.scrollIntoView({block:"center", behavior:"smooth"}); }catch(e){}
  }
  form.addEventListener("submit", function(e){
    e.preventDefault();
    if(!form.reportValidity()) return;
    if(!hosted){ done(); return; }
    if(sending) return; sending = true;
    var btn = document.getElementById("ev-submit"); if(btn) btn.disabled = true;
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
                 body: new URLSearchParams(new FormData(form)).toString() })
      .then(function(r){ if(!r.ok) throw new Error(r.status); done(); })
      .catch(function(){ HTMLFormElement.prototype.submit.call(form); });
  });
})();
