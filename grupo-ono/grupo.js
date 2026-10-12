(function(){
  document.querySelectorAll(".year").forEach(function(y){ y.textContent = new Date().getFullYear(); });

  // Nav: transparent over the hero, solid once you scroll.
  var nav = document.querySelector(".nav"), hero = document.querySelector(".hero");
  function onScroll(){ if(nav) nav.classList.toggle("solid", !hero || window.scrollY > hero.offsetHeight - 80); }
  window.addEventListener("scroll", onScroll, {passive:true}); onScroll();

  // Phones: Menu button opens a full-screen sheet; links, Escape or a wider screen close it.
  var mb = document.querySelector(".menu-btn"), sh = document.getElementById("sheet"), root = document.documentElement;
  function menu(o){
    sh.hidden = !o; mb.setAttribute("aria-expanded", String(o)); mb.textContent = o ? "Close" : "Menu";
    root.style.overflow = o ? "hidden" : ""; root.classList.toggle("menu-open", o);
    document.querySelectorAll("main, footer").forEach(function(el){ el.inert = o; });
  }
  if(mb && sh){
    mb.addEventListener("click", function(){ menu(sh.hidden); });
    sh.addEventListener("click", function(e){ if(e.target.closest("a")) menu(false); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !sh.hidden){ menu(false); mb.focus(); } });
    var wide = window.matchMedia("(min-width:720px)");
    var onWide = function(){ if(wide.matches && !sh.hidden) menu(false); };
    if(wide.addEventListener) wide.addEventListener("change", onWide); else if(wide.addListener) wide.addListener(onWide);
  }

  // Reveal on scroll. A campaign strip reveals all its cards at once (keeping the stagger),
  // so cards still off to the side are already showing when someone swipes to them.
  var rv = document.querySelectorAll(".rv");
  if("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){
      if(!e.isIntersecting) return;
      var t = e.target;
      (t.classList.contains("strip") ? t.querySelectorAll(".rv") : [t]).forEach(function(el){ el.classList.add("in"); });
      io.unobserve(t);
    }); }, {rootMargin:"0px 0px -8% 0px", threshold:0.08});
    rv.forEach(function(el){ if(!el.closest(".strip")) io.observe(el); });
    document.querySelectorAll(".strip").forEach(function(s){ io.observe(s); });
  } else rv.forEach(function(el){ el.classList.add("in"); });

  // CV: PDF only, 5 MB max (Netlify Forms accepts up to 8 MB per submission).
  var cv = document.getElementById("f-cv");
  function checkCV(){
    if(!cv) return;
    cv.setCustomValidity("");
    var f = cv.files && cv.files[0]; if(!f) return;
    if(!/\.pdf$/i.test(f.name)) cv.setCustomValidity("Please upload your CV as a PDF.");
    else if(f.size > 5 * 1024 * 1024) cv.setCustomValidity("The file is larger than 5 MB.");
  }
  if(cv) cv.addEventListener("change", checkCV);

  // Netlify only handles forms on the deployed site; locally we just show the confirmation.
  var hosted = /netlify\.app$|grupo-?ono\.com(\.co)?$/.test(location.hostname);
  document.querySelectorAll("form[data-netlify]").forEach(function(form){
    var sending = false;
    function done(){
      form.hidden = true;
      var ok = document.querySelector('[data-ok="' + form.id + '"]'); if(!ok) return;
      ok.hidden = false;
      ok.focus({preventScroll:true});
      try{ ok.scrollIntoView({block:"center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }catch(e){}
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
