/* Utilidades comunes: formato, texto, DOM, avisos y ventanas. */
window.CRM = window.CRM || {};
(function (CRM) {
  "use strict";
  const u = {};

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  u.MESES = MESES; u.MESES_C = MESES_C;

  u.esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  u.$ = (sel, raiz) => (raiz || document).querySelector(sel);
  u.$$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));

  const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNum = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
  u.mxn = (v) => (v === null || v === undefined || v === "" || isNaN(v) ? "—" : fmtMXN.format(Number(v)));
  u.mxnCorto = (v) => {
    v = Number(v || 0);
    if (Math.abs(v) >= 1e6) return "$" + fmtNum.format(Math.round(v / 1e5) / 10) + " M";
    if (Math.abs(v) >= 1e4) return "$" + fmtNum.format(Math.round(v / 100) / 10) + " k";
    return fmtMXN.format(v).replace(".00", "");
  };
  u.num = (v) => (v === null || v === undefined || isNaN(v) ? "—" : fmtNum.format(Number(v)));
  u.dinero2 = (v) => fmtNum.format(Math.round(Number(v || 0) * 100) / 100);
  u.pct = (v, d = 0) => (v === null || isNaN(v) ? "—" : (v * 100).toFixed(d) + " %");

  u.hoy = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  u.iso = (d) => { d = d instanceof Date ? d : new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  u.hoyISO = () => u.iso(u.hoy());
  u.ahoraISO = () => new Date().toISOString();
  u.fecha = (s) => {
    if (!s) return null;
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  };
  u.fFecha = (s) => { const d = u.fecha(s); return d && !isNaN(d) ? `${String(d.getDate()).padStart(2, "0")} ${MESES_C[d.getMonth()]} ${d.getFullYear()}` : "—"; };
  u.fFechaLarga = (s) => { const d = u.fecha(s); return d ? `${d.getDate()} ${MESES[d.getMonth()].replace(/^./, (c) => c.toUpperCase())} del ${d.getFullYear()}` : ""; };
  u.dias = (s) => { const d = u.fecha(s); return d ? Math.round((u.hoy() - d) / 86400000) : null; };
  u.relativo = (s) => {
    const n = u.dias(s);
    if (n === null) return "—";
    if (n <= 0) return "hoy";
    if (n === 1) return "ayer";
    if (n < 30) return `hace ${n} días`;
    if (n < 365) { const m = Math.round(n / 30); return m === 1 ? "hace 1 mes" : `hace ${m} meses`; }
    return `hace ${(n / 365).toFixed(1).replace(".0", "")} años`;
  };

  /* Texto: minúsculas, sin acentos, sin signos raros. Conserva 7/8, 16.5, S-24691. */
  u.norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[“”"«»]/g, " in ").replace(/[^a-z0-9ñ\/\.\-\s]/g, " ").replace(/\s+/g, " ").trim();
  u.compacto = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  u.iniciales = (s) => String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  u.siguienteId = (lista, campo, prefijo, ancho) => {
    let max = 0;
    const re = new RegExp("^" + prefijo + "(\\d+)");
    for (const r of lista) { const m = String(r[campo] || "").match(re); if (m) max = Math.max(max, +m[1]); }
    return prefijo + String(max + 1).padStart(ancho, "0");
  };

  u.agrupar = (lista, fn) => { const m = new Map(); for (const x of lista) { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
  u.suma = (lista, fn) => lista.reduce((a, x) => a + (Number(fn(x)) || 0), 0);
  u.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  u.ordenar = (lista, fn, desc) => [...lista].sort((a, b) => { const x = fn(a), y = fn(b); return (x > y ? 1 : x < y ? -1 : 0) * (desc ? -1 : 1); });

  /* ── Avisos ─────────────────────────────────────────────── */
  /* accion: { texto, fn } agrega un botón (p. ej. «Deshacer») y deja el aviso más tiempo. */
  u.aviso = (texto, tipo = "ok", accion) => {
    let cont = u.$("#avisos");
    if (!cont) { cont = document.createElement("div"); cont.id = "avisos"; cont.setAttribute("role", "status"); cont.setAttribute("aria-live", "polite"); document.body.appendChild(cont); }
    const el = document.createElement("div");
    el.className = "aviso aviso-" + tipo;
    el.innerHTML = CRM.icono(tipo === "error" ? "alerta" : tipo === "info" ? "info" : "check-circulo", 18) + `<span>${u.esc(texto)}</span>` +
      (accion ? `<button type="button" class="aviso-accion">${u.esc(accion.texto)}</button>` : "");
    cont.appendChild(el);
    const dura = accion ? 7000 : tipo === "error" ? 5000 : 3600;
    const quitar = () => { el.classList.add("sale"); setTimeout(() => el.remove(), 320); };
    let t = setTimeout(quitar, dura);
    el.addEventListener("mouseenter", () => clearTimeout(t));
    el.addEventListener("mouseleave", () => { t = setTimeout(quitar, 1800); });
    if (accion) u.$(".aviso-accion", el).addEventListener("click", () => { clearTimeout(t); quitar(); accion.fn(); });
  };

  /* Liga cada <label> de un .campo con su control y da nombre accesible a los campos que solo tienen placeholder. */
  let idCampo = 0;
  u.ligarEtiquetas = (raiz) => {
    u.$$(".campo", raiz).forEach((c) => {
      const lab = u.$(":scope > label", c), ctl = u.$("input:not([type=hidden]), select, textarea", c);
      if (!lab || !ctl || lab.htmlFor) return;
      if (!ctl.id) ctl.id = "campo-" + (++idCampo);
      lab.htmlFor = ctl.id;
    });
    u.$$("input:not([type=hidden]):not([type=file]), select, textarea", raiz).forEach((el) => {
      if (el.labels && el.labels.length || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return;
      const nombre = el.dataset.etiqueta || el.placeholder || el.title;
      if (nombre) el.setAttribute("aria-label", nombre);
    });
  };

  /* ── Listas buscables ────────────────────────────────────── */
  const resaltar = (u.resaltar = (t, q) => {
    t = String(t ?? "");
    const i = q ? t.toLowerCase().indexOf(q.toLowerCase()) : -1;
    return i < 0 ? u.esc(t) : u.esc(t.slice(0, i)) + "<mark>" + u.esc(t.slice(i, i + q.length)) + "</mark>" + u.esc(t.slice(i + q.length));
  });
  const coincide = (texto, n) => u.norm(texto).includes(n) || (n.length >= 3 && u.compacto(texto).includes(u.compacto(n)));
  const primeroLosQueEmpiezan = (n) => (a, b) => u.norm(b.t).startsWith(n) - u.norm(a.t).startsWith(n);

  function armarCombo(inp, { fuente, alElegir, alSalir, crear, libre }) {
    const lista = document.createElement("div");
    lista.className = "combo-lista oculto";
    lista.setAttribute("role", "listbox");
    lista.id = "combo-" + (++idCampo);
    inp.after(lista);
    inp.setAttribute("role", "combobox");
    inp.setAttribute("aria-autocomplete", "list");
    inp.setAttribute("aria-expanded", "false");
    inp.setAttribute("aria-controls", lista.id);
    inp.autocomplete = "off";
    let items = [], activo = -1, filtrar = false;
    const abierta = () => !lista.classList.contains("oculto");
    const cerrar = () => { lista.classList.add("oculto"); inp.setAttribute("aria-expanded", "false"); inp.removeAttribute("aria-activedescendant"); };
    const marcar = () => {
      u.$$(".combo-op", lista).forEach((el, i) => el.classList.toggle("sel", i === activo));
      const el = document.getElementById(`${lista.id}-${activo}`);
      if (el) { inp.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); } else inp.removeAttribute("aria-activedescendant");
    };
    const pintar = () => {
      const q = filtrar ? inp.value.trim() : "";
      items = fuente(q);
      if (crear && q && !items.some((o) => u.norm(o.t) === u.norm(q))) items.push({ crear: true, t: q });
      if (!items.length) { cerrar(); return; }
      lista.innerHTML = items.map((o, i) => `<div class="combo-op${o.crear ? " crear" : ""}${o.actual ? " actual" : ""}" role="option" id="${lista.id}-${i}" data-i="${i}" aria-selected="${!!o.actual}">${o.crear ? CRM.icono("mas", 14) + `<span>${crear(q)}</span>` : `<span>${resaltar(o.t, q)}</span>`}</div>`).join("");
      activo = q ? (libre ? -1 : 0) : items.findIndex((o) => o.actual);
      lista.classList.remove("oculto");
      inp.setAttribute("aria-expanded", "true");
      marcar();
    };
    const elegir = (i) => { const o = items[i]; if (!o) return; cerrar(); filtrar = false; alElegir(o); };
    inp.addEventListener("focus", () => { filtrar = false; if (!libre) inp.select(); });
    inp.addEventListener("mousedown", () => { if (!abierta()) setTimeout(pintar); });
    inp.addEventListener("input", () => { filtrar = true; pintar(); });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!abierta()) return pintar();
        activo = (activo + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        marcar();
      } else if (e.key === "Enter" && abierta() && activo >= 0) { e.preventDefault(); elegir(activo); }
      else if (e.key === "Escape" && abierta()) { e.preventDefault(); e.stopPropagation(); cerrar(); alSalir(); }
      else if (e.key === "Tab" && abierta() && filtrar && activo >= 0 && !items[activo].crear) elegir(activo);
    });
    inp.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== inp) { cerrar(); filtrar = false; alSalir(); } }, 120));
    lista.addEventListener("mousedown", (e) => e.preventDefault());
    lista.addEventListener("click", (e) => { const op = e.target.closest(".combo-op"); if (op) elegir(+op.dataset.i); });
  }

  /* Convierte un <select> en campo con sugerencias mientras escribes. El select sigue siendo la fuente de verdad.
     data-crear="cliente" | "proveedor" | "cat:<catálogo>" permite agregar lo que no existe sin salir del flujo. */
  const valorSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  u.combo = (sel) => {
    if (sel.dataset.combo || sel.multiple) return;
    sel.dataset.combo = "1";
    const etiquetas = sel.labels ? [...sel.labels] : [];
    const caja = document.createElement("div");
    caja.className = "combo combo-sel";
    caja.style.cssText = sel.style.cssText;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.id = (sel.id || "lista-" + (++idCampo)) + "-q";
    if (sel.classList.contains("entrada")) inp.className = "entrada";
    const vacio = [...sel.options].find((o) => !o.value);
    inp.placeholder = vacio ? vacio.textContent : "Escribe para buscar…";
    sel.before(caja);
    caja.append(inp);
    caja.append(sel);
    etiquetas.forEach((l) => (l.htmlFor = inp.id));
    if (!etiquetas.length) inp.setAttribute("aria-label", sel.getAttribute("aria-label") || inp.placeholder);
    if (sel.required) inp.setAttribute("aria-required", "true");
    sel.hidden = true;
    sel.tabIndex = -1;
    const sincronizar = () => { const o = sel.selectedOptions[0]; inp.value = o && o.value ? o.textContent : ""; };
    Object.defineProperty(sel, "value", { configurable: true, get() { return valorSelect.get.call(sel); }, set(v) { valorSelect.set.call(sel, v); sincronizar(); } });
    sel.focus = (o) => inp.focus(o);
    new MutationObserver(sincronizar).observe(sel, { childList: true, subtree: true });
    sel.addEventListener("change", sincronizar);
    const tipo = sel.dataset.crear;
    const cambiar = (v) => { sel.value = v; sel.dispatchEvent(new Event("change", { bubbles: true })); };
    armarCombo(inp, {
      fuente: (q) => {
        const n = u.norm(q);
        const ops = [...sel.options].map((o) => ({ v: o.value, t: o.textContent, actual: o.selected && !!o.value }));
        return n ? ops.filter((o) => o.v && coincide(o.t, n)).sort(primeroLosQueEmpiezan(n)).slice(0, 60) : ops;
      },
      crear: tipo ? (q) => `Agregar «${u.esc(q)}»` : null,
      alElegir: (o) => {
        if (!o.crear) return cambiar(o.v);
        const nuevo = CRM.crearValor && CRM.crearValor(tipo, o.t);
        if (!nuevo) return sincronizar();
        if (![...sel.options].some((x) => x.value === nuevo.v)) sel.add(new Option(nuevo.t, nuevo.v));
        cambiar(nuevo.v);
      },
      alSalir: () => { if (!inp.value.trim() && vacio && sel.value) cambiar(""); else sincronizar(); },
    });
    sincronizar();
  };

  /* Campo de texto libre con sugerencias de un catálogo. Con data-cat, lo nuevo que escribas se agrega al catálogo. */
  u.comboTexto = (inp) => {
    const dl = inp.list;
    if (inp.dataset.combo || !dl) return;
    inp.dataset.combo = "1";
    inp.removeAttribute("list");
    const caja = document.createElement("div");
    caja.className = "combo";
    inp.before(caja);
    caja.append(inp);
    const valores = () => [...dl.options].map((o) => o.value);
    armarCombo(inp, {
      libre: true,
      fuente: (q) => { const n = u.norm(q); return valores().filter((v) => !n || coincide(v, n)).map((v) => ({ v, t: v, actual: v === inp.value })); },
      alElegir: (o) => { inp.value = o.v; inp.dispatchEvent(new Event("change", { bubbles: true })); },
      alSalir: () => {},
    });
    const cat = inp.dataset.cat;
    if (cat) inp.addEventListener("change", () => {
      const v = inp.value.trim();
      if (v && !valores().some((x) => u.norm(x) === u.norm(v)) && CRM.aprender && CRM.aprender(cat, v)) dl.append(new Option(v, v));
    });
  };

  /* Dictado por voz en cualquier campo marcado con data-dictado (Chrome y Edge, con internet). */
  const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;
  u.dictado = (campo) => {
    if (!Reconocedor || campo.dataset.dictadoListo) return;
    campo.dataset.dictadoListo = "1";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn-dictar";
    b.setAttribute("aria-label", "Dictar por voz");
    b.setAttribute("aria-pressed", "false");
    b.title = "Dictar por voz";
    b.innerHTML = CRM.icono("microfono", 18);
    if (!campo.parentElement.classList.contains("con-dictado")) { const c = document.createElement("div"); c.className = "con-dictado"; campo.before(c); c.append(campo); }
    campo.after(b);
    let rec = null;
    const parar = () => { if (rec) rec.stop(); };
    b.addEventListener("click", () => {
      if (rec) return parar();
      rec = new Reconocedor();
      rec.lang = "es-MX";
      rec.interimResults = true;
      rec.continuous = false;
      const base = campo.value ? campo.value.replace(/\s*$/, " ") : "";
      rec.onresult = (e) => {
        campo.value = base + [...e.results].map((r) => r[0].transcript).join("");
        campo.dispatchEvent(new Event("input", { bubbles: true }));
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") u.aviso("Permite el micrófono en el navegador para dictar.", "error");
        else if (e.error === "network") u.aviso("El dictado necesita internet.", "error");
        else if (e.error !== "no-speech" && e.error !== "aborted") u.aviso("No se pudo dictar. Intenta de nuevo.", "error");
      };
      rec.onend = () => { rec = null; b.classList.remove("escuchando"); b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Dictar por voz"); campo.focus(); };
      rec.start();
      b.classList.add("escuchando");
      b.setAttribute("aria-pressed", "true");
      b.setAttribute("aria-label", "Detener dictado");
    });
  };

  /* Aplica las mejoras de captura a un contenedor: listas largas buscables, catálogos que crecen y dictado. */
  u.mejorarControles = (raiz) => {
    u.$$("select:not([data-combo]):not([multiple])", raiz).forEach((s) => { if (s.dataset.crear || (s.options.length > 8 && !s.hasAttribute("data-nativo"))) u.combo(s); });
    u.$$("input[list]:not([data-combo])", raiz).forEach(u.comboTexto);
    u.$$("[data-dictado]", raiz).forEach(u.dictado);
  };

  /* ── Ventana modal ───────────────────────────────────────── */
  u.modal = ({ titulo, cuerpo, acciones = [], ancho = 560, alAbrir }) => {
    const fondo = document.createElement("div");
    const idTitulo = "modal-titulo-" + Date.now();
    const origen = document.activeElement;
    fondo.className = "modal-fondo";
    fondo.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${idTitulo}" style="max-width:${ancho}px">
      <div class="modal-cab"><h3 id="${idTitulo}">${u.esc(titulo)}</h3><button class="btn-icono" data-cerrar aria-label="Cerrar">${CRM.icono("x", 18)}</button></div>
      <div class="modal-cuerpo">${cuerpo}</div>
      <div class="modal-pie">${acciones.map((a, i) => `<button class="btn ${a.clase || "btn-sec"}" data-accion="${i}">${a.icono ? CRM.icono(a.icono, 16) : ""}${u.esc(a.texto)}</button>`).join("")}</div>
    </div>`;
    document.body.appendChild(fondo);
    u.mejorarControles(fondo);
    u.ligarEtiquetas(fondo);
    new MutationObserver(u.debounce(() => u.mejorarControles(fondo), 30)).observe(u.$(".modal-cuerpo", fondo), { childList: true, subtree: true });
    const cerrar = () => {
      fondo.classList.add("sale"); setTimeout(() => fondo.remove(), 150); document.removeEventListener("keydown", tecla);
      if (origen && document.contains(origen)) origen.focus();
    };
    const tecla = (e) => {
      if (e.key === "Escape") return cerrar();
      if (e.key !== "Tab") return;
      const foc = u.$$("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", fondo).filter((x) => !x.disabled && x.offsetParent);
      if (!foc.length) return;
      const pri = foc[0], ult = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    };
    document.addEventListener("keydown", tecla);
    fondo.addEventListener("mousedown", (e) => { if (e.target === fondo) cerrar(); });
    u.$$("[data-cerrar]", fondo).forEach((b) => b.addEventListener("click", cerrar));
    u.$$("[data-accion]", fondo).forEach((b) => b.addEventListener("click", async () => {
      const a = acciones[+b.dataset.accion];
      if (!a.fn) return cerrar();
      const r = await a.fn(fondo);
      if (r !== false) cerrar();
    }));
    requestAnimationFrame(() => fondo.classList.add("visible"));
    const primero = u.$("input,select,textarea", fondo) || u.$(".modal-pie .btn:first-child", fondo);
    if (primero) setTimeout(() => primero.focus(), 60);
    if (alAbrir) alAbrir(fondo);
    return { el: fondo, cerrar };
  };

  /* Copia al portapapeles; si el navegador no lo permite, muestra el texto listo para seleccionar. */
  /* Motivo de pérdida con un toque. El valor vive en un input oculto [name]; "Otro" permite escribir uno nuevo, que se aprende. */
  u.motivos = (nombre, valor) => {
    const usos = new Map();
    CRM.db.t.cotizaciones.forEach((c) => { if (c.motivo_perdida) usos.set(c.motivo_perdida, (usos.get(c.motivo_perdida) || 0) + 1); });
    const lista = CRM.db.cat("motivo_perdida").filter((m) => !/^otro$/i.test(m)).sort((a, b) => (usos.get(b) || 0) - (usos.get(a) || 0));
    if (valor && !lista.includes(valor)) lista.unshift(valor);
    return `<div class="motivos" role="radiogroup" aria-label="Motivo de pérdida"><input type="hidden" name="${nombre}" value="${u.esc(valor || "")}">
      ${lista.map((m) => `<button type="button" class="motivo-chip${m === valor ? " activo" : ""}" role="radio" aria-checked="${m === valor}" data-motivo="${u.esc(m)}">${u.esc(m)}</button>`).join("")}
      <button type="button" class="motivo-chip otro" data-otro aria-expanded="false">${CRM.icono("mas", 14)}Otro</button>
      <input class="entrada motivo-otro oculto" placeholder="Escribe el motivo y presiona Enter" aria-label="Otro motivo de pérdida"></div>`;
  };
  u.ligarMotivos = (raiz, alElegir) => {
    u.$$(".motivos", raiz).forEach((g) => {
      if (g.dataset.ligado) return; g.dataset.ligado = "1";
      const oculto = u.$("input[type=hidden]", g), otro = u.$(".motivo-otro", g);
      const marcar = (v) => {
        oculto.value = v;
        u.$$("[data-motivo]", g).forEach((b) => { const on = b.dataset.motivo === v; b.classList.toggle("activo", on); b.setAttribute("aria-checked", on); });
        oculto.dispatchEvent(new Event("change", { bubbles: true }));
      };
      g.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.hasAttribute("data-otro")) { otro.classList.remove("oculto"); b.setAttribute("aria-expanded", "true"); otro.focus(); return; }
        otro.classList.add("oculto"); otro.value = "";
        marcar(b.dataset.motivo);
        if (alElegir) alElegir(b.dataset.motivo);
      });
      const usarOtro = () => {
        const v = otro.value.trim(); if (!v) return false;
        CRM.aprender("motivo_perdida", v); marcar(v);
        return true;
      };
      otro.addEventListener("input", () => { oculto.value = otro.value.trim(); u.$$("[data-motivo]", g).forEach((b) => { b.classList.remove("activo"); b.setAttribute("aria-checked", "false"); }); });
      otro.addEventListener("change", usarOtro);
      otro.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (usarOtro() && alElegir) alElegir(oculto.value); } });
    });
  };

  u.copiar = async (texto, aviso = "Copiado") => {
    try { await navigator.clipboard.writeText(texto); u.aviso(aviso); }
    catch (e) { u.modal({ titulo: "Copia este texto", ancho: 520, cuerpo: `<textarea class="entrada" style="height:170px;padding:10px" readonly aria-label="Texto para copiar">${u.esc(texto)}</textarea>`, acciones: [{ texto: "Cerrar" }] }); }
  };

  u.confirmar = (titulo, texto, textoBoton = "Confirmar", peligro = false) => new Promise((ok) => {
    u.modal({ titulo, ancho: 440, cuerpo: `<p class="texto-modal">${u.esc(texto)}</p>`,
      acciones: [{ texto: "Cancelar", fn: () => ok(false) }, { texto: textoBoton, clase: peligro ? "btn-peligro" : "btn-pri", fn: () => ok(true) }] });
  });

  /* Lee los campos [name] de un contenedor como objeto. */
  u.leerForm = (raiz) => {
    const o = {};
    u.$$("[name]", raiz).forEach((el) => {
      if (el.type === "checkbox") o[el.name] = el.checked;
      else if (el.type === "number") o[el.name] = el.value === "" ? null : Number(el.value);
      else o[el.name] = el.value.trim() === "" ? null : el.value.trim();
    });
    return o;
  };

  u.opciones = (lista, sel, vacio) => (vacio !== undefined ? `<option value="">${u.esc(vacio)}</option>` : "") +
    lista.map((o) => { const v = typeof o === "object" ? o.v : o; const t = typeof o === "object" ? o.t : o; return `<option value="${u.esc(v)}"${String(v) === String(sel ?? "") ? " selected" : ""}>${u.esc(t)}</option>`; }).join("");

  u.descargar = (nombre, contenido, tipo = "application/json") => {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* Descarga un archivo; en el celular ofrece además compartirlo (WhatsApp, correo, Archivos). */
  u.esCelular = () => matchMedia("(pointer: coarse)").matches && innerWidth < 900;
  u.entregar = (nombre, blob, mensaje = "Archivo descargado") => {
    u.descargar(nombre, blob);
    let archivo = null;
    try { archivo = new File([blob], nombre, { type: blob.type }); } catch (e) { /* navegadores sin File */ }
    const compartible = archivo && u.esCelular() && navigator.canShare && navigator.canShare({ files: [archivo] });
    u.aviso(mensaje, "ok", compartible ? { texto: "Compartir", fn: () => navigator.share({ files: [archivo], title: nombre }).catch(() => {}) } : undefined);
  };

  u.leerArchivo = (archivo) => new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(r.result); r.onerror = mal;
    r.readAsDataURL(archivo);
  });

  u.tamano = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");

  /* Paginación simple */
  u.paginar = (lista, pagina, porPagina) => {
    const total = Math.max(1, Math.ceil(lista.length / porPagina));
    pagina = Math.min(Math.max(1, pagina), total);
    return { filas: lista.slice((pagina - 1) * porPagina, pagina * porPagina), pagina, total };
  };
  u.htmlPaginas = (p, n) => p.total <= 1 ? "" : `<div class="paginacion"><span>${n} registros</span>
    <button class="btn-icono" data-pag="${p.pagina - 1}" ${p.pagina <= 1 ? "disabled" : ""} aria-label="Anterior">${CRM.icono("chev-izq", 16)}</button>
    <span>Página ${p.pagina} de ${p.total}</span>
    <button class="btn-icono" data-pag="${p.pagina + 1}" ${p.pagina >= p.total ? "disabled" : ""} aria-label="Siguiente">${CRM.icono("chev-der", 16)}</button></div>`;

  CRM.u = u;
})(window.CRM);
