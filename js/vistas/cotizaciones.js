/* Cotizaciones: tablero por etapa, lista y editor con PDF. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};
  const filtros = { q: "", cliente: "", periodo: "365", pagina: 1, vista: sessionStorage.getItem("cardiel_vista_cot") || (matchMedia("(max-width: 860px)").matches ? "lista" : "tablero") };

  CRM.vistas.cotizaciones = {
    render(cont, params) {
      if (params[0]) return editor(cont, params[0]);
      lista(cont);
    },
  };

  /* ── Tablero y lista ─────────────────────────────────────── */
  function lista(cont) {
    cont.innerHTML = `
      <div class="encabezado"><div class="titulos"><h1>Cotizaciones</h1><p>Que ninguna cotización se quede sin seguimiento.${filtros.vista === "tablero" ? `<span class="solo-escritorio"> Arrastra una tarjeta para cambiarla de etapa, o ábrela y cambia la etapa en Seguimiento.</span>` : ""}</p></div>
        <div class="acciones">
          <div class="segmentado"><button data-vista="tablero" class="${filtros.vista === "tablero" ? "activo" : ""}">${I("tablero", 15)}Tablero</button><button data-vista="lista" class="${filtros.vista === "lista" ? "activo" : ""}">${I("lista", 15)}Lista</button></div>
          <button class="btn btn-sec" id="btn-csv" title="Descarga en Excel lo que estás viendo, con los filtros aplicados">${I("descargar", 16)}Excel</button>
          <a class="btn btn-pri" href="#/cotizaciones/nueva">${I("mas", 16)}Nueva cotización</a>
        </div></div>
      <div class="tarjeta">
        <div class="filtros">
          <div class="busqueda">${I("buscar", 16)}<input class="entrada" id="f-q" placeholder="Folio, cliente, pieza, no. económico…" value="${u.esc(filtros.q)}"></div>
          <select class="entrada" id="f-cliente">${u.opciones(u.ordenar(db.t.clientes, (c) => c.nombre_cliente).map((c) => ({ v: c.id_cliente, t: c.nombre_cliente })), filtros.cliente, "Todos los clientes")}</select>
          <select class="entrada" id="f-periodo">${u.opciones([{ v: "30", t: "Últimos 30 días" }, { v: "90", t: "Últimos 90 días" }, { v: "365", t: "Últimos 12 meses" }, { v: "todo", t: "Todo el historial" }], filtros.periodo)}</select>
          <span class="tenue" id="f-conteo" style="margin-left:auto;font-size:12.5px"></span>
        </div>
        <div id="zona-cot" style="padding:${filtros.vista === "tablero" ? "14px" : "0"}"></div>
      </div>`;
    const pintar = () => (filtros.vista === "tablero" ? tablero() : tabla());
    u.$("#f-q").addEventListener("input", u.debounce((e) => { filtros.q = e.target.value; filtros.pagina = 1; pintar(); }, 150));
    u.$("#f-cliente").addEventListener("change", (e) => { filtros.cliente = e.target.value; filtros.pagina = 1; pintar(); });
    u.$("#f-periodo").addEventListener("change", (e) => { filtros.periodo = e.target.value; filtros.pagina = 1; pintar(); });
    u.$$("[data-vista]").forEach((b) => b.addEventListener("click", () => { filtros.vista = b.dataset.vista; sessionStorage.setItem("cardiel_vista_cot", filtros.vista); lista(cont); }));
    u.$("#btn-csv").addEventListener("click", () => exportarExcel(filtradas()));
    pintar();
  }

  function filtradas() {
    const n = u.norm(filtros.q);
    const desde = filtros.periodo === "todo" ? "" : u.iso(new Date(Date.now() - Number(filtros.periodo) * 864e5));
    return db.t.cotizaciones.filter((c) => {
      if (filtros.cliente && c.id_cliente !== filtros.cliente) return false;
      if (desde && (c.fecha || "") < desde && !db.abierta(c)) return false;
      if (n) {
        const texto = u.norm([c.id_cotizacion, db.nombreCliente(c.id_cliente), c.atencion, c.no_economico, c.no_serie, c.base, ...db.lineasCot(c.id_cotizacion).map((l) => l.descripcion_documento + " " + (l.numero_parte_catalogo || ""))].join(" "));
        if (!texto.includes(n)) return false;
      }
      return true;
    });
  }

  function tablero() {
    const cots = filtradas();
    u.$("#f-conteo").textContent = `${cots.length} cotizaciones`;
    const zona = u.$("#zona-cot");
    zona.innerHTML = `<div class="kanban">${db.ETAPAS.map((e) => {
      const lista = u.ordenar(cots.filter((c) => c.etapa === e.id), (c) => c.fecha + c.id_cotizacion, true);
      const visibles = e.abierta ? lista : lista.slice(0, 25);
      return `<div class="columna" data-etapa="${e.id}">
        <div class="columna-cab"><h4>${e.t}<span class="monto">${u.mxnCorto(u.suma(lista, db.totalCot))}</span></h4><span class="n">${lista.length}</span></div>
        <div class="columna-cuerpo">${visibles.map(tarjeta).join("") || `<p class="columna-vacia">Sin cotizaciones</p>`}
        ${lista.length > visibles.length ? `<a class="mas-tarjetas" href="#" data-ver-lista>Ver ${lista.length - visibles.length} más en la lista</a>` : ""}</div></div>`;
    }).join("")}</div>`;
    u.$$(".tarjeta-cot", zona).forEach((t) => {
      t.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", t.dataset.id); t.classList.add("arrastrando"); });
      t.addEventListener("dragend", () => t.classList.remove("arrastrando"));
    });
    u.$$(".columna", zona).forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("sobre"); });
      col.addEventListener("dragleave", () => col.classList.remove("sobre"));
      col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("sobre"); moverEtapa(e.dataTransfer.getData("text/plain"), col.dataset.etapa, tablero); });
    });
    u.$$("[data-ver-lista]", zona).forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); filtros.vista = "lista"; sessionStorage.setItem("cardiel_vista_cot", "lista"); lista(u.$("#contenido")); }));
  }

  function tarjeta(c) {
    const l = db.lineasCot(c.id_cotizacion);
    const seg = db.requiereSeguimiento(c);
    const d = seg ? u.dias(db.ultimaActividad(c)) : 0;
    return `<a class="tarjeta-cot" href="#/cotizaciones/${c.id_cotizacion}" draggable="true" data-id="${c.id_cotizacion}">
      <div class="fila1"><span>${c.id_cotizacion}</span><span>${String(c.fecha || "").startsWith(String(new Date().getFullYear())) ? u.fFecha(c.fecha).replace(/ \d{4}$/, "") : u.fFecha(c.fecha)}</span></div>
      <div class="cli">${u.esc(db.nombreCliente(c.id_cliente))}</div>
      <div class="desc">${u.esc(l[0] ? l[0].descripcion_documento : "Sin partidas")}${l.length > 1 ? ` +${l.length - 1}` : ""}</div>
      <div class="fila3"><span class="total">${u.mxn(db.totalCot(c))}</span>${seg ? `<span class="alerta-seg" title="${d} días sin movimiento">${I("reloj", 13)}${d} d</span>` : ""}${c.etapa === "perdida" && c.motivo_perdida ? `<span class="motivo">${u.esc(c.motivo_perdida)}</span>` : ""}</div>
    </a>`;
  }

  function moverEtapa(id, etapa, alTerminar) {
    const c = db.cotizacion(id);
    if (!c || c.etapa === etapa) return;
    if (etapa === "perdida") {
      const md = u.modal({ titulo: `¿Por qué se perdió ${id}?`, ancho: 480,
        cuerpo: `<div class="campo"><label for="m-nota">Comentario (opcional)</label><input id="m-nota" name="nota" placeholder="Ej. Lo consiguió más barato con otro"></div>
          <p class="motivos-ayuda mt-16"><b>¿Por qué?</b> Toca uno y se guarda.</p>${u.motivos("motivo", "")}`,
        acciones: [{ texto: "Cancelar" }],
        alAbrir: (m) => u.ligarMotivos(m, (motivo) => { const nota = u.$("#m-nota", m).value.trim(); md.cerrar(); aplicar(c, etapa, motivo, nota, alTerminar); alTerminar(); }) });
      return;
    }
    aplicar(c, etapa, null, null, alTerminar); alTerminar();
  }

  function aplicar(c, etapa, motivo, nota, alTerminar) {
    const previo = { etapa: c.etapa, motivo_perdida: c.motivo_perdida, proximo_seguimiento: c.proximo_seguimiento };
    c.etapa = etapa;
    c.motivo_perdida = etapa === "perdida" ? motivo : null;
    if (!db.etapa(etapa).abierta) c.proximo_seguimiento = null;
    db.registrarActividad({ tipo: etapa === "ganada" ? "ganada" : etapa === "perdida" ? "perdida" : "nota", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente,
      texto: `Cambió a ${db.etapa(etapa).t}${motivo ? ` (${motivo})` : ""}${nota ? ": " + nota : ""}` });
    db.guardar("cotizaciones");
    CRM.refrescarMenu();
    u.aviso(`${c.id_cotizacion} pasó a ${db.etapa(etapa).t}`, "ok", { texto: "Deshacer", fn: () => {
      Object.assign(c, previo);
      db.registrarActividad({ tipo: "nota", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente, texto: `Regresó a ${db.etapa(previo.etapa).t}` });
      db.guardar("cotizaciones"); CRM.refrescarMenu();
      if (alTerminar && u.$("#zona-cot") && filtros.vista === "tablero") alTerminar();
      u.aviso(`${c.id_cotizacion} regresó a ${db.etapa(previo.etapa).t}`);
    } });
  }

  function tabla() {
    const cots = u.ordenar(filtradas(), (c) => (c.fecha || "") + c.id_cotizacion, true);
    u.$("#f-conteo").textContent = `${cots.length} cotizaciones · ${u.mxn(u.suma(cots, db.totalCot))}`;
    const p = u.paginar(cots, filtros.pagina, 20);
    const zona = u.$("#zona-cot");
    zona.innerHTML = cots.length ? `<div class="tabla-cont"><table class="tabla tabla-cots"><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Unidad</th><th>Partidas</th><th class="num">Total s/IVA</th><th>Etapa</th><th>Última actividad</th></tr></thead><tbody>
      ${p.filas.map((c) => { const l = db.lineasCot(c.id_cotizacion); const seg = db.requiereSeguimiento(c); return `<tr class="clic" data-id="${c.id_cotizacion}">
        <td><span class="principal-celda">${c.id_cotizacion}</span>${c.origen && c.origen !== "historico" ? `<div class="sec">${u.esc(c.origen)}</div>` : ""}</td>
        <td class="nowrap">${u.fFecha(c.fecha)}</td>
        <td><span class="principal-celda">${u.esc(db.nombreCliente(c.id_cliente))}</span><div class="sec">${u.esc(c.atencion || "")}${c.base ? " · " + u.esc(c.base) : ""}</div></td>
        <td>${u.esc(c.unidad_tipo || "")}<div class="sec">${u.esc([c.unidad_marca, c.no_economico].filter(Boolean).join(" · "))}</div></td>
        <td style="max-width:280px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.esc(l[0] ? l[0].descripcion_documento : "—")}</div><div class="sec">${l.length} partida${l.length === 1 ? "" : "s"}</div></td>
        <td class="num"><b>${u.mxn(db.totalCot(c))}</b></td>
        <td><span class="insignia etapa-${c.etapa}">${db.etapa(c.etapa).t}</span>${c.motivo_perdida ? `<div class="sec">${u.esc(c.motivo_perdida)}</div>` : ""}</td>
        <td class="nowrap">${seg ? `<span class="alerta-seg" style="color:var(--rojo);font-weight:700;font-size:12px">${I("reloj", 13)} ${u.relativo(db.ultimaActividad(c))}</span>` : u.relativo(db.ultimaActividad(c))}</td></tr>`; }).join("")}
      </tbody></table></div>${u.htmlPaginas(p, cots.length)}` : `<div class="vacio">${I("buscar", 28)}No hay cotizaciones con esos filtros.</div>`;
    u.$$("tr[data-id]", zona).forEach((tr) => tr.addEventListener("click", () => CRM.ir("cotizaciones/" + tr.dataset.id)));
    u.$$("[data-pag]", zona).forEach((b) => b.addEventListener("click", () => { filtros.pagina = +b.dataset.pag; tabla(); }));
  }

  function exportarExcel(cots) {
    const filas = [];
    for (const c of u.ordenar(cots, (c) => c.fecha, true)) for (const l of db.lineasCot(c.id_cotizacion))
      filas.push([c.id_cotizacion, c.fecha, db.nombreCliente(c.id_cliente), c.atencion, db.etapa(c.etapa).t, c.unidad_tipo === "REFACCION" ? "Refacción" : c.unidad_tipo ? c.unidad_tipo.charAt(0) + c.unidad_tipo.slice(1).toLowerCase() : "",
        l.descripcion_documento, l.numero_parte_documento || l.numero_parte_catalogo, l.cantidad, l.precio_unitario, l.subtotal, c.motivo_perdida, c.vendedor || c.elaboro]);
    const periodo = { 30: "últimos 30 días", 90: "últimos 90 días", 365: "últimos 12 meses", todo: "todo el historial" }[filtros.periodo] || "";
    CRM.excel({
      archivo: `CARDIEL_cotizaciones_${u.hoyISO()}.xlsx`, hoja: "Cotizaciones", titulo: "Cotizaciones CARDIEL",
      subtitulo: [`${cots.length} cotizaciones · ${filas.length} partidas`, periodo, filtros.cliente && db.nombreCliente(filtros.cliente), filtros.q && `búsqueda «${filtros.q}»`, `generado ${u.fFecha(u.hoyISO())} por ${CRM.usuario().nombre}`].filter(Boolean).join(" · "),
      columnas: [{ t: "Folio", w: 11 }, { t: "Fecha", w: 11, tipo: "fecha" }, { t: "Cliente", w: 30 }, { t: "Atención", w: 20 }, { t: "Etapa", w: 14 }, { t: "Unidad", w: 11 },
        { t: "Partida", w: 46 }, { t: "No. parte", w: 16 }, { t: "Cant.", w: 7, tipo: "num", total: true }, { t: "Precio unitario", w: 15, tipo: "mxn" }, { t: "Subtotal", w: 15, tipo: "mxn", total: true },
        { t: "Motivo de pérdida", w: 22 }, { t: "Vendedor", w: 20 }],
      filas,
    });
  }

  /* ── Editor ──────────────────────────────────────────────── */
  function editor(cont, id) {
    const nueva = id === "nueva";
    let cot, lineas;
    if (nueva) {
      const pre = JSON.parse(sessionStorage.getItem("cardiel_precot") || "null");
      sessionStorage.removeItem("cardiel_precot");
      if (!pre || !(pre.productos || pre.libre)) return rapida(cont, pre || {});
      ({ cot, lineas } = cotNueva(pre));
    } else {
      const orig = db.cotizacion(id);
      if (!orig) { cont.innerHTML = `<div class="tarjeta vacio">${I("alerta", 28)}No existe la cotización ${u.esc(id)}. <a href="#/cotizaciones">Volver</a></div>`; return; }
      cot = { ...orig };
      lineas = db.lineasCot(id).map((l) => ({ ...l, materiales: l.materiales ?? l.precio_unitario, mano_obra: l.mano_obra ?? 0 }));
    }
    const ed = { cot, lineas, nueva };
    pintarEditor(cont, ed);
  }

  function cotNueva(pre) {
    let cot, lineas;
    {
      const cli = pre && pre.id_cliente ? db.cliente(pre.id_cliente) : null;
      const usuario = CRM.usuario();
      const direccion = db.t.usuarios.find((x) => x.rol === "Dirección");
      cot = { id_cotizacion: null, fecha: u.hoyISO(), id_cliente: (cli && cli.id_cliente) || "", base: cli ? cli.ciudad_base : null, atencion: null,
        unidad_tipo: (pre && pre.unidad_tipo) || "REFACCION", unidad_marca: null, no_economico: null, no_serie: null, placas: null,
        condiciones_pago: (cli && cli.condiciones_pago) || "30 días de crédito", vigencia: db.cat("vigencia")[0], tiempo_entrega: "INMEDIATO, despues de recibida la O.C.** No hay cambios ni devoluciones**",
        forma_pago: db.cat("forma_pago")[0], elaboro: usuario.nombre, autorizo: direccion ? direccion.nombre : "", no_proveedor_cliente: cli ? cli.no_proveedor : null,
        etapa: (pre && pre.etapa) || "cotizada", motivo_perdida: null, proximo_seguimiento: u.iso(new Date(Date.now() + 3 * 864e5)), notas: null, vendedor: usuario.nombre,
        origen: pre ? (pre.libre ? "Cerebro · por identificar" : "Cerebro Digital") : "CRM" };
      lineas = [];
      if (pre && pre.productos) pre.productos.forEach((idp) => lineas.push(lineaDeProducto(db.producto(idp), cot.id_cliente)));
      if (pre && pre.libre) { lineas.push({ id_producto: null, descripcion_documento: pre.libre.toUpperCase(), cantidad: 1, materiales: 0, mano_obra: 0 }); cot.notas = "Pieza por identificar. Falta evidencia (marca, número, medida o foto)."; }
      if (!lineas.length) lineas.push(lineaVacia());
    }
    return { cot, lineas };
  }

  /* ── Nueva cotización: pega o dicta, revisa y confirma ───── */
  function rapida(cont, pre) {
    const st = { id_cliente: pre.id_cliente || "", unidad_tipo: "", partidas: null };
    const tipoUnidad = (x) => x === "REFACCION" ? "Sin unidad (solo refacción)" : x.charAt(0) + x.slice(1).toLowerCase();
    const iva = db.config().iva ?? 0.16;
    cont.innerHTML = `<div class="rapida">
      <div class="encabezado"><div class="titulos">
        <div class="migas"><a href="#/cotizaciones">Cotizaciones</a>${I("chev-der", 13)}<span>Nueva</span></div>
        <h1>Nueva cotización</h1>
        <p>Pega o dicta lo que te pidió el cliente. Armo las partidas y tú solo revisas.</p></div></div>
      <div class="tarjeta rapida-caja">
        <textarea id="r-texto" aria-label="Lo que pidió el cliente" rows="4" data-dictado placeholder="Ej. Me cotizas 2 bujes Hendrickson 7/8 y 1 balata para Cascadia, es para Castores"></textarea>
        <div class="rapida-pie">
          <button type="button" class="btn btn-texto btn-s" id="r-completo">Llenar el formulario completo</button>
          <button type="button" class="btn btn-pri" id="r-armar">${I("cerebro", 16)}Armar cotización</button>
        </div>
      </div>
      <div id="r-revision"></div>
    </div>`;
    const texto = u.$("#r-texto");
    texto.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); armar(); } });
    u.$("#r-armar").addEventListener("click", armar);
    u.$("#r-completo").addEventListener("click", () => abrirEditor(false));
    texto.focus();

    function armar() {
      const v = texto.value.trim();
      if (!v) { texto.focus(); u.aviso("Pega o dicta primero lo que pidió el cliente.", "info"); return; }
      const d = CRM.cerebro.desglosar(v, { id_cliente: st.id_cliente });
      if (d.id_cliente) st.id_cliente = d.id_cliente;
      if (d.unidad_tipo) st.unidad_tipo = d.unidad_tipo;
      st.partidas = d.partidas.map((p) => ({ texto: p.texto, cantidad: p.cantidad, opciones: [...p.candidatos.map((c) => c.producto), ...p.cercanos].filter((x, i, a) => a.findIndex((y) => y.id_producto === x.id_producto) === i).slice(0, 4),
        producto: p.candidatos[0] ? p.candidatos[0].producto : null, confianza: p.candidatos[0] ? p.candidatos[0].confianza : null }));
      if (!st.partidas.length) { u.aviso("No encontré piezas en el texto. Escribe qué pieza y cuántas.", "info"); return; }
      pintarRevision();
      u.$("#r-revision").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function lineasDe() {
      return st.partidas.map((p) => p.producto ? { ...lineaDeProducto(p.producto, st.id_cliente), cantidad: p.cantidad }
        : { ...lineaVacia(), descripcion_documento: p.texto.toUpperCase(), materiales: null });
    }

    function pintarRevision() {
      const lineas = lineasDe();
      const subtotal = u.suma(lineas, (l) => (Number(l.materiales) || 0) * l.cantidad);
      const sinPrecio = lineas.filter((l) => !(l.materiales > 0)).length;
      const clientes = u.ordenar(db.t.clientes, (x) => x.nombre_cliente);
      u.$("#r-revision").innerHTML = `<div class="tarjeta revision">
        <div class="tarjeta-cab"><h3>Revisa y confirma</h3><span class="sub">${st.partidas.length} partida${st.partidas.length === 1 ? "" : "s"}</span></div>
        <div class="tarjeta-cuerpo">
          <div class="campos">
            <div class="campo c-8"><label for="r-cliente">Cliente</label><select id="r-cliente" data-crear="cliente">${u.opciones(clientes.map((x) => ({ v: x.id_cliente, t: x.nombre_cliente })), st.id_cliente, "¿Para quién es?")}</select></div>
            <div class="campo c-4"><label for="r-unidad">Unidad</label><select id="r-unidad">${u.opciones(db.cat("unidad_tipo").map((x) => ({ v: x, t: tipoUnidad(x) })), st.unidad_tipo || "REFACCION")}</select></div>
          </div>
          <ul class="rev-partidas">${st.partidas.map((p, i) => {
            const l = lineas[i];
            return `<li class="rev-p${p.producto ? "" : " por-identificar"}">
              <div class="rev-cant" role="group" aria-label="Cantidad">
                <button type="button" class="btn-icono" data-menos="${i}" aria-label="Uno menos">−</button>
                <input type="number" min="1" value="${p.cantidad}" data-cant="${i}" aria-label="Cantidad de la partida ${i + 1}">
                <button type="button" class="btn-icono" data-mas="${i}" aria-label="Uno más">+</button>
              </div>
              <div class="rev-desc">
                <b>${u.esc(p.producto ? p.producto.descripcion_original : p.texto.toUpperCase())}</b>
                <small>${p.producto ? `${u.esc(p.producto.no_parte_cardiel || p.producto.numero_parte_fabricante || "")}${p.confianza && p.confianza !== "alta" ? ` · confianza ${p.confianza}` : ""}` : `${I("alerta", 13)}Por identificar`}
                  ${p.opciones.length > (p.producto ? 1 : 0) ? `<button type="button" class="enlace" data-cambiar="${i}">${p.producto ? "Cambiar" : "Elegir pieza"}</button>` : ""}</small>
              </div>
              <div class="rev-precio">${l.materiales > 0 ? u.mxn(l.materiales * l.cantidad) : `<span class="tenue">Sin precio</span>`}</div>
              <button type="button" class="btn-icono" data-quitar="${i}" aria-label="Quitar partida ${i + 1}">${I("x", 15)}</button>
            </li>`;
          }).join("")}</ul>
          <form class="rev-agregar" id="r-mas"><input class="entrada" id="r-mas-q" placeholder="Agregar otra pieza… (ej. 1 rótula Holland)" aria-label="Agregar otra pieza"><button class="btn btn-sec btn-s" type="submit">${I("mas", 15)}Agregar</button></form>
          <div class="rev-total"><span>Total con IVA${sinPrecio ? ` <small>· ${sinPrecio} sin precio</small>` : ""}</span><b>${u.mxn(subtotal * (1 + iva))}</b></div>
          <p class="error-campo oculto" id="r-error" role="alert"></p>
        </div>
        <div class="rev-acciones">
          <button type="button" class="btn btn-texto" id="r-editar">Ver todos los campos</button>
          <button type="button" class="btn btn-pri" id="r-crear">${I("check", 17)}Crear cotización</button>
        </div>
      </div>`;
      const rev = u.$("#r-revision");
      u.$("#r-cliente").addEventListener("change", (e) => { st.id_cliente = e.target.value; pintarRevision(); });
      u.$("#r-unidad").addEventListener("change", (e) => { st.unidad_tipo = e.target.value; });
      rev.querySelectorAll("[data-cant]").forEach((inp) => inp.addEventListener("change", () => { st.partidas[inp.dataset.cant].cantidad = Math.max(1, Math.round(Number(inp.value) || 1)); pintarRevision(); }));
      rev.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        const d = b.dataset;
        if (d.menos) { const p = st.partidas[d.menos]; p.cantidad = Math.max(1, p.cantidad - 1); pintarRevision(); }
        else if (d.mas) { st.partidas[d.mas].cantidad++; pintarRevision(); }
        else if (d.quitar) {
          const [quitada] = st.partidas.splice(Number(d.quitar), 1); pintarRevision();
          u.aviso("Partida quitada", "ok", { texto: "Deshacer", fn: () => { st.partidas.splice(Number(d.quitar), 0, quitada); if (u.$("#r-revision")) pintarRevision(); } });
        } else if (d.cambiar) elegir(Number(d.cambiar));
      });
      u.$("#r-mas").addEventListener("submit", (e) => {
        e.preventDefault();
        const q = u.$("#r-mas-q").value.trim(); if (!q) return;
        const extra = CRM.cerebro.desglosar(q, { id_cliente: st.id_cliente, unidad_tipo: st.unidad_tipo }).partidas;
        if (!extra.length) { u.aviso("No reconocí una pieza en ese texto.", "info"); return; }
        extra.forEach((p) => st.partidas.push({ texto: p.texto, cantidad: p.cantidad, opciones: [...p.candidatos.map((c) => c.producto), ...p.cercanos].slice(0, 4), producto: p.candidatos[0] ? p.candidatos[0].producto : null, confianza: p.candidatos[0] ? p.candidatos[0].confianza : null }));
        pintarRevision(); u.$("#r-mas-q").focus();
      });
      u.$("#r-editar").addEventListener("click", () => abrirEditor(false));
      u.$("#r-crear").addEventListener("click", () => abrirEditor(true));
    }

    function elegir(i) {
      const p = st.partidas[i];
      const md = u.modal({ titulo: "¿Cuál pieza es?", ancho: 520,
        cuerpo: `<p class="tenue">El cliente pidió: «${u.esc(p.texto)}»</p><div class="opciones-pieza">${p.opciones.map((x, k) => `<button type="button" class="opcion-pieza${p.producto && p.producto.id_producto === x.id_producto ? " actual" : ""}" data-k="${k}"><b>${u.esc(x.descripcion_original)}</b><small>${u.esc([x.no_parte_cardiel, x.numero_parte_fabricante, x.segmento_origen].filter(Boolean).join(" · "))}</small></button>`).join("")}
          <button type="button" class="opcion-pieza" data-k="-1"><b>Dejarla por identificar</b><small>Se cotiza con la descripción del cliente y se confirma después</small></button></div>`,
        acciones: [{ texto: "Cancelar" }],
        alAbrir: (m) => m.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => {
          const k = Number(b.dataset.k);
          p.producto = k >= 0 ? p.opciones[k] : null; p.confianza = k >= 0 ? "alta" : null;
          md.cerrar();
          pintarRevision();
        })) });
    }

    function abrirEditor(guardarYa) {
      const conPartidas = st.partidas && st.partidas.length;
      if (guardarYa && !st.id_cliente) {
        const err = u.$("#r-error"); err.textContent = "Elige para qué cliente es la cotización."; err.classList.remove("oculto");
        const q = u.$("#r-cliente-q") || u.$("#r-cliente"); q.focus(); q.closest(".campo").classList.add("error"); return;
      }
      const { cot } = cotNueva({ id_cliente: st.id_cliente, unidad_tipo: st.unidad_tipo || null });
      cot.origen = conPartidas ? "Pegado o dictado" : "CRM";
      if (st.unidad_tipo) cot.unidad_tipo = st.unidad_tipo;
      const lineas = conPartidas ? lineasDe() : [lineaVacia()];
      const pend = conPartidas ? st.partidas.filter((p) => !p.producto) : [];
      if (pend.length) cot.notas = `Por identificar: ${pend.map((p) => p.texto).join("; ")}. Falta evidencia (marca, número, medida o foto).`;
      if (conPartidas && pend.length === st.partidas.length) cot.etapa = "solicitud";
      if (conPartidas) cot.notas = [cot.notas, `Mensaje original: ${u.$("#r-texto").value.trim()}`].filter(Boolean).join("\n");
      const ed = { cot, lineas, nueva: true };
      pintarEditor(cont, ed);
      if (guardarYa) guardar(ed, cont);
    }
  }

  function lineaVacia() { return { id_producto: null, descripcion_documento: "", cantidad: 1, materiales: null, mano_obra: 0, numero_parte_documento: null }; }

  function lineaDeProducto(p, idCliente) {
    if (!p) return lineaVacia();
    const a = db.antecedentes(p.id_producto, idCliente);
    const precio = (a.ultimaCliente || a.ultima || {}).precio_unitario ?? p.precio_lista ?? null;
    const compra = a.ultimaCompra;
    return { id_producto: p.id_producto, descripcion_documento: p.descripcion_original, numero_parte_catalogo: p.numero_parte_fabricante || p.no_parte_cardiel,
      numero_parte_documento: p.numero_parte_fabricante || null, cantidad: 1, materiales: precio, mano_obra: 0,
      id_proveedor_cotizado: compra ? compra.oc.id_proveedor : null, costo_proveedor_unitario: compra ? compra.costo_unitario : null };
  }

  function pintarEditor(cont, ed) {
    const c = ed.cot;
    const clientes = u.ordenar(db.t.clientes, (x) => x.nombre_cliente);
    const tipoUnidad = (x) => x === "REFACCION" ? "Sin unidad (solo refacción)" : x.charAt(0) + x.slice(1).toLowerCase();
    cont.innerHTML = `<div class="editor-cot">
      <div class="encabezado"><div class="titulos">
        <div class="migas"><a href="#/cotizaciones">Cotizaciones</a>${I("chev-der", 13)}<span>${ed.nueva ? "Nueva" : c.id_cotizacion}</span></div>
        <h1>${ed.nueva ? "Nueva cotización" : `Cotización ${c.id_cotizacion}`}</h1>
        <p>${ed.nueva ? "Se asigna folio al guardar." : `${u.esc(db.nombreCliente(c.id_cliente))} · ${u.fFecha(c.fecha)} · elaboró ${u.esc(c.elaboro || "—")}`}${c.origen && c.origen !== "historico" ? ` · Origen: ${u.esc(c.origen)}` : ""}</p></div>
        <div class="acciones">
          ${ed.nueva ? "" : `<span class="insignia etapa-${c.etapa}" style="font-size:12.5px;padding:5px 12px">${db.etapa(c.etapa).t}</span>`}
          ${ed.nueva ? "" : `<button class="btn btn-sec" id="btn-wa">${I("mensaje", 16)}WhatsApp</button>`}
          <button class="btn btn-sec" id="btn-ver-pdf">${I("ver", 16)}Ver PDF</button>
          <button class="btn btn-sec" id="btn-pdf">${I("pdf", 16)}Descargar PDF</button>
          <button class="btn btn-pri" id="btn-guardar" title="Atajo: Ctrl+S">${I("guardar", 16)}Guardar</button>
        </div></div>
      <div class="editor">
        <div class="tarjeta">
          <div class="seccion-form"><h4>${I("clientes", 15)}Cliente</h4>
            <div class="campos">
              <div class="campo c-8"><label for="e-cliente">Cliente <span class="req" aria-hidden="true">*</span></label><div style="display:flex;gap:8px"><select name="id_cliente" id="e-cliente" style="flex:1" required data-crear="cliente">${u.opciones(clientes.map((x) => ({ v: x.id_cliente, t: x.nombre_cliente })), c.id_cliente, "Selecciona un cliente…")}</select><button class="btn btn-sec" type="button" id="btn-nuevo-cli" title="Nuevo cliente" aria-label="Nuevo cliente">${I("mas", 16)}</button></div></div>
              <div class="campo c-4"><label>Fecha</label><input type="date" name="fecha" value="${c.fecha || ""}"></div>
              <div class="campo c-4"><label>Atención (contacto)</label><input name="atencion" list="dl-contactos" value="${u.esc(c.atencion || "")}" placeholder="Nombre de quien solicita"><datalist id="dl-contactos"></datalist></div>
              <div class="campo c-4"><label>Base / ciudad</label><input name="base" list="dl-bases" value="${u.esc(c.base || "")}"><datalist id="dl-bases"></datalist></div>
              <div class="campo c-4"><label>No. de proveedor (del cliente)</label><input name="no_proveedor_cliente" value="${u.esc(c.no_proveedor_cliente ?? "")}"></div>
            </div></div>
          <div class="seccion-form" id="sec-partidas"><h4>${I("catalogo", 15)}Partidas</h4>
            <div class="tabla-cont"><table class="partidas"><thead><tr><th>It</th><th style="min-width:260px">Descripción y detalle</th><th style="width:130px">No. parte</th><th style="width:80px">Cant.</th><th style="width:118px">Materiales</th><th style="width:100px">M.O.</th><th style="width:110px" class="der">Total</th><th style="width:72px"></th></tr></thead><tbody id="partidas"></tbody></table></div>
            <p class="error-campo oculto mt-8" id="error-partidas" role="alert"></p>
            <div class="acciones mt-8"><button class="btn btn-sec btn-s" id="btn-linea">${I("mas", 15)}Agregar partida</button><button class="btn btn-texto btn-s" id="btn-preguntar">${I("cerebro", 15)}Identificar pieza con el Cerebro</button></div>
          </div>
          <details class="plegable" id="pl-unidad" ${c.no_economico || c.no_serie || c.placas ? "open" : ""}>
            <summary><h4>${I("remolque", 15)}Unidad</h4><span class="resumen" id="res-unidad"></span><span class="accion">Editar ${I("chev-abajo", 14)}</span></summary>
            <div class="seccion-form"><div class="campos">
              <div class="campo c-12"><label>Unidad registrada del cliente</label><select id="e-unidad"></select></div>
              <div class="campo c-3"><label>Tipo</label><select name="unidad_tipo">${u.opciones(db.cat("unidad_tipo").map((x) => ({ v: x, t: tipoUnidad(x) })), c.unidad_tipo)}</select></div>
              <div class="campo c-3"><label>Marca</label><input name="unidad_marca" value="${u.esc(c.unidad_marca || "")}"></div>
              <div class="campo c-3"><label>No. económico</label><input name="no_economico" value="${u.esc(c.no_economico || "")}"></div>
              <div class="campo c-3"><label>Placas</label><input name="placas" value="${u.esc(c.placas || "")}"></div>
              <div class="campo c-12"><label>No. de serie (VIN)</label><input name="no_serie" value="${u.esc(c.no_serie || "")}" maxlength="25"></div>
            </div></div>
          </details>
          <details class="plegable" id="pl-comercial">
            <summary><h4>${I("escudo", 15)}Aspectos comerciales</h4><span class="resumen" id="res-comercial"></span><span class="accion">Editar ${I("chev-abajo", 14)}</span></summary>
            <div class="seccion-form"><div class="campos">
              <div class="campo c-12"><label>Tiempo de entrega</label><input name="tiempo_entrega" list="dl-entrega" data-cat="tiempo_entrega" value="${u.esc(c.tiempo_entrega || "")}"><datalist id="dl-entrega">${db.cat("tiempo_entrega").map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
              <div class="campo"><label>Condiciones de pago</label><input name="condiciones_pago" list="dl-cond" data-cat="condiciones_pago" value="${u.esc(c.condiciones_pago || "")}"><datalist id="dl-cond">${db.cat("condiciones_pago").map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
              <div class="campo"><label>Forma de pago</label><input name="forma_pago" list="dl-forma" data-cat="forma_pago" value="${u.esc(c.forma_pago || "")}"><datalist id="dl-forma">${db.cat("forma_pago").map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
              <div class="campo c-12"><label>Vigencia de la cotización</label><input name="vigencia" list="dl-vig" data-cat="vigencia" value="${u.esc(c.vigencia || "")}"><datalist id="dl-vig">${db.cat("vigencia").map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
              <div class="campo"><label>Elaboró</label><input name="elaboro" list="dl-us" value="${u.esc(c.elaboro || "")}"></div>
              <div class="campo"><label>Autorizó</label><input name="autorizo" list="dl-us" value="${u.esc(c.autorizo || "")}"><datalist id="dl-us">${db.t.usuarios.map((x) => `<option value="${u.esc(x.nombre)}">`).join("")}</datalist></div>
              <div class="campo c-12"><label>Notas internas (no salen en el PDF)</label><textarea name="notas" rows="2">${u.esc(c.notas || "")}</textarea></div>
            </div></div>
          </details>
        </div>
        <div class="panel-lateral">
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Totales</h3><span class="sub">MXN</span></div><div class="tarjeta-cuerpo"><div class="totales" id="totales"></div></div></div>
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Seguimiento</h3></div><div class="tarjeta-cuerpo">
            <div class="campos">
              <div class="campo c-12"><label>Etapa</label><select name="etapa" id="e-etapa">${u.opciones(db.ETAPAS.map((e) => ({ v: e.id, t: e.t })), c.etapa)}</select></div>
              <div class="campo c-12" id="e-motivo-c"><label>Motivo de pérdida</label>${u.motivos("motivo_perdida", c.motivo_perdida)}</div>
              <div class="campo c-12" id="e-prox-c"><label>Próximo seguimiento</label><input type="date" name="proximo_seguimiento" value="${c.proximo_seguimiento || ""}"></div>
            </div>
            ${ed.nueva ? "" : `<div class="mt-16" style="display:flex;gap:8px"><input class="entrada" id="nota-nueva" placeholder="Agregar nota a la bitácora…" style="flex:1"><button class="btn btn-sec" id="btn-nota" aria-label="Agregar nota">${I("mas", 16)}</button></div>
            <ul class="bitacora mt-8" id="bitacora"></ul>`}
          </div></div>
          ${ed.nueva ? "" : `<div class="tarjeta"><div class="tarjeta-cab"><h3>Más acciones</h3></div><div class="tarjeta-cuerpo" style="display:flex;flex-direction:column;gap:8px">
            ${c.etapa === "ganada" ? `<button class="btn btn-marino" id="btn-compra">${I("proveedor", 16)}Registrar compra al proveedor</button>` : ""}
            <button class="btn btn-sec" id="btn-duplicar">${I("duplicar", 16)}Duplicar como nueva</button>
            <a class="btn btn-sec" href="#/clientes/${c.id_cliente}">${I("clientes", 16)}Ficha del cliente</a>
            <button class="btn btn-texto" id="btn-borrar" style="color:var(--rojo)">${I("borrar", 16)}Eliminar cotización</button>
          </div></div>`}
        </div>
      </div>
      <div class="barra-cot" role="region" aria-label="Total y acciones de la cotización">
        <div class="tot-barra"><small>Total con IVA</small><b id="total-barra">—</b></div>
        ${ed.nueva ? "" : `<button class="btn-icono" type="button" id="btn-wa-m" aria-label="Mandar por WhatsApp">${I("mensaje", 20)}</button>`}
        <button class="btn-icono" type="button" id="btn-pdf-m" aria-label="Descargar PDF">${I("pdf", 20)}</button>
        <button class="btn btn-pri" type="button" id="btn-guardar-m">${I("guardar", 16)}Guardar</button>
      </div></div>`;

    const raiz = cont;
    const valor = (n) => (u.$(`[name=${n}]`, raiz) || {}).value || "";
    const resumir = () => {
      const uni = [tipoUnidad(valor("unidad_tipo")), valor("unidad_marca"), valor("no_economico") && "Eco " + valor("no_economico"), valor("placas")].filter(Boolean);
      u.$("#res-unidad").textContent = uni.join(" · ");
      u.$("#res-comercial").textContent = [valor("condiciones_pago"), valor("vigencia").replace(/ a partir.*$/, ""), valor("tiempo_entrega").replace(/[,*].*$/, "").trim()].filter(Boolean).join(" · ") || "Sin capturar";
    };
    resumir();
    u.$$("#pl-unidad, #pl-comercial", raiz).forEach((d) => { d.addEventListener("input", resumir); d.addEventListener("change", resumir); });
    const actualizarCliente = () => {
      const id = u.$("#e-cliente").value;
      u.$("#dl-contactos").innerHTML = db.por("contactos", "id_cliente", id).map((x) => `<option value="${u.esc(x.nombre)}">`).join("");
      const bases = [...new Set([...db.por("cotizaciones", "id_cliente", id).map((x) => x.base), (db.cliente(id) || {}).ciudad_base].filter(Boolean))];
      u.$("#dl-bases").innerHTML = bases.map((b) => `<option value="${u.esc(b)}">`).join("");
      const uni = db.por("unidades", "id_cliente", id);
      u.$("#e-unidad").innerHTML = `<option value="">${uni.length ? "Capturar unidad nueva o sin unidad" : "Este cliente no tiene unidades registradas"}</option>` +
        uni.map((x) => `<option value="${x.id_unidad}" ${x.no_economico && x.no_economico === c.no_economico || x.no_serie && x.no_serie === c.no_serie ? "selected" : ""}>${u.esc([x.tipo, x.marca, x.no_economico && "Eco " + x.no_economico, x.placas, x.no_serie].filter(Boolean).join(" · "))}</option>`).join("");
    };
    actualizarCliente();
    u.$("#e-cliente").addEventListener("change", () => {
      const cli = db.cliente(u.$("#e-cliente").value);
      if (cli && !u.$("[name=base]").value) u.$("[name=base]").value = cli.ciudad_base || "";
      if (cli && cli.no_proveedor && !u.$("[name=no_proveedor_cliente]").value) u.$("[name=no_proveedor_cliente]").value = cli.no_proveedor;
      if (cli && cli.condiciones_pago) u.$("[name=condiciones_pago]").value = cli.condiciones_pago;
      if (cli) limpiarError(u.$("#e-cliente").closest(".campo"));
      actualizarCliente(); pintarPartidas(ed); resumir();
    });
    u.$("#e-unidad").addEventListener("change", (e) => {
      const x = db.uno("unidades", "id_unidad", e.target.value); if (!x) return;
      u.$("[name=unidad_tipo]").value = x.tipo || "REFACCION"; u.$("[name=unidad_marca]").value = x.marca || ""; u.$("[name=no_economico]").value = x.no_economico || "";
      u.$("[name=placas]").value = x.placas || ""; u.$("[name=no_serie]").value = x.no_serie || "";
      resumir();
    });
    u.$("#btn-nuevo-cli").addEventListener("click", () => CRM.formCliente(null, (nuevo) => {
      u.$("#e-cliente").innerHTML = u.opciones(u.ordenar(db.t.clientes, (x) => x.nombre_cliente).map((x) => ({ v: x.id_cliente, t: x.nombre_cliente })), nuevo.id_cliente, "Selecciona un cliente…");
      u.$("#e-cliente").dispatchEvent(new Event("change"));
    }));
    const etapa = u.$("#e-etapa");
    const verEtapa = () => { u.$("#e-motivo-c").classList.toggle("oculto", etapa.value !== "perdida"); u.$("#e-prox-c").classList.toggle("oculto", !db.etapa(etapa.value).abierta); };
    etapa.addEventListener("change", verEtapa); verEtapa();
    u.ligarMotivos(raiz);
    u.$("[name=motivo_perdida]", raiz).addEventListener("change", () => limpiarError(u.$("#e-motivo-c")));

    pintarPartidas(ed);
    u.$("#btn-linea").addEventListener("click", () => { leerPartidas(ed); ed.lineas.push(lineaVacia()); pintarPartidas(ed); const ins = u.$$("#partidas .inp-desc"); ins[ins.length - 1].focus(); });
    u.$("#btn-preguntar").addEventListener("click", () => u.modal({ titulo: "Identificar pieza con el Cerebro", ancho: 520,
      cuerpo: `<div class="campos"><div class="campo c-12"><label>¿Qué pidió el cliente?</label><input name="q" data-dictado placeholder="Ej. buje trifuncional Hendrickson 7/8"></div></div><p class="tenue mt-8" style="font-size:12px">Guarda la cotización antes si no quieres perder lo capturado.</p>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Consultar", clase: "btn-pri", icono: "cerebro", fn: (m) => { const q = u.$("[name=q]", m).value.trim(); if (!q) return false; sessionStorage.setItem("cardiel_ctx_cerebro", JSON.stringify({ id_cliente: u.$("#e-cliente").value })); CRM.preguntar(q); } }] }));
    u.$("#btn-guardar").addEventListener("click", () => guardar(ed, raiz));
    u.$("#btn-pdf").addEventListener("click", () => {
      const c2 = guardar(ed, raiz, true); if (!c2) return;
      CRM.pdf.cotizacion(c2, "descargar", `${c2.id_cotizacion} guardada y PDF descargado. Seguimiento: ${c2.proximo_seguimiento ? u.fFecha(c2.proximo_seguimiento) : "sin fecha"}.`);
    });
    u.$("#btn-ver-pdf").addEventListener("click", () => {
      const c2 = guardar(ed, raiz, true); if (!c2) return;
      CRM.pdf.cotizacion(c2, "ver");
      u.aviso(`${c2.id_cotizacion} guardada. El PDF se abrió en otra pestaña.`, "info");
    });
    u.$("#btn-guardar-m").addEventListener("click", () => u.$("#btn-guardar").click());
    u.$("#btn-pdf-m").addEventListener("click", () => u.$("#btn-pdf").click());
    if (!ed.nueva) {
      const wa = () => { const c2 = guardar(ed, raiz, true); if (c2) enviarWhatsApp(c2, () => pintarBitacora(c2.id_cotizacion)); };
      u.$("#btn-wa").addEventListener("click", wa);
      u.$("#btn-wa-m").addEventListener("click", wa);
      pintarBitacora(c.id_cotizacion);
      const agregarNota = () => {
        const v = u.$("#nota-nueva").value.trim(); if (!v) return;
        db.registrarActividad({ tipo: "nota", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente, texto: v });
        u.$("#nota-nueva").value = ""; pintarBitacora(c.id_cotizacion); u.aviso("Nota agregada");
      };
      u.$("#btn-nota").addEventListener("click", agregarNota);
      u.$("#nota-nueva").addEventListener("keydown", (e) => { if (e.key === "Enter") agregarNota(); });
      u.$("#btn-duplicar").addEventListener("click", () => {
        const d = JSON.parse(JSON.stringify({ cot: ed.cot, lineas: ed.lineas }));
        const usuario = CRM.usuario();
        const nuevo = { cot: { ...d.cot, id_cotizacion: null, fecha: u.hoyISO(), etapa: "cotizada", motivo_perdida: null, origen: "Duplicada de " + d.cot.id_cotizacion, elaboro: usuario.nombre, vendedor: usuario.nombre, proximo_seguimiento: u.iso(new Date(Date.now() + 3 * 864e5)) },
          lineas: d.lineas.map((l) => ({ ...l, id_detalle: null })), nueva: true };
        history.replaceState(null, "", "#/cotizaciones/nueva");
        pintarEditor(cont, nuevo); u.aviso("Copia lista. Revisa y guarda para asignar folio.", "info");
      });
      u.$("#btn-borrar").addEventListener("click", async () => {
        if (!(await u.confirmar("Eliminar cotización", `Se eliminará ${c.id_cotizacion} con sus partidas. Esta acción no se puede deshacer.`, "Eliminar", true))) return;
        db.t.cotizaciones = db.t.cotizaciones.filter((x) => x.id_cotizacion !== c.id_cotizacion);
        db.t.detalle_cotizacion = db.t.detalle_cotizacion.filter((x) => x.id_cotizacion !== c.id_cotizacion);
        db.guardar("cotizaciones", "detalle_cotizacion"); u.aviso("Cotización eliminada"); CRM.ir("cotizaciones");
      });
      const bc = u.$("#btn-compra"); if (bc) bc.addEventListener("click", () => CRM.formCompra({ id_cotizacion: c.id_cotizacion }));
    }
  }

  function pintarBitacora(id) {
    const ul = u.$("#bitacora"); if (!ul) return;
    const acts = u.ordenar(db.por("actividades", "id_cotizacion", id), (a) => a.fecha + a.id_actividad, true);
    ul.innerHTML = acts.map((a) => `<li><b>${u.esc(a.texto)}</b><small>${u.esc(a.usuario || "")} · ${u.fFecha(a.fecha)}</small></li>`).join("") || `<li class="tenue">Sin actividad.</li>`;
  }

  function pintarPartidas(ed) {
    const idCli = u.$("#e-cliente") ? u.$("#e-cliente").value : ed.cot.id_cliente;
    const tb = u.$("#partidas");
    tb.innerHTML = ed.lineas.map((l, i) => {
      const p = l.id_producto ? db.producto(l.id_producto) : null;
      let pista = "";
      if (p) {
        const a = db.antecedentes(p.id_producto, idCli);
        const partes = [];
        if (a.ultimaCliente) partes.push(`Último a este cliente <b>${u.mxn(a.ultimaCliente.precio_unitario)}</b> (${u.fFecha(a.ultimaCliente.cot.fecha)})`);
        else if (a.ultima) partes.push(`Último cotizado <b>${u.mxn(a.ultima.precio_unitario)}</b>`);
        if (p.precio_lista) partes.push(`Lista ${u.mxn(p.precio_lista)}`);
        if (a.ultimaCompra) partes.push(`Costo ${u.mxn(a.ultimaCompra.costo_unitario)} · ${u.esc(db.nombreProveedor(a.ultimaCompra.oc.id_proveedor))}`);
        pista = `<div class="pista-precio">${I("etiqueta", 12)}<a href="#/catalogo/${p.id_producto}">${u.esc(p.no_parte_cardiel)}</a>${partes.length ? " · " + partes.join(" · ") : ""}</div>`;
      } else if (l.descripcion_documento) pista = `<div class="pista-precio">${I("alerta", 12)}Partida libre, sin ligar al catálogo</div>`;
      const total = (Number(l.cantidad) || 0) * ((Number(l.materiales) || 0) + (Number(l.mano_obra) || 0));
      return `<tr data-i="${i}">
        <td class="it">${i + 1}</td>
        <td class="td-desc"><div class="selector-prod"><input class="inp-desc" value="${u.esc(l.descripcion_documento || "")}" placeholder="Busca en el catálogo o escribe la descripción" autocomplete="off" aria-label="Partida ${i + 1}: descripción"><div class="lista-sug oculto"></div></div>${pista}</td>
        <td data-l="No. parte"><input class="inp-np" value="${u.esc(l.numero_parte_documento || "")}" placeholder="Opcional" aria-label="Partida ${i + 1}: número de parte"></td>
        <td data-l="Cant."><input class="inp-cant num" type="number" inputmode="numeric" min="0" step="1" value="${l.cantidad ?? 1}" aria-label="Partida ${i + 1}: cantidad"></td>
        <td data-l="Materiales"><input class="inp-mat num" type="number" inputmode="decimal" min="0" step="0.01" value="${l.materiales ?? ""}" placeholder="0.00" aria-label="Partida ${i + 1}: materiales"></td>
        <td data-l="M.O."><input class="inp-mo num" type="number" inputmode="decimal" min="0" step="0.01" value="${Number(l.mano_obra) ? l.mano_obra : ""}" placeholder="0.00" aria-label="Partida ${i + 1}: mano de obra"></td>
        <td class="tot">${u.mxn(total)}</td>
        <td class="td-acc"><button class="btn-icono" data-costo="${i}" title="Proveedor y costo (interno)" aria-label="Proveedor y costo">${I("proveedor", 16)}</button><button class="btn-icono" data-quitar="${i}" title="Quitar partida" aria-label="Quitar partida">${I("borrar", 16)}</button></td>
      </tr>`;
    }).join("");
    u.$$("tr", tb).forEach((tr) => {
      const i = +tr.dataset.i;
      ["inp-cant", "inp-mat", "inp-mo"].forEach((k) => u.$("." + k, tr).addEventListener("input", () => { leerPartidas(ed); tr.querySelector(".tot").textContent = u.mxn((Number(ed.lineas[i].cantidad) || 0) * ((Number(ed.lineas[i].materiales) || 0) + (Number(ed.lineas[i].mano_obra) || 0))); totales(ed); }));
      const inp = u.$(".inp-desc", tr), sug = u.$(".lista-sug", tr);
      let sel = -1;
      const buscar = () => {
        const n = u.norm(inp.value), cmp = u.compacto(inp.value);
        if (n.length < 2) { sug.classList.add("oculto"); return; }
        const res = db.t.productos.filter((p) => p.activo !== false && (u.norm(p.descripcion_original).includes(n) || (cmp.length >= 3 && (u.compacto(p.no_parte_cardiel).includes(cmp) || u.compacto(p.numero_parte_fabricante).includes(cmp))))).slice(0, 8);
        sel = -1;
        sug.innerHTML = res.length ? res.map((p, k) => `<button type="button" data-p="${p.id_producto}" data-k="${k}"><span class="cod">${u.esc(p.no_parte_cardiel)}</span><span class="d">${u.esc(p.descripcion_original)}<br><small class="tenue">${u.esc(p.segmento_origen)}${p.numero_parte_fabricante ? " · " + u.esc(p.numero_parte_fabricante) : ""}</small></span><span class="p">${p.precio_lista ? u.mxn(p.precio_lista) : ""}</span></button>`).join("")
          : `<div class="tenue" style="padding:10px;font-size:12.5px">Sin coincidencias en el catálogo. Se guardará como partida libre.</div>`;
        sug.classList.remove("oculto");
        u.$$("[data-p]", sug).forEach((b) => b.addEventListener("mousedown", (e) => { e.preventDefault(); elegir(b.dataset.p); }));
      };
      const elegir = (idp) => {
        leerPartidas(ed);
        const cant = ed.lineas[i].cantidad || 1;
        ed.lineas[i] = { ...ed.lineas[i], ...lineaDeProducto(db.producto(idp), u.$("#e-cliente").value), cantidad: cant };
        pintarPartidas(ed); totales(ed);
      };
      inp.addEventListener("input", u.debounce(() => { leerPartidas(ed); if (ed.lineas[i].id_producto && u.norm(inp.value) !== u.norm((db.producto(ed.lineas[i].id_producto) || {}).descripcion_original)) { /* texto editado: conserva el vínculo */ } buscar(); }, 120));
      inp.addEventListener("focus", () => { if (!ed.lineas[i].id_producto) buscar(); });
      inp.addEventListener("blur", () => setTimeout(() => sug.classList.add("oculto"), 150));
      inp.addEventListener("keydown", (e) => {
        const bs = u.$$("[data-p]", sug); if (sug.classList.contains("oculto") || !bs.length) return;
        if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(bs.length - 1, sel + 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); }
        else if (e.key === "Enter" && sel >= 0) { e.preventDefault(); elegir(bs[sel].dataset.p); return; }
        else if (e.key === "Escape") { sug.classList.add("oculto"); return; } else return;
        bs.forEach((b, k) => b.classList.toggle("sel", k === sel));
      });
    });
    u.$$("[data-quitar]", tb).forEach((b) => b.addEventListener("click", () => { leerPartidas(ed); ed.lineas.splice(+b.dataset.quitar, 1); if (!ed.lineas.length) ed.lineas.push(lineaVacia()); pintarPartidas(ed); totales(ed); }));
    u.$$("[data-costo]", tb).forEach((b) => b.addEventListener("click", () => { leerPartidas(ed); costoLinea(ed, +b.dataset.costo); }));
    totales(ed);
  }

  function costoLinea(ed, i) {
    const l = ed.lineas[i];
    u.modal({ titulo: `Proveedor y costo · partida ${i + 1}`, ancho: 480,
      cuerpo: `<p class="texto-modal">Dato interno: no sale en el PDF. Le sirve al Cerebro para responder “quién lo surte y a cuánto”.</p>
        <div class="campos mt-16"><div class="campo c-12"><label>Proveedor</label><select name="prov" data-crear="proveedor">${u.opciones(u.ordenar(db.t.proveedores, (p) => p.nombre_proveedor).map((p) => ({ v: p.id_proveedor, t: p.nombre_proveedor })), l.id_proveedor_cotizado, "Sin proveedor")}</select></div>
        <div class="campo"><label>Costo unitario</label><input type="number" step="0.01" name="costo" value="${l.costo_proveedor_unitario ?? ""}"></div>
        <div class="campo"><label>Margen estimado</label><input readonly id="margen" value=""></div></div>`,
      alAbrir: (m) => { const calc = () => { const c = Number(u.$("[name=costo]", m).value), p = (Number(l.materiales) || 0) + (Number(l.mano_obra) || 0); u.$("#margen", m).value = c && p ? u.pct((p - c) / p, 1) : "—"; }; u.$("[name=costo]", m).addEventListener("input", calc); calc(); },
      acciones: [{ texto: "Cancelar" }, { texto: "Aplicar", clase: "btn-pri", fn: (m) => { l.id_proveedor_cotizado = u.$("[name=prov]", m).value || null; l.costo_proveedor_unitario = Number(u.$("[name=costo]", m).value) || null; u.aviso("Costo aplicado; se guarda con la cotización", "info"); } }] });
  }

  function leerPartidas(ed) {
    u.$$("#partidas tr").forEach((tr) => {
      const l = ed.lineas[+tr.dataset.i]; if (!l) return;
      l.descripcion_documento = u.$(".inp-desc", tr).value.trim();
      l.numero_parte_documento = u.$(".inp-np", tr).value.trim() || null;
      l.cantidad = Number(u.$(".inp-cant", tr).value) || 0;
      l.materiales = u.$(".inp-mat", tr).value === "" ? null : Number(u.$(".inp-mat", tr).value);
      l.mano_obra = Number(u.$(".inp-mo", tr).value) || 0;
    });
  }

  function totales(ed) {
    const iva = db.config().iva ?? 0.16;
    const sub = u.suma(ed.lineas, (l) => (Number(l.cantidad) || 0) * ((Number(l.materiales) || 0) + (Number(l.mano_obra) || 0)));
    const costo = u.suma(ed.lineas.filter((l) => l.costo_proveedor_unitario), (l) => l.cantidad * l.costo_proveedor_unitario);
    const conCosto = u.suma(ed.lineas.filter((l) => l.costo_proveedor_unitario), (l) => (Number(l.cantidad) || 0) * ((Number(l.materiales) || 0) + (Number(l.mano_obra) || 0)));
    u.$("#totales").innerHTML = `<div class="fila"><span>Subtotal</span><b>${u.mxn(sub)}</b></div><div class="fila"><span>IVA ${Math.round(iva * 100)} %</span><b>${u.mxn(sub * iva)}</b></div>
      <div class="fila total"><span>Total</span><span>${u.mxn(sub * (1 + iva))}</span></div>
      ${costo ? `<div class="fila tenue" style="font-size:12px;margin-top:6px"><span>Margen estimado (partidas con costo)</span><span>${u.pct((conCosto - costo) / (conCosto || 1), 1)}</span></div>` : ""}
      <div class="fila tenue" style="font-size:12px"><span>${ed.lineas.filter((l) => l.descripcion_documento).length} partidas</span><span>${u.num(u.suma(ed.lineas, (l) => l.cantidad))} piezas</span></div>`;
    const tb = u.$("#total-barra"); if (tb) tb.textContent = u.mxn(sub * (1 + iva));
  }

  function marcarError(campo, texto) {
    if (!campo) return;
    campo.classList.add("error");
    let m = u.$(".error-campo", campo);
    if (!m) { m = document.createElement("span"); m.className = "error-campo"; m.setAttribute("role", "alert"); campo.appendChild(m); }
    m.innerHTML = I("alerta", 14) + u.esc(texto);
    const ctl = u.$("select, input", campo);
    if (ctl) { ctl.setAttribute("aria-invalid", "true"); ctl.scrollIntoView({ behavior: "smooth", block: "center" }); ctl.focus({ preventScroll: true }); }
  }
  function limpiarError(campo) {
    if (!campo) return;
    campo.classList.remove("error");
    const m = u.$(".error-campo", campo); if (m) m.remove();
    u.$$("[aria-invalid]", campo).forEach((x) => x.removeAttribute("aria-invalid"));
  }
  function errorPartidas(texto, filas) {
    u.$$("#partidas tr").forEach((tr) => tr.classList.toggle("error-fila", filas.includes(+tr.dataset.i)));
    const p = u.$("#error-partidas");
    p.innerHTML = I("alerta", 14) + u.esc(texto); p.classList.remove("oculto");
    const tr = u.$("#partidas tr.error-fila") || u.$("#partidas tr");
    if (tr) { tr.scrollIntoView({ behavior: "smooth", block: "center" }); u.$(".inp-desc", tr).focus({ preventScroll: true }); }
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && u.$("#btn-guardar") && !u.$(".modal-fondo")) { e.preventDefault(); u.$("#btn-guardar").click(); }
  });

  /* Resumen de la cotización listo para mandar por WhatsApp al cliente. */
  function mensajeCotizacion(c) {
    const lineas = db.lineasCot(c.id_cotizacion);
    const nombre = c.atencion && !/^(publico|mostrador)/i.test(c.atencion)
      ? (c.atencion.trim().split(/\s+/).find((w) => !/^(ing|lic|sr|sra|srita|c|arq|dr|dra|mtro|mtra|cp|don|doña)\.?$/i.test(w)) || "") : "";
    const pz = (n) => `${n} ${n === 1 ? "pz" : "pzs"}`;
    const cap = (s) => s.toLowerCase().replace(/^./, (x) => x.toUpperCase());
    const partidas = lineas.map((l) => {
      const np = l.numero_parte_documento || l.numero_parte_catalogo;
      const desc = cap(l.descripcion_documento || "") + (np && !u.compacto(l.descripcion_documento).includes(u.compacto(np)) ? ` ${np}` : "");
      return `• ${pz(l.cantidad)} ${desc} — ${l.precio_unitario > 0 ? `${u.mxn(l.precio_unitario)}${l.cantidad > 1 ? " c/u" : ""}` : "precio por confirmar"}`;
    });
    const extras = [c.vigencia && `Vigencia: ${c.vigencia.replace(/ a partir.*$/i, "").toLowerCase()}`, c.tiempo_entrega && `Entrega: ${c.tiempo_entrega.replace(/[,*].*$/, "").trim().toLowerCase()}`].filter(Boolean);
    return [`Hola${nombre ? " " + nombre : ""}, buen día. Te comparto la cotización ${c.id_cotizacion} de CARDIEL:`, "", ...partidas, "",
      `Total con IVA: ${u.mxn(c.total_con_iva ?? db.totalCot(c))}`, ...extras, "", `¿Te la confirmo? Quedo a tus órdenes. Saludos, ${CRM.usuario().nombre.split(" ")[0]}.`].join("\n");
  }

  function enviarWhatsApp(c, alRegistrar) {
    const contactos = db.por("contactos", "id_cliente", c.id_cliente);
    const contacto = contactos.find((x) => x.telefono && c.atencion && u.norm(x.nombre) === u.norm(c.atencion)) || contactos.find((x) => x.telefono);
    const cli = db.cliente(c.id_cliente) || {};
    const tel = ((contacto && contacto.telefono) || cli.telefono || "").replace(/\D/g, "");
    const registrar = (como) => { db.registrarActividad({ tipo: "nota", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente, texto: como }); if (alRegistrar) alRegistrar(); };
    const md = u.modal({ titulo: `Mandar ${c.id_cotizacion} por WhatsApp`, ancho: 540,
      cuerpo: `<textarea id="wa-texto" class="entrada wa-texto" rows="11" aria-label="Mensaje para el cliente">${u.esc(mensajeCotizacion(c))}</textarea>
        <p class="tenue wa-ayuda">${tel ? `Se abrirá el chat con ${u.esc((contacto && contacto.nombre) || cli.nombre_cliente || "el cliente")} · ${u.esc((contacto && contacto.telefono) || cli.telefono)}.` : "No hay teléfono registrado: WhatsApp te dejará elegir el chat."} Puedes editar el texto antes de mandarlo y adjuntar el PDF en el mismo chat.</p>`,
      acciones: [
        { texto: "Copiar", icono: "copiar", fn: (m) => { u.copiar(u.$("#wa-texto", m).value, "Mensaje copiado. Pégalo en WhatsApp."); registrar("Se copió el resumen para WhatsApp"); } },
        { texto: "Abrir WhatsApp", clase: "btn-pri", icono: "mensaje", fn: (m) => {
          const num = tel ? (tel.length === 10 ? "52" + tel : tel) : "";
          window.open(`https://wa.me/${num}?text=${encodeURIComponent(u.$("#wa-texto", m).value)}`, "_blank", "noopener");
          registrar("Se mandó el resumen por WhatsApp");
        } },
      ] });
    return md;
  }

  /* Guarda cabecera, partidas, contacto y unidad nuevos. Devuelve la cotización guardada. */
  function guardar(ed, raiz, silencioso) {
    leerPartidas(ed);
    const f = {};
    u.$$(".editor [name]", raiz).forEach((el) => { f[el.name] = el.value.trim() === "" ? null : el.value.trim(); });
    u.$$(".campo.error", raiz).forEach(limpiarError);
    u.$("#error-partidas").classList.add("oculto");
    u.$$("#partidas tr.error-fila").forEach((tr) => tr.classList.remove("error-fila"));
    if (!f.id_cliente) { marcarError(u.$("#e-cliente").closest(".campo"), "Elige el cliente para poder guardar."); return null; }
    const lineas = ed.lineas.filter((l) => l.descripcion_documento);
    if (!lineas.length) { errorPartidas("Escribe al menos una partida: busca la pieza en el catálogo o describe lo que pidió el cliente.", [0]); return null; }
    const sinCant = ed.lineas.map((l, i) => (l.descripcion_documento && !(l.cantidad > 0) ? i : -1)).filter((i) => i >= 0);
    if (sinCant.length) { errorPartidas(`La cantidad debe ser mayor a cero (partida ${sinCant.map((i) => i + 1).join(", ")}).`, sinCant); return null; }
    if (f.etapa === "perdida" && !f.motivo_perdida) { marcarError(u.$("[name=motivo_perdida]", raiz).closest(".campo"), "Indica por qué se perdió; así sabremos qué mejorar."); return null; }
    const c = ed.cot;
    const antes = { etapa: c.etapa, nueva: ed.nueva };
    Object.assign(c, f);
    if (!db.etapa(c.etapa).abierta) c.proximo_seguimiento = null;
    if (c.etapa !== "perdida") c.motivo_perdida = null;
    const iva = db.config().iva ?? 0.16;
    if (ed.nueva) {
      c.id_cotizacion = u.siguienteId(db.t.cotizaciones, "id_cotizacion", "COT", 4);
      c.creado_en = u.hoyISO();
      db.t.cotizaciones.push(c);
    } else {
      const k = db.t.cotizaciones.findIndex((x) => x.id_cotizacion === c.id_cotizacion);
      db.t.cotizaciones[k] = c;
    }
    db.t.detalle_cotizacion = db.t.detalle_cotizacion.filter((l) => l.id_cotizacion !== c.id_cotizacion);
    lineas.forEach((l) => {
      const precio = (Number(l.materiales) || 0) + (Number(l.mano_obra) || 0);
      const fila = { ...l, id_cotizacion: c.id_cotizacion, id_detalle: u.siguienteId(db.t.detalle_cotizacion, "id_detalle", "DCOT", 4), precio_unitario: precio, moneda: "MXN",
        subtotal: Math.round(precio * l.cantidad * 100) / 100,
        margen_estimado_pct: l.costo_proveedor_unitario && precio ? Math.round(((precio - l.costo_proveedor_unitario) / precio) * 100) : l.margen_estimado_pct ?? null };
      if (fila.id_producto && !fila.numero_parte_catalogo) { const p = db.producto(fila.id_producto); fila.numero_parte_catalogo = p ? p.numero_parte_fabricante || p.no_parte_cardiel : null; }
      db.t.detalle_cotizacion.push(fila);
    });
    ed.lineas = db.lineasCot(c.id_cotizacion).map((l) => ({ ...l }));
    c.total_sin_iva = Math.round(u.suma(lineas, (l) => ((Number(l.materiales) || 0) + (Number(l.mano_obra) || 0)) * l.cantidad) * 100) / 100;
    c.iva_16 = Math.round(c.total_sin_iva * iva * 100) / 100;
    c.total_con_iva = Math.round((c.total_sin_iva + c.iva_16) * 100) / 100;
    c.incluye_numero_parte = lineas.some((l) => l.numero_parte_documento) ? "Sí" : "No";
    const tablas = ["cotizaciones", "detalle_cotizacion"];
    /* Contacto y unidad nuevos quedan en la ficha del cliente. */
    if (c.atencion && !db.por("contactos", "id_cliente", c.id_cliente).some((x) => u.norm(x.nombre) === u.norm(c.atencion))) {
      db.t.contactos.push({ id_contacto: u.siguienteId(db.t.contactos, "id_contacto", "CT", 4), id_cliente: c.id_cliente, nombre: c.atencion, puesto: "Compras / Taller", telefono: null, correo: null, base: c.base });
      tablas.push("contactos");
    }
    if ((c.no_economico || c.no_serie || c.placas) && !db.por("unidades", "id_cliente", c.id_cliente).some((x) => (c.no_economico && x.no_economico === c.no_economico) || (c.no_serie && x.no_serie === c.no_serie))) {
      db.t.unidades.push({ id_unidad: u.siguienteId(db.t.unidades, "id_unidad", "U", 4), id_cliente: c.id_cliente, tipo: c.unidad_tipo, marca: c.unidad_marca, no_economico: c.no_economico, no_serie: c.no_serie, placas: c.placas, base: c.base });
      tablas.push("unidades");
    }
    db.guardar(...tablas);
    if (antes.nueva) db.registrarActividad({ tipo: "cotizacion", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente, texto: c.etapa === "solicitud" ? "Solicitud registrada" : "Cotización creada" });
    else if (antes.etapa !== c.etapa) db.registrarActividad({ tipo: c.etapa === "ganada" ? "ganada" : c.etapa === "perdida" ? "perdida" : "nota", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente, texto: `Cambió a ${db.etapa(c.etapa).t}${c.motivo_perdida ? ` (${c.motivo_perdida})` : ""}` });
    CRM.refrescarMenu();
    if (!silencioso) u.aviso(antes.nueva ? `Cotización ${c.id_cotizacion} creada` : "Cambios guardados");
    ed.nueva = false;
    if (antes.nueva || antes.etapa !== c.etapa) {
      history.replaceState(null, "", "#/cotizaciones/" + c.id_cotizacion);
      pintarEditor(u.$("#contenido"), ed);
    }
    return c;
  }
})(window.CRM);
