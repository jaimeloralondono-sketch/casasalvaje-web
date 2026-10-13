
(function(){
  var WHATSAPP = "573108286602";
  var root = document.documentElement;
  function setLang(l){
    root.setAttribute("data-lang", l); root.setAttribute("lang", l);
    document.querySelectorAll(".lang button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.set === l)); });
    var idi = document.getElementById("idioma"); if(idi) idi.value = l;
    try{ localStorage.setItem("cs-lang", l); }catch(e){}
    wireWhatsApp(); wireBooking();
    try{ document.dispatchEvent(new Event("cs-lang")); }catch(e){}
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
  // Artículos del blog: cada idioma tiene su propia URL; el botón de idioma lleva a la traducción.
  var fixed = root.getAttribute("data-fixed");
  if(fixed) start = fixed;
  setLang(start);
  document.querySelectorAll(".lang button").forEach(function(b){ b.addEventListener("click", function(){
    var alt = fixed && b.dataset.set !== fixed && document.querySelector('link[rel="alternate"][hreflang="' + b.dataset.set + '"]');
    if(alt){ try{ localStorage.setItem("cs-lang", b.dataset.set); }catch(e){} location.href = new URL(alt.getAttribute("href")).pathname; return; }
    setLang(b.dataset.set);
  }); });
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

// La casa en imágenes: piezas al azar de gal-pool.json, nunca dos de la misma serie a la vez
// (las fotos y los platos admiten dos), y cada pocos segundos una cambia por otra de la misma forma.
(function(){
  var gal = document.querySelector(".gal[data-pool]");
  if(!gal || !window.fetch) return;
  var imgs = [].slice.call(gal.querySelectorAll("img"));
  function shape(w, h){ var r = h / w; return r < .85 ? "wide" : r > 1.45 ? "tall" : "port"; }
  function cap(s){ return /^(foto|platos)/.test(s) ? 2 : 1; }
  function shuffle(a){ for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var slots = imgs.map(function(im){ return shape(+im.getAttribute("width"), +im.getAttribute("height")); });
  fetch(gal.dataset.pool).then(function(r){ return r.json(); }).then(function(all){
    var pool = shuffle(all.slice()), shown = [], count = {};
    function fits(it, want, except){ return shape(it.w, it.h) === want && (count[it.s] || 0) - (except === it.s ? 1 : 0) < cap(it.s); }
    function take(it){ pool.splice(pool.indexOf(it), 1); count[it.s] = (count[it.s] || 0) + 1; }
    function give(it){ pool.push(it); count[it.s]--; }
    function put(im, it){ im.src = it.src; im.alt = it.alt; im.width = it.w; im.height = it.h; }
    imgs.forEach(function(im, i){
      var it = pool.find(function(p){ return fits(p, slots[i]); }) || pool.find(function(p){ return (count[p.s] || 0) < cap(p.s); });
      if(!it) return;
      take(it); put(im, it); shown[i] = it;
    });
    if(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var visible = false, last = -1;
    if("IntersectionObserver" in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(gal);
    else visible = true;
    setInterval(function(){
      if(!visible || document.hidden) return;
      var i; do { i = Math.floor(Math.random() * imgs.length); } while(i === last && imgs.length > 1);
      last = i;
      var cur = shown[i]; if(!cur) return;
      var want = shape(cur.w, cur.h);
      var free = pool.filter(function(p){ return p.s !== cur.s && fits(p, want, cur.s); });
      if(!free.length) return;
      var next = free[Math.floor(Math.random() * free.length)], im = imgs[i], pre = new Image();
      pre.onload = function(){
        im.style.opacity = 0;
        setTimeout(function(){ take(next); give(cur); put(im, next); shown[i] = next; im.style.opacity = 1; }, 600);
      };
      pre.src = next.src;
    }, 3500);
  }).catch(function(){});
})();

// Música: suena desde el primer toque en cualquier parte de la página y siempre empieza en una canción al azar.
// Si la página tiene mp3 propios en musica/musica.json, usa el reproductor de la casa; si no, las playlists de
// Spotify de <body data-musica="...">: "ID ID" se mezclan en una sola, "Cena=ID Fiesta=ID" da a elegir.
(function(){
  var spec = document.body.getAttribute("data-musica");
  if(!spec || !window.fetch) return;
  var page = location.pathname.replace(/^.*\//, "").replace(/\.html$/, "") || "index";
  function shuffle(a){ for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function groupsFrom(pairs){
    var gs = [], by = {};
    pairs.forEach(function(p){ var g = by[p[0]]; if(!g){ g = by[p[0]] = { name: p[0], items: [] }; gs.push(g); } g.items = g.items.concat(p[1]); });
    return gs;
  }
  // De noche (11 pm a 6 am, hora Cartagena) arranca en "Fiesta" si existe.
  function pick(gs){
    var h = new Date().getHours();
    try{ h = parseInt(new Intl.DateTimeFormat("en-US", {timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23"}).format(new Date()), 10); }catch(e){}
    var night = h >= 23 || h < 6;
    return gs.filter(function(g){ return /fiesta|party/i.test(g.name) === night; })[0] || gs[0];
  }
  fetch("musica/musica.json").then(function(r){ return r.ok ? r.json() : {}; }).catch(function(){ return {}; }).then(function(all){
    var mine = all[page] || {};
    var own = groupsFrom(Object.keys(mine).map(function(k){ return [k, mine[k] || []]; })).filter(function(g){ return g.items.length; });
    if(own.length) build(own, "mp3");
    else build(groupsFrom(spec.trim().split(/\s+/).map(function(p){ var k = p.split("="); return k.length > 1 ? [k[0], [k[1]]] : ["", [k[0]]]; })), "spotify");
  });

  function build(groups, mode){
    var cur = pick(groups), queue = [], stopped = false, started = false;
    var box = document.createElement("div"); box.className = "musica";
    box.innerHTML =
      '<div class="mu-panel off"><div class="mu-top">' +
        (groups.length > 1 ? '<div class="mu-sets">' + groups.map(function(g, i){ return '<button type="button" data-i="' + i + '">' + g.name + '</button>'; }).join("") + '</div>' : '<span></span>') +
        '<span class="mu-act"><button type="button" class="mu-next"><span class="es">Otra</span><span class="en">Next</span> &#8635;</button>' +
        '<button type="button" class="mu-x" aria-label="Cerrar / Close">&#215;</button></span></div>' +
        (mode === "mp3"
          ? '<div class="mu-own"><button type="button" class="mu-pp" aria-label="Play / Pausa"></button><div class="mu-now"><b></b><span></span></div></div>'
          : '<div class="mu-frame"><div></div></div>') +
      '</div>' +
      '<button type="button" class="mu-btn" aria-expanded="false"><span class="mu-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="es">Música</span><span class="en">Music</span></button>';
    document.body.appendChild(box);
    var panel = box.querySelector(".mu-panel"), btn = box.querySelector(".mu-btn");
    function on(v){ box.classList.toggle("on", v); }
    function mark(){ box.querySelectorAll(".mu-sets button").forEach(function(b){ b.setAttribute("aria-pressed", String(groups[b.dataset.i] === cur)); }); }
    mark();

    var player = mode === "mp3" ? ownPlayer() : spotifyPlayer();
    player.prepare(cur);

    // Primer toque en cualquier parte: empieza la música (los navegadores no dejan que suene antes).
    function first(e){
      if(box.contains(e.target)) return;
      document.removeEventListener("click", first, true); document.removeEventListener("keydown", first, true);
      if(!stopped && !started){ started = true; player.play(); }
    }
    document.addEventListener("click", first, true); document.addEventListener("keydown", first, true);

    function open(v){
      panel.classList.toggle("off", !v); btn.setAttribute("aria-expanded", String(v));
      if(v && !started){ started = true; player.play(); }
    }
    btn.addEventListener("click", function(){ open(panel.classList.contains("off")); });
    box.querySelector(".mu-x").addEventListener("click", function(){ open(false); });
    box.querySelector(".mu-next").addEventListener("click", function(){ started = true; player.next(); });
    box.querySelectorAll(".mu-sets button").forEach(function(b){ b.addEventListener("click", function(){
      var g = groups[b.dataset.i]; if(g === cur) return;
      cur = g; mark(); started = true; player.switchTo(g);
    }); });

    // Reproductor de la casa: mp3 propios. Cada canción es "ruta.mp3" o {"src": "...", "title": "...", "artist": "..."}.
    function ownPlayer(){
      var audio = new Audio(), pp = box.querySelector(".mu-pp"), now = box.querySelector(".mu-now");
      audio.preload = "auto";
      function info(t){ return typeof t === "string" ? { src: t, title: decodeURIComponent(t.replace(/^.*\//, "").replace(/\.[a-z0-9]+$/i, "")).replace(/[-_]+/g, " ") } : t; }
      function cue(){ var raw = queue.shift(), t = info(raw); queue.push(raw); audio.src = t.src; now.querySelector("b").textContent = t.title || ""; now.querySelector("span").textContent = t.artist || ""; }
      function fadeIn(){ audio.volume = 0; var v = 0, id = setInterval(function(){ v = Math.min(1, v + .05); audio.volume = v; if(v >= 1) clearInterval(id); }, 80); }
      function go(){ var p = audio.play(); fadeIn(); if(p && p.catch) p.catch(function(){}); }
      audio.addEventListener("play", function(){ on(true); stopped = false; });
      audio.addEventListener("pause", function(){ on(false); });
      audio.addEventListener("ended", function(){ cue(); go(); });
      pp.addEventListener("click", function(){ if(audio.paused) go(); else { stopped = true; audio.pause(); } });
      return {
        prepare: function(g){ queue = shuffle(g.items.slice()); cue(); },
        play: go,
        next: function(){ cue(); go(); },
        switchTo: function(g){ queue = shuffle(g.items.slice()); cue(); go(); }
      };
    }

    // Spotify: el embed siempre empieza por la primera canción, así que /api/playlist trae la lista
    // y se carga una al azar; al terminar sigue otra al azar. Si falla, se carga la playlist tal cual.
    function spotifyPlayer(){
      var cache = {}, ctrl = null, ready = null, want = false, ending = false;
      function tracks(id){
        if(!cache[id]) cache[id] = fetch("/api/playlist?id=" + id).then(function(r){ if(!r.ok) throw 0; return r.json(); })
          .then(function(d){ return d.tracks || []; }).catch(function(){ delete cache[id]; return []; });
        return cache[id];
      }
      function uriFor(g){
        return Promise.all(g.items.map(tracks)).then(function(lists){
          queue = shuffle([].concat.apply([], lists));
          box.querySelector(".mu-next").hidden = !queue.length;
          if(queue.length){ var t = queue.shift(); queue.push(t); return "spotify:track:" + t; }
          return "spotify:playlist:" + g.items[Math.floor(Math.random() * g.items.length)];
        });
      }
      function api(uri){
        if(ready) return ready;
        ready = new Promise(function(res){
          window.onSpotifyIframeApiReady = function(IFrameAPI){
            IFrameAPI.createController(box.querySelector(".mu-frame div"), { uri: uri, width: "100%", height: 152 }, function(c){
              ctrl = c;
              c.addListener("playback_update", function(e){
                var d = e.data || {};
                on(!d.isPaused);
                if(d.duration > 0 && d.position >= d.duration - 900 && !ending && queue.length){ ending = true; setTimeout(next, 900); }
              });
              if(want) c.play();
              res(c);
            });
          };
          var s = document.createElement("script"); s.src = "https://open.spotify.com/embed/iframe-api/v1"; s.async = true;
          document.head.appendChild(s);
        });
        return ready;
      }
      function load(uri){ ending = false; return api(uri).then(function(c){ c.loadUri(uri); c.play(); }); }
      function next(){ if(!queue.length) return; var t = queue.shift(); queue.push(t); load("spotify:track:" + t); }
      return {
        // El reproductor se carga en cuanto la página termina, para que el primer toque ya lo encuentre listo.
        prepare: function(g){
          function go(){ uriFor(g).then(api); }
          if(document.readyState === "complete") setTimeout(go, 800); else window.addEventListener("load", function(){ setTimeout(go, 800); });
        },
        play: function(){ if(ctrl) ctrl.play(); else want = true; },
        next: next,
        switchTo: function(g){ uriFor(g).then(load); }
      };
    }
  }
})();

// Horarios: marca la fila de hoy y dice si cada mundo está abierto ahora, siempre en hora de Cartagena.
// Un domingo seguido de lunes festivo usa el horario "f" de data-hours (abrimos hasta las 12).
(function(){
  var cards = [].slice.call(document.querySelectorAll(".hr-card[data-hours]"));
  if(!cards.length) return;
  var root = document.documentElement;
  var DAYS = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
  var DAY = 864e5;
  // Fecha y hora de Cartagena; la fecha se guarda como medianoche UTC de ese día para contar días sin husos.
  function now(){
    try{
      var p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; });
      return { day: Date.UTC(+p.year, +p.month - 1, +p.day), m: (+p.hour % 24) * 60 + (+p.minute) };
    }catch(e){ var t = new Date(); return { day: Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()), m: t.getHours() * 60 + t.getMinutes() }; }
  }
  // Festivos de Colombia (Ley 51 de 1983): fijos, trasladados al lunes y los que dependen de la Pascua.
  var cache = {};
  function holidays(y){
    if(cache[y]) return cache[y];
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        easter = Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
    function monday(t){ var wd = new Date(t).getUTCDay(); return wd === 1 ? t : t + ((8 - wd) % 7) * DAY; }
    var set = {};
    [[0, 1], [4, 1], [6, 20], [7, 7], [11, 8], [11, 25]].forEach(function(x){ set[Date.UTC(y, x[0], x[1])] = 1; });
    [[0, 6], [2, 19], [5, 29], [7, 15], [9, 12], [10, 1], [10, 11]].forEach(function(x){ set[monday(Date.UTC(y, x[0], x[1]))] = 1; });
    set[easter - 3 * DAY] = 1; set[easter - 2 * DAY] = 1;
    [43, 64, 71].forEach(function(n){ set[easter + n * DAY] = 1; });
    return (cache[y] = set);
  }
  function isHoliday(t){ return !!holidays(new Date(t).getUTCFullYear())[t]; }
  function wd(t){ return new Date(t).getUTCDay(); }
  function eve(t){ return wd(t) === 0 && isHoliday(t + DAY); }
  function hoursOn(H, t){ return (eve(t) && H.f) || H[wd(t)] || []; }
  function clock(m){
    m = m % 1440; var h = Math.floor(m / 60), mm = m % 60, h12 = h % 12 || 12;
    return h12 + (mm ? ":" + (mm < 10 ? "0" : "") + mm : "") + (h < 12 ? " am" : " pm");
  }
  function render(){
    var es = (root.getAttribute("data-lang") || "en") === "es", t = now(), key = eve(t.day) ? "f" : String(wd(t.day));
    cards.forEach(function(card){
      var H; try{ H = JSON.parse(card.dataset.hours); }catch(e){ return; }
      var k0 = H[key] ? key : String(wd(t.day));
      card.querySelectorAll(".hr-rows > div").forEach(function(row){
        var on = row.dataset.days.split(",").indexOf(k0) > -1;
        row.classList.toggle("today", on);
        row.querySelector("dt").setAttribute("data-hoy", on ? (es ? "Hoy" : "Today") : "");
      });
      // Abierto ahora: tramos de hoy, o el tramo de ayer que pasa de medianoche.
      var close = null;
      hoursOn(H, t.day).forEach(function(r){ if(t.m >= r[0] && t.m < r[1]) close = r[1]; });
      hoursOn(H, t.day - DAY).forEach(function(r){ if(r[1] > 1440 && t.m < r[1] - 1440) close = r[1]; });
      var el = card.querySelector(".hr-status"), txt;
      if(close !== null){
        txt = es ? "Abierto ahora · cierra a las " + clock(close) : "Open now · closes at " + clock(close);
        el.className = "hr-status open";
      } else {
        var next = null;
        for(var k = 0; k < 8 && next === null; k++){
          hoursOn(H, t.day + k * DAY).forEach(function(r){ if(next === null && (k > 0 || r[0] > t.m)) next = { k: k, d: wd(t.day + k * DAY), m: r[0] }; });
        }
        if(!next) txt = es ? "Cerrado" : "Closed";
        else {
          var when = next.k === 0 ? (es ? "hoy" : "today") : next.k === 1 ? (es ? "mañana" : "tomorrow") : (es ? "el " : "") + DAYS[es ? "es" : "en"][next.d];
          txt = es ? "Cerrado · abre " + when + " a las " + clock(next.m) : "Closed · opens " + when + " at " + clock(next.m);
        }
        el.className = "hr-status closed";
      }
      el.textContent = txt;
    });
  }
  render();
  document.addEventListener("cs-lang", render);
  setInterval(render, 60000);
})();
