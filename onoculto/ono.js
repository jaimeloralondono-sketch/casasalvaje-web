(function () {
  var html = document.documentElement;

  // Idioma ES / EN
  var btns = document.querySelectorAll('.lang button');
  function setLang(l) {
    html.setAttribute('data-lang', l);
    html.lang = l;
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.set === l ? 'true' : 'false'); });
    try { localStorage.setItem('ono-lang', l); } catch (e) {}
    document.querySelectorAll('a[data-en]').forEach(function (a) {
      if (!a.dataset.es) a.dataset.es = a.getAttribute('href');
      a.setAttribute('href', l === 'en' ? a.dataset.en : a.dataset.es);
    });
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.set); }); });
  setLang(html.getAttribute('data-lang') || 'es');

  // Menú sólido al bajar; botón flotante se esconde en la sección de reservas
  var nav = document.getElementById('nav');
  var fab = document.getElementById('fab');
  var visit = document.getElementById('contacto');
  function onScroll() {
    nav.classList.toggle('solid', window.scrollY > 40);
    if (fab && visit) {
      var r = visit.getBoundingClientRect();
      fab.classList.toggle('hide', window.scrollY < window.innerHeight * 0.6 || r.top < window.innerHeight);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Aparición suave
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  // Menú a pantalla completa
  var ov = document.getElementById('overlay');
  var mb = document.getElementById('menuBtn');
  function openMenu() { ov.hidden = false; ov.classList.add('open'); document.body.classList.add('locked'); mb.setAttribute('aria-expanded', 'true'); document.getElementById('menuClose').focus(); }
  function closeMenu() { ov.hidden = true; ov.classList.remove('open'); document.body.classList.remove('locked'); mb.setAttribute('aria-expanded', 'false'); }
  mb.addEventListener('click', openMenu);
  document.getElementById('menuClose').addEventListener('click', function () { closeMenu(); mb.focus(); });
  ov.querySelectorAll('.ov-links a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) { closeMenu(); mb.focus(); } });

  // Galería ampliable
  var lb = document.getElementById('lb');
  var lbImg = lb.querySelector('img');
  var last;
  function close() { lb.classList.remove('open'); lbImg.removeAttribute('src'); if (last) last.focus(); }
  document.querySelectorAll('#masonry button').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.querySelector('img');
      last = b;
      lbImg.src = i.src;
      lbImg.alt = i.alt;
      lb.classList.add('open');
      lb.querySelector('button').focus();
    });
  });
  lb.addEventListener('click', function (e) { if (e.target !== lbImg) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
})();
