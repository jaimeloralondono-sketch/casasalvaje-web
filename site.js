
(function(){
  var WHATSAPP = "573108286602";
  var root = document.documentElement;
  function setLang(l){
    root.setAttribute("data-lang", l); root.setAttribute("lang", l);
    document.querySelectorAll(".lang button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.set === l)); });
    var idi = document.getElementById("idioma"); if(idi) idi.value = l;
    try{ localStorage.setItem("cs-lang", l); }catch(e){}
    wireWhatsApp();
  }
  function wireWhatsApp(){
    var l = root.getAttribute("data-lang") || "es";
    document.querySelectorAll("a.wa").forEach(function(a){
      if(!WHATSAPP){ a.setAttribute("href", "#lista"); return; }
      var ev = a.dataset.evento ? (l === "en" ? " at " : " en ") + a.dataset.evento : "";
      var msg = l === "en" ? "Hi Casa Salvaje, I'd like to book a table" + ev + "." : "Hola Casa Salvaje, quiero reservar una mesa" + ev + ".";
      a.setAttribute("href", "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg));
      a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
    });
  }
  var start = "en";
  try{ var saved = localStorage.getItem("cs-lang"); if(saved === "en" || saved === "es") start = saved; }catch(e){}
  if(location.hash === "#en") start = "en"; if(location.hash === "#es") start = "es";
  setLang(start);
  document.querySelectorAll(".lang button").forEach(function(b){ b.addEventListener("click", function(){ setLang(b.dataset.set); }); });
  try{
    var q = new URLSearchParams(location.search);
    var src = q.get("utm_source") || q.get("origen") || q.get("ref");
    if(src){ var o = document.getElementById("origen"); if(o) o.value = src; try{ sessionStorage.setItem("cs-origen", src); }catch(e){} }
    else { try{ var s = sessionStorage.getItem("cs-origen"); var o2 = document.getElementById("origen"); if(s && o2) o2.value = s; }catch(e){} }
  }catch(e){}
  var form = document.getElementById("guestlist");
  if(!form) return;
  var hosted = /netlify\.app$|casa-?salvaje\.com$/.test(location.hostname);
  var sending = false;
  function done(){
    form.hidden = true;
    var ok = document.getElementById("ok"); ok.hidden = false;
    try{ ok.scrollIntoView({block:"center", behavior:"smooth"}); }catch(e){}
  }
  form.addEventListener("submit", function(e){
    e.preventDefault();
    if(!form.reportValidity()) return;
    if(!hosted){ done(); return; }
    if(sending) return; sending = true;
    var btn = document.getElementById("submit"); if(btn) btn.disabled = true;
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
                 body: new URLSearchParams(new FormData(form)).toString() })
      .then(function(r){ if(!r.ok) throw new Error(r.status); done(); })
      .catch(function(){ HTMLFormElement.prototype.submit.call(form); });  // button id="submit" shadows form.submit
  });
})();
