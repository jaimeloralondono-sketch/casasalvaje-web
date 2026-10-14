// "Arma tu plan" del concierge: el huésped elige días, personas, casas, botes y noches; Claude lo ordena día por día.
// CSPlan.montar({ pedir, alChat }) — `pedir(sel)` devuelve una promesa con el texto (JSON) del plan; `alChat(pedido, plan)` lo pasa al chat.
// La web usa /api/plan; la vista previa del concierge usa Claude desde el artifact. El dibujo y las reglas son los mismos.
(function(){
  var WHATSAPP = "573182824124";   // el concierge: casas, yates, planes y extras
  var UTM = "utm_source=casasalvaje&utm_medium=concierge&utm_campaign=arma-tu-plan";
  var PUERTAS = {
    kanibal: ["Reservar en Kanibal", "Book Kanibal", "https://restaurante.covermanager.com/kanibal-cartagena/?" + UTM],
    slvj: ["Reservar en SLVJ", "Book SLVJ", "https://restaurante.covermanager.com/slvj-cartagena/?" + UTM],
    club: ["Mesa en el club", "Club table", "https://site.fourvenues.com/es/casa-salvaje?" + UTM],
    vacation: ["Ver opciones", "See options", "https://www.vacationcartagena.com/es"],
    whatsapp: ["Lo prepara el concierge", "The concierge arranges it", null]
  };
  var root = document.documentElement;
  var TR = window.CS_CONCIERGE_TR || {};
  function lang(){ return root.getAttribute("data-lang") || "en"; }
  function cap(l){ return l.charAt(0).toUpperCase() + l.slice(1); }
  // Español e inglés vienen en cada llamada; los otros idiomas salen del diccionario, por el texto en inglés.
  function t(a, b){ var l = lang(); if(l === "es") return a; if(l === "en") return b; return (TR[b] && TR[b][l]) || b; }
  function wa(texto){ return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto); }
  function el(tag, cls, txt){ var n = document.createElement(tag); if(cls) n.className = cls; if(txt != null) n.textContent = txt; return n; }
  // Texto de un botón en el idioma que se ve (los botones traen un span por idioma).
  function visible(n){ var x = n && (n.querySelector("." + lang()) || n.querySelector(".en")); return (x || n || { textContent: "" }).textContent.trim(); }
  function enlace(cls, txt, href){ var a = el("a", cls, txt); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }

  function montar(opts){
    var form = document.getElementById("plan-form"), salida = document.getElementById("plan-salida");
    if(!form || !salida) return;
    var armar = document.getElementById("pl-armar"), aviso = document.getElementById("pl-aviso");
    var llegada = document.getElementById("pl-llegada"), nota = document.getElementById("pl-nota");
    var cuenta = { noches: 3, personas: 2 }, tocado = {}, ocupado = false;

    function ph(){ nota.placeholder = nota.dataset["ph" + cap(lang())] || nota.dataset.phEn; }
    document.addEventListener("cs-lang", ph); ph();

    // Fecha mínima: hoy en Cartagena.
    try{ llegada.min = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()); }catch(e){}

    // Contadores de noches y personas. Las personas salen en el paso 1 y en los extras: los dos van sincronizados.
    form.querySelectorAll(".stepper").forEach(function(s){
      var campo = s.dataset.campo, out = s.querySelector("output"), min = Number(s.dataset.min), max = Number(s.dataset.max);
      cuenta[campo] = Number(out.textContent) || cuenta[campo];
      s.querySelectorAll("button").forEach(function(b){
        b.addEventListener("click", function(){
          cuenta[campo] = Math.min(max, Math.max(min, cuenta[campo] + Number(b.dataset.paso)));
          tocado[campo] = true; aviso.textContent = "";
          form.querySelectorAll('.stepper[data-campo="' + campo + '"]').forEach(function(x){ x.classList.remove("pide"); x.querySelector("output").textContent = cuenta[campo]; });
        });
      });
    });
    // Tarjetas: varias por grupo; la ocasión es una sola.
    form.querySelectorAll(".tile, .ocasiones button").forEach(function(b){
      b.addEventListener("click", function(){
        var unica = b.closest(".ocasiones");
        if(unica) unica.querySelectorAll("button").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
        else b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
        aviso.textContent = "";
      });
    });

    function elegidos(grupo){ return [].map.call(form.querySelectorAll('[data-grupo="' + grupo + '"] [aria-pressed="true"]'), function(b){ return b.dataset.id; }); }
    function nombre(grupo, id){ var b = form.querySelector('[data-grupo="' + grupo + '"] [data-id="' + id + '"] b'); return b ? visible(b) : id; }
    function seleccion(){
      var oc = form.querySelector('.ocasiones [aria-pressed="true"]');
      return {
        llegada: llegada.value || "", noches: cuenta.noches, personas: cuenta.personas,
        quedarse: elegidos("quedarse"), dia: elegidos("dia"), noche: elegidos("noche"), extras: elegidos("extras"),
        ocasion: oc ? oc.dataset.id : "ninguna", nota: nota.value.trim().slice(0, 300),
        idioma: root.getAttribute("data-lang") || "es"
      };
    }
    // Resumen en palabras del huésped: para WhatsApp si algo falla y para el chat.
    function resumen(sel){
      var partes = [t("Quiero armar un plan en Cartagena", "I'd like to plan my time in Cartagena") + ": " + sel.personas + " " + t("personas", "people") + ", " + sel.noches + " " + t("noches", "nights") + (sel.llegada ? " " + t("desde el", "from") + " " + sel.llegada : "") + "."];
      [["quedarse", t("Dónde quedarnos", "Where to stay")], ["dia", t("De día", "By day")], ["noche", t("De noche", "At night")], ["extras", t("Extras", "Extras")]].forEach(function(g){
        var ids = sel[g[0]]; if(ids.length) partes.push(g[1] + ": " + ids.map(function(id){ return nombre(g[0], id); }).join(", ") + ".");
      });
      if(sel.ocasion !== "ninguna"){ var o = form.querySelector('.ocasiones [data-id="' + sel.ocasion + '"]'); partes.push(t("Ocasión", "Occasion") + ": " + (o ? visible(o) : sel.ocasion) + "."); }
      if(sel.nota) partes.push(sel.nota);
      return partes.join("\n");
    }

    // Lee el JSON aunque venga con una frase antes o después.
    function leer(texto){
      texto = String(texto || "").replace(/\[\[(REFUSAL|ERROR)\]\]/g, "");
      var a = texto.indexOf("{"), z = texto.lastIndexOf("}");
      if(a < 0 || z <= a) return null;
      try{ var p = JSON.parse(texto.slice(a, z + 1)); }catch(e){ return null; }
      if(!p || !Array.isArray(p.dias) || !p.dias.length) return null;
      return p;
    }
    function comoTexto(p){
      var l = [p.titulo || ""];
      if(p.intro) l.push(p.intro);
      p.dias.forEach(function(d){
        l.push("", String(d.fecha || ""));
        (d.momentos || []).forEach(function(m){ l.push("· " + (m.momento ? m.momento + ": " : "") + (m.plan || "") + (m.detalle ? " — " + m.detalle : "")); });
      });
      (p.notas || []).forEach(function(n){ l.push("", "· " + n); });
      return l.join("\n").trim();
    }

    function pintar(p, sel){
      salida.textContent = "";
      var hoja = el("article", "plan-hoja");
      hoja.appendChild(el("div", "eyebrow", t("Tu plan", "Your plan")));
      hoja.appendChild(el("h3", null, p.titulo || t("Tu Cartagena", "Your Cartagena")));
      if(p.intro) hoja.appendChild(el("p", "intro", p.intro));
      var dias = el("ol", "dias");
      var msgWa = String(p.whatsapp || resumen(sel)).slice(0, 1200);
      p.dias.slice(0, 7).forEach(function(d){
        var li = el("li", "dia");
        li.appendChild(el("h4", null, String(d.fecha || "")));
        var ul = el("ul", "momentos");
        (Array.isArray(d.momentos) ? d.momentos : []).slice(0, 4).forEach(function(m){
          var item = el("li"), cuerpo = el("div");
          item.appendChild(el("span", "cuando", String(m.momento || "")));
          cuerpo.appendChild(el("b", null, String(m.plan || "")));
          if(m.detalle) cuerpo.appendChild(el("p", null, String(m.detalle)));
          var pu = PUERTAS[String(m.puerta || "").trim()];
          if(pu) cuerpo.appendChild(enlace("ir", t(pu[0], pu[1]) + " →", pu[2] || wa(msgWa)));
          item.appendChild(cuerpo); ul.appendChild(item);
        });
        li.appendChild(ul); dias.appendChild(li);
      });
      hoja.appendChild(dias);
      if(Array.isArray(p.notas) && p.notas.length){
        var notas = el("ul", "notas");
        p.notas.slice(0, 4).forEach(function(n){ notas.appendChild(el("li", null, String(n))); });
        hoja.appendChild(notas);
      }
      var cta = el("div", "plan-cta");
      cta.appendChild(enlace("wa-btn grande", t("Mandar mi plan al concierge", "Send my plan to the concierge"), wa(msgWa)));
      if(opts.alChat){
        var chat = el("button", "btn", t("Seguir en el chat", "Continue in the chat")); chat.type = "button";
        chat.addEventListener("click", function(){ opts.alChat(resumen(sel), comoTexto(p)); });
        cta.appendChild(chat);
      }
      var otra = el("button", "btn ghost", t("Cambiar algo", "Change something")); otra.type = "button";
      otra.addEventListener("click", function(){ form.scrollIntoView({ behavior: "smooth", block: "start" }); });
      cta.appendChild(otra);
      hoja.appendChild(cta);
      hoja.appendChild(el("p", "pie", t("El concierge confirma disponibilidad y precios por WhatsApp. Casas, botes y tours, con nuestro aliado Vacation Cartagena.", "The concierge confirms availability and prices on WhatsApp. Villas, boats and tours with our partner Vacation Cartagena.")));
      salida.appendChild(hoja);
    }
    function fallo(sel, motivo){
      salida.textContent = "";
      var caja = el("div", "plan-hoja fallo");
      caja.appendChild(el("p", null, motivo || t("No pude armar el plan esta vez. Mándale tu idea al concierge y te lo arma una persona.", "I couldn't build the plan this time. Send your idea to the concierge and a person will put it together.")));
      caja.appendChild(enlace("wa-btn grande", t("Mandar mi idea al concierge", "Send my idea to the concierge"), wa(resumen(sel))));
      salida.appendChild(caja);
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      if(ocupado) return;
      var sel = seleccion();
      if(!sel.quedarse.length && !sel.dia.length && !sel.noche.length && !sel.extras.length && !sel.nota){
        aviso.textContent = t("Elige al menos una cosa: una casa, un bote o una noche.", "Pick at least one thing: a house, a boat or a night out.");
        return;
      }
      // Los extras se cotizan por persona: hay que saber cuántos son.
      if(sel.extras.length && !tocado.personas){
        var px = form.querySelector(".para-extras") || form.querySelector('.stepper[data-campo="personas"]');
        px.classList.add("pide"); px.scrollIntoView({ behavior: "smooth", block: "center" });
        aviso.textContent = t("¿Para cuántas personas son los extras? Ajusta el número y vuelve a armar el plan.", "How many people are the extras for? Set the number and build the plan again.");
        return;
      }
      ocupado = true; armar.disabled = true; aviso.textContent = "";
      salida.hidden = false; salida.textContent = "";
      var espera = el("div", "plan-hoja armando");
      espera.appendChild(el("p", null, t("La casa está armando tu plan…", "The house is putting your plan together…")));
      salida.appendChild(espera);
      salida.scrollIntoView({ behavior: "smooth", block: "start" });
      Promise.resolve().then(function(){ return opts.pedir(sel); })
        .then(function(texto){
          var p = leer(texto);
          if(p) pintar(p, sel); else fallo(sel);
        })
        .catch(function(e){ fallo(sel, e && e.mensaje); })
        .then(function(){ ocupado = false; armar.disabled = false; });
    });
  }

  window.CSPlan = { montar: montar };
})();
