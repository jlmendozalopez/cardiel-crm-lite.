/* Arranque, menú, rutas, búsqueda global y usuario activo. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};

  const MENU = [
    { grupo: "Operación comercial" },
    { ruta: "inicio", t: "Inicio", ico: "inicio" },
    { ruta: "cerebro", t: "Cerebro Digital", ico: "cerebro" },
    { ruta: "cotizaciones", t: "Cotizaciones", ico: "cotizacion", cuenta: () => db.t.cotizaciones.filter(db.requiereSeguimiento).length },
    { ruta: "clientes", t: "Clientes", ico: "clientes" },
    { grupo: "Conocimiento" },
    { ruta: "catalogo", t: "Catálogo", ico: "catalogo" },
    { ruta: "proveedores", t: "Proveedores y compras", ico: "proveedor" },
    { ruta: "documentos", t: "Documentos", ico: "documentos", cuenta: () => db.t.documentos.filter((d) => d.estado === "pendiente").length },
    { grupo: "Sistema" },
    { ruta: "configuracion", t: "Configuración", ico: "ajustes" },
  ];

  CRM.usuario = () => {
    let id = null;
    try { id = localStorage.getItem("cardiel_usuario"); } catch (e) { /* sin almacenamiento */ }
    return db.t.usuarios.find((x) => x.id_usuario === id) || db.t.usuarios[0] || { nombre: "Usuario", rol: "Ventas" };
  };

  function pintarMenu(actual) {
    u.$("#nav").innerHTML = MENU.map((m) => {
      if (m.grupo) return `<div class="nav-grupo">${u.esc(m.grupo)}</div>`;
      const n = m.cuenta ? m.cuenta() : 0;
      return `<a href="#/${m.ruta}" class="${actual === m.ruta ? "activo" : ""}">${I(m.ico, 19)}<span>${u.esc(m.t)}</span>${
        m.fase ? `<span class="fase">${m.fase}</span>` : n ? `<span class="cuenta">${n}</span>` : ""}</a>`;
    }).join("");
  }
  CRM.refrescarMenu = () => pintarMenu(rutaActual().vista);

  function pintarUsuario() {
    const us = CRM.usuario();
    u.$("#usuario-chip").innerHTML = `<div class="avatar">${u.iniciales(us.nombre)}</div><div><b>${u.esc(us.nombre)}</b><small>${u.esc(us.puesto || us.rol)}</small></div>`;
  }

  function rutaActual() {
    const partes = (location.hash.replace(/^#\/?/, "") || "inicio").split("/").map(decodeURIComponent);
    return { vista: partes[0] || "inicio", params: partes.slice(1) };
  }

  CRM.ir = (ruta) => { location.hash = "#/" + ruta; };

  /* Filas clicables operables con teclado y campos con nombre accesible, también en lo que se repinta después. */
  function prepararAccesible(raiz) {
    u.$$("tr.clic", raiz).forEach((tr) => { if (!tr.hasAttribute("tabindex")) { tr.tabIndex = 0; tr.setAttribute("role", "link"); } });
    u.$$(".pestanas", raiz).forEach((p) => { p.setAttribute("role", "tablist"); marcarPestanas(p); });
    u.mejorarControles(raiz);
    u.ligarEtiquetas(raiz);
  }
  function marcarPestanas(p) {
    u.$$("button", p).forEach((b) => { b.setAttribute("role", "tab"); b.setAttribute("aria-selected", b.classList.contains("activo")); });
  }
  let primeraVista = true;

  function navegar() {
    const { vista, params } = rutaActual();
    const v = CRM.vistas[vista] || CRM.vistas.inicio;
    const item = MENU.find((m) => m.ruta === vista) || MENU[1];
    document.title = `${item.t} · CARDIEL`;
    u.$("#btn-nueva").classList.toggle("oculto", vista === "cotizaciones");
    pintarMenu(vista);
    u.$("#lateral").classList.remove("abierto");
    const velo = u.$(".velo"); if (velo) velo.remove();
    const cont = u.$("#contenido");
    try {
      v.render(cont, params);
    } catch (e) {
      console.error(e);
      cont.innerHTML = `<div class="tarjeta vacio">${I("alerta", 28)}<b>Algo salió mal al abrir esta pantalla.</b><p>Vuelve a intentarlo o regresa a <a href="#/inicio">Inicio</a>. Detalle técnico: ${u.esc(e.message)}</p></div>`;
    }
    prepararAccesible(cont);
    window.scrollTo(0, 0);
    if (!primeraVista && !cont.contains(document.activeElement)) cont.focus({ preventScroll: true });
    primeraVista = false;
  }

  /* ── Búsqueda global ─────────────────────────────────────── */
  function buscarGlobal(q) {
    const caja = u.$("#resultados-globales");
    const n = u.norm(q);
    if (n.length < 2) { caja.classList.add("oculto"); return; }
    const c = u.compacto(q);
    const tiene = (...v) => v.some((x) => x && (u.norm(x).includes(n) || (c.length >= 3 && u.compacto(x).includes(c))));
    const clientes = db.t.clientes.filter((x) => tiene(x.nombre_cliente, x.ciudad_base, x.rfc)).slice(0, 4);
    const cots = db.t.cotizaciones.filter((x) => tiene(x.id_cotizacion, db.nombreCliente(x.id_cliente), x.no_economico, x.no_serie, x.atencion)).slice(0, 5);
    const prods = db.t.productos.filter((x) => tiene(x.no_parte_cardiel, x.descripcion_original, x.numero_parte_fabricante, x.marca_comercial)).slice(0, 5);
    let html = "";
    const r = (t) => u.resaltar(t, q.trim());
    if (clientes.length) html += `<div class="grupo">Clientes</div>` + clientes.map((x) => `<a href="#/clientes/${x.id_cliente}">${I("clientes", 16)}<span>${r(x.nombre_cliente)}</span><small>${u.esc(x.ciudad_base || "")}</small></a>`).join("");
    if (cots.length) html += `<div class="grupo">Cotizaciones</div>` + cots.map((x) => `<a href="#/cotizaciones/${x.id_cotizacion}">${I("cotizacion", 16)}<span>${r(x.id_cotizacion)} · ${r(db.nombreCliente(x.id_cliente))}</span><small>${u.fFecha(x.fecha)}</small></a>`).join("");
    if (prods.length) html += `<div class="grupo">Catálogo</div>` + prods.map((x) => `<a href="#/catalogo/${x.id_producto}">${I("catalogo", 16)}<span>${r(x.descripcion_original)}</span><small>${r(x.no_parte_cardiel || "")}</small></a>`).join("");
    html += `<div class="grupo">Cerebro Digital</div><a href="#/cerebro" data-preguntar>${I("cerebro", 16)}Preguntar al Cerebro: “${u.esc(q)}”</a>`;
    caja.innerHTML = html;
    caja.classList.remove("oculto");
    const p = u.$("[data-preguntar]", caja);
    p.addEventListener("click", (e) => { e.preventDefault(); CRM.preguntar(q); });
  }

  CRM.preguntar = (q) => {
    sessionStorage.setItem("cardiel_pregunta", q);
    u.$("#resultados-globales").classList.add("oculto");
    u.$("#buscar-global").value = "";
    if (rutaActual().vista === "cerebro") navegar(); else CRM.ir("cerebro");
  };

  function elegirUsuario() {
    const actual = CRM.usuario();
    u.modal({
      titulo: "Usuario activo", ancho: 420,
      cuerpo: `<p class="texto-modal">Quien registra cotizaciones, seguimientos y validaciones.</p><div class="campos mt-16"><div class="campo c-12"><label>Usuario</label><select name="id">${
        u.opciones(db.t.usuarios.map((x) => ({ v: x.id_usuario, t: `${x.nombre} · ${x.puesto || x.rol}` })), actual.id_usuario)}</select></div></div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Cambiar", clase: "btn-pri", fn: (m) => {
        try { localStorage.setItem("cardiel_usuario", u.$("[name=id]", m).value); } catch (e) { /* */ }
        pintarUsuario(); u.aviso("Usuario cambiado"); navegar();
      } }],
    });
  }

  async function iniciar() {
    u.$("#btn-menu").innerHTML = I("menu", 20);
    u.$("#ico-buscar").outerHTML = I("buscar", 17);
    u.$("#btn-nueva").innerHTML = I("mas", 17) + "<span>Nueva cotización</span>";
    await db.cargar();
    db.pintarEstado();
    pintarUsuario();
    u.$("#usuario-chip").addEventListener("click", elegirUsuario);
    u.$("#usuario-chip").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegirUsuario(); } });
    const cont = u.$("#contenido");
    new MutationObserver(u.debounce(() => prepararAccesible(cont), 30)).observe(cont, { childList: true, subtree: true });
    cont.addEventListener("keydown", (e) => {
      const tr = e.target.closest && e.target.closest("tr.clic");
      if (tr && e.target === tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); tr.click(); }
    });
    cont.addEventListener("click", (e) => {
      const p = e.target.closest && e.target.closest(".pestanas");
      if (p) setTimeout(() => marcarPestanas(p));
    });
    u.$("#saltar").addEventListener("click", (e) => { e.preventDefault(); cont.focus(); });
    document.addEventListener("keydown", (e) => {
      const escribiendo = e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !escribiendo && !e.ctrlKey && !e.metaKey && !u.$(".modal-fondo")) { e.preventDefault(); u.$("#buscar-global").focus(); }
    });
    u.$("#btn-menu").addEventListener("click", () => {
      u.$("#lateral").classList.add("abierto");
      const velo = document.createElement("div"); velo.className = "velo";
      velo.addEventListener("click", () => { u.$("#lateral").classList.remove("abierto"); velo.remove(); });
      document.body.appendChild(velo);
    });
    const inp = u.$("#buscar-global");
    inp.addEventListener("input", u.debounce(() => buscarGlobal(inp.value), 120));
    inp.addEventListener("keydown", (e) => {
      const caja = u.$("#resultados-globales");
      const enlaces = caja.classList.contains("oculto") ? [] : u.$$("a", caja);
      const actual = enlaces.findIndex((a) => a.classList.contains("sel"));
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && enlaces.length) {
        e.preventDefault();
        const sig = (actual + (e.key === "ArrowDown" ? 1 : -1) + enlaces.length) % enlaces.length;
        enlaces.forEach((a, i) => a.classList.toggle("sel", i === sig));
        enlaces[sig].scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "Enter" && inp.value.trim()) {
        const elegido = enlaces[actual] || u.$("#resultados-globales a:not([data-preguntar])");
        if (elegido && elegido.hasAttribute("data-preguntar")) CRM.preguntar(inp.value.trim());
        else if (elegido) { location.hash = elegido.getAttribute("href"); inp.value = ""; caja.classList.add("oculto"); }
        else CRM.preguntar(inp.value.trim());
      }
      if (e.key === "Escape") { inp.value = ""; u.$("#resultados-globales").classList.add("oculto"); }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".buscador-global")) u.$("#resultados-globales").classList.add("oculto");
      else if (e.target.closest("#resultados-globales a")) { inp.value = ""; u.$("#resultados-globales").classList.add("oculto"); }
    });
    window.addEventListener("hashchange", navegar);
    const bc = u.$("#btn-carpeta");
    bc.innerHTML = I("documentos", 15) + "<span></span>";
    bc.addEventListener("click", async () => {
      try {
        const n = await db.conectarCarpeta();
        if (!n) return;
        db.pintarEstado(); pintarUsuario(); navegar();
        u.aviso(`Carpeta «${n}» conectada. Cada cambio se guarda en sus JSON.`);
      } catch (e) { if (e.name !== "AbortError") u.aviso(e.message, "error"); }
    });
    const bs = u.$("#btn-salir");
    bs.innerHTML = I("salir", 15) + "<span>Salir</span>";
    bs.addEventListener("click", CRM.salir);
    db.pintarEstado();
    navegar();
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})(window.CRM);
