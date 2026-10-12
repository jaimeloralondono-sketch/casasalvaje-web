(function(){
  var root = document.documentElement;
  function setLang(l){
    root.setAttribute("data-lang", l); root.setAttribute("lang", l);
    document.querySelectorAll(".lang button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.set === l)); });
    document.querySelectorAll("input.idioma").forEach(function(i){ i.value = l; });
    try{ localStorage.setItem("go-lang", l); }catch(e){}
  }
  setLang(root.getAttribute("data-lang") === "en" ? "en" : "es");
  document.querySelectorAll(".lang button").forEach(function(b){ b.addEventListener("click", function(){ setLang(b.dataset.set); }); });
  var y = document.getElementById("year"); if(y) y.textContent = new Date().getFullYear();

  // Hoja de vida: solo PDF y máximo 5 MB (Netlify Forms acepta hasta 8 MB por envío).
  var cv = document.getElementById("f-cv");
  function checkCV(){
    if(!cv) return;
    cv.setCustomValidity("");
    var f = cv.files && cv.files[0]; if(!f) return;
    var es = root.getAttribute("data-lang") !== "en";
    if(!/\.pdf$/i.test(f.name)) cv.setCustomValidity(es ? "Sube tu hoja de vida en PDF." : "Please upload your CV as a PDF.");
    else if(f.size > 5 * 1024 * 1024) cv.setCustomValidity(es ? "El archivo pesa más de 5 MB." : "The file is larger than 5 MB.");
  }
  if(cv) cv.addEventListener("change", checkCV);

  // Netlify solo procesa formularios en el sitio publicado; en local se muestra el mensaje sin enviar.
  var hosted = /netlify\.app$|grupo-?ono\.com(\.co)?$/.test(location.hostname);
  document.querySelectorAll("form[data-netlify]").forEach(function(form){
    var sending = false;
    function done(){
      form.hidden = true;
      var ok = document.querySelector('[data-ok="' + form.id + '"]'); if(!ok) return;
      ok.hidden = false;
      try{ ok.scrollIntoView({block:"center", behavior:"smooth"}); }catch(e){}
    }
    form.addEventListener("submit", function(e){
      e.preventDefault();
      checkCV();
      if(!form.reportValidity()) return;
      if(!hosted){ done(); return; }
      if(sending) return; sending = true;
      var btn = form.querySelector("button[type=submit]"); if(btn) btn.disabled = true;
      var data = new FormData(form);
      var multipart = form.enctype === "multipart/form-data";
      fetch("/", multipart ? { method: "POST", body: data }
                           : { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() })
        .then(function(r){ if(!r.ok) throw new Error(r.status); done(); })
        .catch(function(){ HTMLFormElement.prototype.submit.call(form); });
    });
  });
})();
