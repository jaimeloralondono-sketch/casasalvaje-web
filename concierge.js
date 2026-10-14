// Chat del concierge: conversa con /api/concierge (Claude) y pasa a WhatsApp cuando hace falta una persona.
// La conversación vive en esta pestaña (sessionStorage); el servidor no guarda nada.
(function(){
  var WHATSAPP = "573108286602", CONCIERGE = "573182824124", KEY = "cs-concierge";
  var root = document.documentElement, log = document.getElementById("log"), form = document.getElementById("form");
  var q = document.getElementById("q"), enviar = document.getElementById("enviar"), chips = document.getElementById("chips");
  var turnos = [], ocupado = false;
  var TR = window.CS_CONCIERGE_TR || {};
  function lang(){ return root.getAttribute("data-lang") || "en"; }
  function cap(l){ return l.charAt(0).toUpperCase() + l.slice(1); }
  // Español e inglés vienen en cada llamada; los otros idiomas salen del diccionario, por el texto en inglés.
  function t(esTx, enTx){ var l = lang(); if(l === "es") return esTx; if(l === "en") return enTx; return (TR[enTx] && TR[enTx][l]) || enTx; }

  function placeholder(){ q.placeholder = q.dataset["ph" + cap(lang())] || q.dataset.phEn; }
  document.addEventListener("cs-lang", placeholder); placeholder();

  function wa(texto, numero){ return "https://wa.me/" + (numero || WHATSAPP) + "?text=" + encodeURIComponent(texto); }
  // Pinta texto seguro: enlaces http(s) clicables y las marcas [[WHATSAPP: ...]] (la casa) y [[CONCIERGE: ...]] (el concierge) como botón.
  function pintar(p, texto, final){
    var pedido = null, alConcierge = false;
    if(!final){ var corte = texto.indexOf("[["); if(corte >= 0) texto = texto.slice(0, corte); }   // no mostrar marcas a medio escribir
    texto = texto.replace(/\[\[(WHATSAPP|CONCIERGE):\s*([\s\S]*?)\]\]/g, function(_, m, r){ pedido = r.trim(); alConcierge = m === "CONCIERGE"; return ""; });
    texto = texto.replace(/\[\[(REFUSAL|ERROR)\]\]/g, "").trim();
    p.textContent = "";
    texto.split(/(https?:\/\/[^\s<>()]+[^\s<>().,;:!?¡¿"'])/g).forEach(function(trozo, i){
      if(i % 2){ var a = document.createElement("a"); a.href = trozo; a.target = "_blank"; a.rel = "noopener"; a.textContent = trozo.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); p.appendChild(a); }
      else p.appendChild(document.createTextNode(trozo));
    });
    var caja = p.parentNode, viejo = caja.querySelector(".wa-btn"); if(viejo) viejo.remove();
    if(final && pedido){
      var b = document.createElement("a"); b.className = "wa-btn"; b.href = wa(pedido, alConcierge ? CONCIERGE : WHATSAPP); b.target = "_blank"; b.rel = "noopener";
      b.textContent = alConcierge ? t("Seguir por WhatsApp con el concierge", "Continue on WhatsApp with the concierge") : t("Seguir por WhatsApp con la casa", "Continue on WhatsApp with the house");
      caja.appendChild(b);
    }
  }
  function burbuja(rol, texto, final){
    var d = document.createElement("div"), p = document.createElement("p");
    d.className = "msg " + (rol === "user" ? "yo" : "bot"); d.appendChild(p); log.appendChild(d);
    if(rol === "user") p.textContent = texto; else pintar(p, texto, final);
    log.scrollTop = log.scrollHeight;
    return p;
  }
  function guardar(){ try{ sessionStorage.setItem(KEY, JSON.stringify(turnos.slice(-20))); }catch(e){} }
  try{ var g = JSON.parse(sessionStorage.getItem(KEY) || "[]"); if(Array.isArray(g)) g.forEach(function(m){ if(m && m.content){ turnos.push(m); burbuja(m.role, m.content, true); } }); }catch(e){}
  if(turnos.length) chips.hidden = true;

  function fallo(p, motivo){
    p.parentNode.classList.remove("pensando");
    var ultimo = turnos.length ? turnos[turnos.length - 1].content : "";
    pintar(p, (motivo === "sin-clave"
      ? t("El chat se está preparando. Mientras tanto, nuestro equipo te responde por WhatsApp.", "The chat is getting ready. Meanwhile, our team will answer you on WhatsApp.")
      : t("Se me cortó la conexión. Vuelve a intentarlo o escríbenos por WhatsApp.", "I lost the connection. Try again or message us on WhatsApp."))
      + "\n[[WHATSAPP: " + (ultimo || t("Hola Casa Salvaje", "Hi Casa Salvaje")) + "]]", true);
  }

  function preguntar(texto){
    texto = String(texto || "").trim().slice(0, 1500);
    if(!texto || ocupado) return;
    ocupado = true; enviar.disabled = true; chips.hidden = true;
    turnos.push({ role: "user", content: texto }); guardar();
    burbuja("user", texto);
    var p = burbuja("assistant", t("Pensando…", "Thinking…"));
    p.parentNode.classList.add("pensando");
    var respuesta = "";
    fetch("/api/concierge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: turnos }) })
      .then(function(r){
        if(r.status === 503) throw new Error("sin-clave");
        if(!r.ok || !r.body) throw new Error("red");
        var lector = r.body.getReader(), dec = new TextDecoder();
        function leer(){
          return lector.read().then(function(x){
            if(x.done) return;
            respuesta += dec.decode(x.value, { stream: true });
            p.parentNode.classList.remove("pensando");
            pintar(p, respuesta, false); log.scrollTop = log.scrollHeight;
            return leer();
          });
        }
        return leer();
      })
      .then(function(){
        if(/\[\[ERROR\]\]/.test(respuesta) || !respuesta.trim()) throw new Error("red");
        if(/\[\[REFUSAL\]\]/.test(respuesta)) respuesta = t("Eso no lo puedo responder por aquí. Nuestro equipo te ayuda por WhatsApp.", "I can't help with that here. Our team can help you on WhatsApp.") + "\n[[WHATSAPP: " + texto + "]]";
        turnos.push({ role: "assistant", content: respuesta.replace(/\[\[(REFUSAL|ERROR)\]\]/g, "").trim() }); guardar();
        pintar(p, respuesta, true);
      })
      .catch(function(e){
        fallo(p, e && e.message);
        turnos.pop(); guardar();   // el turno del huésped se puede volver a enviar
      })
      .then(function(){ ocupado = false; enviar.disabled = false; log.scrollTop = log.scrollHeight; });
  }

  form.addEventListener("submit", function(e){ e.preventDefault(); var v = q.value; q.value = ""; q.style.height = ""; preguntar(v); });
  q.addEventListener("keydown", function(e){ if(e.key === "Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });
  q.addEventListener("input", function(){ q.style.height = "auto"; q.style.height = Math.min(q.scrollHeight, 140) + "px"; });
  chips.querySelectorAll("button").forEach(function(b){ b.addEventListener("click", function(){
    if(b.dataset.ir){ var destino = document.getElementById(b.dataset.ir); if(destino) destino.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    preguntar(b.dataset[lang()] || b.dataset.en);
  }); });

  // Arma tu plan: pide el plan a /api/plan y, si el huésped quiere, lo sigue en este chat.
  if(window.CSPlan) CSPlan.montar({
    pedir: function(sel){
      return fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: sel }) })
        .then(function(r){
          if(r.status === 503) throw { mensaje: t("El planificador se está preparando. Mientras tanto, nuestro equipo te arma el plan por WhatsApp.", "The planner is getting ready. Meanwhile, our team will build your plan on WhatsApp.") };
          if(!r.ok) throw {};
          return r.text();
        })
        .then(function(x){ if(/\[\[(ERROR|REFUSAL)\]\]/.test(x)) throw {}; return x; });
    },
    alChat: function(pedido, plan){
      var cierre = plan + "\n\n" + t("¿Qué le cambiamos?", "What should we change?");
      turnos.push({ role: "user", content: pedido }, { role: "assistant", content: cierre }); guardar();
      chips.hidden = true;
      burbuja("user", pedido); burbuja("assistant", cierre, true);
      document.getElementById("chat").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
})();
