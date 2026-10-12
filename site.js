
(function(){
  var WHATSAPP = "573108286602";
  var root = document.documentElement;
  function setLang(l){
    root.setAttribute("data-lang", l); root.setAttribute("lang", l);
    document.querySelectorAll(".lang button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.set === l)); });
    var idi = document.getElementById("idioma"); if(idi) idi.value = l;
    try{ localStorage.setItem("cs-lang", l); }catch(e){}
    wireWhatsApp(); wireBooking();
  }
  // Reservas: CoverManager para comer; desde las 11 pm (hora Cartagena) hasta las 6 am, Fourvenues para la noche.
  var CM = "https://restaurante.covermanager.com/";
  var BOOK = { casa: CM + "casa-salvaje-cartagena/", kanibal: CM + "kanibal-cartagena/", slvj: CM + "slvj-cartagena/" };
  function cartagenaHour(){
    try{ return parseInt(new Intl.DateTimeFormat("en-US", {timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23"}).format(new Date()), 10); }
    catch(e){ return new Date().getHours(); }
  }
  function wireBooking(){
    var l = root.getAttribute("data-lang") || "en";
    var h = cartagenaHour(), night = (h >= 23 || h < 6);
    var club = "https://site.fourvenues.com/" + (l === "es" ? "es" : "en") + "/casa-salvaje";
    document.querySelectorAll("a[data-book]").forEach(function(a){
      var k = a.dataset.book;
      a.setAttribute("href", (k === "club" || night) ? club : (BOOK[k] || BOOK.casa));
      a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
    });
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
  // Lista de invitados: solo mayores de 18 años.
  var nac = document.getElementById("f-nac");
  function checkAge(){
    if(!nac) return;
    nac.setCustomValidity("");
    if(!nac.value) return;
    var d = new Date(nac.value + "T00:00:00"), t = new Date();
    var age = t.getFullYear() - d.getFullYear() - ((t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) ? 1 : 0);
    var es = (root.getAttribute("data-lang") || "en") === "es";
    if(isNaN(age) || age > 110) nac.setCustomValidity(es ? "Revisa la fecha de nacimiento." : "Please check your date of birth.");
    else if(age < 18) nac.setCustomValidity(es ? "La lista es solo para mayores de 18 años." : "The guest list is for over-18s only.");
  }
  if(nac){
    var mx = new Date(); mx.setFullYear(mx.getFullYear() - 18);
    nac.max = mx.toISOString().slice(0, 10);
    nac.addEventListener("input", checkAge); nac.addEventListener("change", checkAge);
  }
  var hosted = /netlify\.app$|casa-?salvaje\.com$/.test(location.hostname);
  var sending = false;
  function done(){
    form.hidden = true;
    var ok = document.getElementById("ok"); ok.hidden = false;
    try{ ok.scrollIntoView({block:"center", behavior:"smooth"}); }catch(e){}
  }
  form.addEventListener("submit", function(e){
    e.preventDefault();
    checkAge();
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

// Fondos: arma el fondo al tamaño de iPhone o de computador en el navegador, a partir del archivo completo.
(function(){
  var SIZES = { iphone: [1290, 2796], web: [2560, 1440] };
  function load(src){
    return new Promise(function(res, rej){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = rej; im.src = src; });
  }
  function cover(ctx, im, w, h, fy){
    var s = Math.max(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    ctx.drawImage(im, (w - dw) / 2, (h - dh) * (fy == null ? .5 : fy), dw, dh);
  }
  // Desenfoque sin ctx.filter (Safari): se reduce a pocos píxeles y se vuelve a ampliar por pasos.
  function blurred(im, w, h){
    var c = document.createElement("canvas"); c.width = 10; c.height = Math.max(1, Math.round(10 * h / w));
    cover(c.getContext("2d"), im, c.width, c.height);
    while(c.width < w / 4){
      var n = document.createElement("canvas"); n.width = c.width * 3; n.height = c.height * 3;
      var nc = n.getContext("2d"); nc.imageSmoothingQuality = "high"; nc.drawImage(c, 0, 0, n.width, n.height); c = n;
    }
    return c;
  }
  // Color medio de un borde de la pieza y si ese borde es liso.
  function edge(im, side){
    var c = document.createElement("canvas"), W = 64, H = Math.max(2, Math.round(64 * im.naturalHeight / im.naturalWidth));
    c.width = W; c.height = H; var x = c.getContext("2d"); x.drawImage(im, 0, 0, W, H);
    var d = side === "top" ? x.getImageData(0, 0, W, 2) : side === "bottom" ? x.getImageData(0, H - 2, W, 2)
          : side === "left" ? x.getImageData(0, 0, 2, H) : x.getImageData(W - 2, 0, 2, H);
    var p = d.data, n = p.length / 4, m = [0, 0, 0], v = 0, i;
    for(i = 0; i < p.length; i += 4){ m[0] += p[i]; m[1] += p[i + 1]; m[2] += p[i + 2]; }
    m = m.map(function(k){ return k / n; });
    for(i = 0; i < p.length; i += 4) v += Math.abs(p[i] - m[0]) + Math.abs(p[i + 1] - m[1]) + Math.abs(p[i + 2] - m[2]);
    return { rgb: "rgb(" + m.map(Math.round).join(",") + ")", flat: v / n < 30 };
  }
  function render(im, fmt, fit){
    var w = SIZES[fmt][0], h = SIZES[fmt][1];
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
    if(fit === "cover"){
      // Un poco de zoom para que el texto de las esquinas quede fuera.
      var z = fmt === "iphone" ? 1.22 : 1.12, s0 = Math.max(w / im.naturalWidth, h / im.naturalHeight) * z, cw = im.naturalWidth * s0, ch = im.naturalHeight * s0;
      ctx.drawImage(im, (w - cw) / 2, (h - ch) / 2, cw, ch);
      return c;
    }
    // La pieza entera, sin recortar; en el iPhone un poco más abajo para dejar libre el reloj.
    var pad = fmt === "web" ? h * .06 : 0;
    var s = Math.min(w / im.naturalWidth, (h - 2 * pad) / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    var x0 = (w - dw) / 2, y0 = fmt === "iphone" ? (h - dh) * .62 : (h - dh) / 2;
    var vertical = dw >= w - 1;
    var e1 = edge(im, vertical ? "top" : "left"), e2 = edge(im, vertical ? "bottom" : "right");
    if(e1.flat && e2.flat){
      // Bordes lisos: se prolongan con su color y la pieza queda sin costuras.
      ctx.fillStyle = e1.rgb; ctx.fillRect(0, 0, vertical ? w : w / 2, vertical ? h / 2 : h);
      ctx.fillStyle = e2.rgb; if(vertical) ctx.fillRect(0, h / 2, w, h / 2); else ctx.fillRect(w / 2, 0, w / 2, h);
    } else {
      ctx.drawImage(blurred(im, w, h), 0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(im, x0, y0, dw, dh);
    return c;
  }
  function save(blob, name){
    var file = null;
    try{ file = new File([blob], name, { type: "image/jpeg" }); }catch(e){}
    if(file && navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/.test(navigator.userAgent)){
      return navigator.share({ files: [file] }).catch(function(err){ if(err && err.name !== "AbortError") download(blob, name); });
    }
    download(blob, name);
  }
  function download(blob, name){
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(u); }, 30000);
  }
  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest("a.dl[data-fmt]");
    if(!a || !window.HTMLCanvasElement) return;
    e.preventDefault();
    if(a.classList.contains("busy")) return;
    a.classList.add("busy");
    load(a.getAttribute("href")).then(function(im){
      return new Promise(function(res){ render(im, a.dataset.fmt, a.dataset.fit).toBlob(res, "image/jpeg", .9); });
    }).then(function(blob){
      if(!blob) throw new Error("blob");
      return save(blob, a.getAttribute("download"));
    }).catch(function(){ location.href = a.getAttribute("href"); })
      .then(function(){ a.classList.remove("busy"); });
  });
})();
