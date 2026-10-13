// Academia Salvaje: cinco días que se desbloquean en orden, examen y certificado. El avance vive en este navegador (localStorage "cs-academia").
(function(){
  var KEY = "cs-academia", root = document.documentElement;
  var st = { hechos: [], nombre: "", num: "", fecha: "" };
  try{ var s = JSON.parse(localStorage.getItem(KEY) || "null"); if(s && Array.isArray(s.hechos)) st = s; }catch(e){}
  function guardar(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){} }
  function es(){ return root.getAttribute("data-lang") === "es"; }

  var tabs = [].slice.call(document.querySelectorAll(".dias [data-dia]"));
  var paneles = [].slice.call(document.querySelectorAll(".leccion[data-dia]"));
  var abierto = function(n){ return n === 1 || st.hechos.indexOf(n - 1) >= 0; };

  function pintar(){
    tabs.forEach(function(t){
      var n = +t.dataset.dia;
      t.classList.toggle("hecho", st.hechos.indexOf(n) >= 0);
      t.disabled = !abierto(n);
    });
    var k = st.hechos.length;
    document.getElementById("prog-tx").textContent = k + " / 5";
    var p = document.getElementById("prog"); p.setAttribute("aria-valuenow", k); p.firstElementChild.style.width = (k * 20) + "%";
  }
  function mostrar(n, scroll){
    tabs.forEach(function(t){ t.setAttribute("aria-selected", String(+t.dataset.dia === n)); });
    paneles.forEach(function(p){ p.hidden = +p.dataset.dia !== n; });
    if(scroll) document.querySelector(".dias").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  tabs.forEach(function(t){ t.addEventListener("click", function(){ mostrar(+t.dataset.dia); }); });

  paneles.forEach(function(p){
    var b = p.querySelector(".terminar"); if(!b) return;
    b.addEventListener("click", function(){
      var n = +p.dataset.dia;
      if(st.hechos.indexOf(n) < 0) st.hechos.push(n);
      guardar(); pintar(); mostrar(n + 1, true);
    });
  });

  // Copiar el prompt en el idioma que se está viendo.
  document.querySelectorAll(".prompt .copiar").forEach(function(b){
    b.addEventListener("click", function(){
      var pre = b.closest(".prompt").querySelector("pre." + (es() ? "es" : "en"));
      var ok = function(){ b.classList.add("ok"); setTimeout(function(){ b.classList.remove("ok"); }, 1600); };
      if(navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(ok).catch(function(){});
      else { var r = document.createRange(); r.selectNodeContents(pre); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); try{ document.execCommand("copy"); ok(); }catch(e){} }
    });
  });

  // Examen
  var form = document.getElementById("examen"), aviso = document.getElementById("aviso"), cert = document.getElementById("certificado");
  function fecha(){
    var d = st.fecha ? new Date(st.fecha) : new Date();
    return d.toLocaleDateString(es() ? "es-CO" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  }
  function verCert(){
    document.getElementById("c-nombre").textContent = st.nombre;
    document.getElementById("c-num").textContent = st.num;
    document.getElementById("c-fecha").textContent = fecha();
    form.hidden = true; cert.hidden = false;
  }
  form.addEventListener("submit", function(e){
    e.preventDefault();
    var malas = 0, faltan = 0;
    form.querySelectorAll(".preg").forEach(function(f){
      var r = f.querySelector("input:checked");
      f.classList.remove("ok", "no");
      if(!r){ faltan++; return; }
      var bien = r.value === f.dataset.ok;
      f.classList.add(bien ? "ok" : "no");
      if(!bien) malas++;
    });
    var nombre = form.nombre.value.trim().replace(/\s+/g, " ");
    var msg = faltan ? (es() ? "Te faltan " + faltan + " preguntas." : faltan + " questions left to answer.")
      : malas ? (es() ? "Tienes " + malas + " en rojo. Revísalas y vuelve a intentar." : malas + " in red. Take another look and try again.")
      : !nombre ? (es() ? "Escribe tu nombre para el certificado." : "Add your name for the certificate.") : "";
    aviso.textContent = msg; aviso.hidden = !msg;
    if(msg) return;
    st.nombre = nombre; st.fecha = new Date().toISOString();
    st.num = "AS-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    if(st.hechos.indexOf(5) < 0) st.hechos.push(5);
    guardar(); pintar(); verCert();
  });

  document.getElementById("imprimir").addEventListener("click", function(){ window.print(); });
  document.getElementById("compartir").addEventListener("click", function(){
    var t = es() ? "Terminé la Academia Salvaje: IA para profesionales de la hospitalidad." : "I finished Academia Salvaje: AI for hospitality professionals.";
    var url = location.origin + "/academia";
    if(navigator.share) navigator.share({ title: "Academia Salvaje", text: t, url: url }).catch(function(){});
    else window.open("https://wa.me/?text=" + encodeURIComponent(t + " " + url), "_blank", "noopener");
  });
  document.getElementById("otra").addEventListener("click", function(){
    st = { hechos: [], nombre: "", num: "", fecha: "" }; guardar();
    form.reset(); form.querySelectorAll(".preg").forEach(function(f){ f.classList.remove("ok", "no"); });
    form.hidden = false; cert.hidden = true; pintar(); mostrar(1, true);
  });

  // WhatsApp con el mensaje propio de la Academia (site.js pone el de reservas).
  function wa(){
    document.querySelectorAll("a.wa[data-wa-es]").forEach(function(a){
      a.href = "https://wa.me/573108286602?text=" + encodeURIComponent(es() ? a.dataset.waEs : a.dataset.waEn);
    });
    if(!cert.hidden) document.getElementById("c-fecha").textContent = fecha();
  }
  document.addEventListener("cs-lang", wa); wa();

  pintar();
  var siguiente = [1, 2, 3, 4, 5].filter(function(n){ return st.hechos.indexOf(n) < 0; })[0] || 5;
  mostrar(siguiente);
  if(st.nombre && st.hechos.indexOf(5) >= 0) verCert();
})();
