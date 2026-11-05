/* Clientes: lista y ficha 360° (cotizaciones, unidades, contactos, lo que piden). */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};
  const filtros = { q: "", tipo: "", orden: "ganado" };

  CRM.vistas.clientes = {
    render(cont, params) {
      if (params[0]) return ficha(cont, params[0], params[1] || "cotizaciones");
      lista(cont);
    },
  };

  function lista(cont) {
    cont.innerHTML = `
      <div class="encabezado"><div class="titulos"><h1>Clientes</h1><p>Flotas, transportistas y mostrador. Cada ficha junta sus cotizaciones, unidades y contactos.</p></div>
        <div class="acciones"><button class="btn btn-sec" id="btn-excel" title="Descarga en Excel lo que estás viendo">${I("descargar", 16)}Excel</button><button class="btn btn-pri" id="btn-nuevo">${I("mas", 16)}Nuevo cliente</button></div></div>
      <div class="tarjeta">
        <div class="filtros">
          <div class="busqueda">${I("buscar", 16)}<input class="entrada" id="f-q" placeholder="Nombre, ciudad, RFC…" value="${u.esc(filtros.q)}"></div>
          <select class="entrada" id="f-tipo">${u.opciones([...new Set(db.t.clientes.map((c) => c.tipo_cliente).filter(Boolean))].sort(), filtros.tipo, "Todos los tipos")}</select>
          <select class="entrada" id="f-orden">${u.opciones([{ v: "ganado", t: "Ordenar por monto ganado" }, { v: "cotizaciones", t: "Por número de cotizaciones" }, { v: "reciente", t: "Por actividad reciente" }, { v: "nombre", t: "Por nombre" }], filtros.orden)}</select>
        </div>
        <div id="zona"></div>
      </div>`;
    let actuales = [];
    const pintar = () => {
      const n = u.norm(filtros.q);
      let cl = db.t.clientes.filter((c) => (!filtros.tipo || c.tipo_cliente === filtros.tipo) && (!n || u.norm([c.nombre_cliente, c.ciudad_base, c.estado, c.rfc, c.tipo_cliente].join(" ")).includes(n)))
        .map((c) => ({ c, s: db.statsCliente(c.id_cliente) }));
      const ord = { ganado: (x) => x.s.ganado, cotizaciones: (x) => x.s.cotizaciones, reciente: (x) => x.s.ultima, nombre: (x) => x.c.nombre_cliente };
      cl = u.ordenar(cl, ord[filtros.orden], filtros.orden !== "nombre");
      actuales = cl;
      u.$("#zona").innerHTML = cl.length ? `<div class="tabla-cont"><table class="tabla tabla-clientes"><thead><tr><th>Cliente</th><th>Tipo</th><th>Ciudad</th><th class="num">Flota</th><th class="num">Cotizaciones</th><th class="num">Abiertas</th><th class="num">Ganado</th><th>Cierre</th><th>Última cotización</th></tr></thead><tbody>
        ${cl.map(({ c, s }) => `<tr class="clic" data-id="${c.id_cliente}">
          <td><div style="display:flex;gap:10px;align-items:center"><span class="avatar s">${u.iniciales(c.nombre_cliente)}</span><span class="principal-celda">${u.esc(c.nombre_cliente)}</span></div></td>
          <td>${c.tipo_cliente ? `<span class="insignia">${u.esc(c.tipo_cliente)}</span>` : `<span class="tenue">—</span>`}</td>
          <td>${u.esc(c.ciudad_base || "—")}<div class="sec">${u.esc(c.estado || "")}</div></td>
          <td class="num">${c.tamano_flota_unidades ? u.num(c.tamano_flota_unidades) : "—"}</td>
          <td class="num">${s.cotizaciones}</td>
          <td class="num">${s.abiertas ? `<b style="color:var(--azul-600)">${s.abiertas}</b>` : "0"}</td>
          <td class="num"><b>${u.mxn(s.ganado)}</b></td>
          <td><div class="mini-prog"><div class="progreso"><i style="width:${(s.cierre || 0) * 100}%;background:var(--verde)"></i></div><span>${s.cierre === null ? "—" : u.pct(s.cierre)}</span></div></td>
          <td class="nowrap">${s.ultima ? u.relativo(s.ultima) : "—"}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="vacio">${I("clientes", 28)}No hay clientes con esos filtros.</div>`;
      u.$$("tr[data-id]").forEach((tr) => tr.addEventListener("click", () => CRM.ir("clientes/" + tr.dataset.id)));
    };
    u.$("#f-q").addEventListener("input", u.debounce((e) => { filtros.q = e.target.value; pintar(); }, 120));
    u.$("#f-tipo").addEventListener("change", (e) => { filtros.tipo = e.target.value; pintar(); });
    u.$("#f-orden").addEventListener("change", (e) => { filtros.orden = e.target.value; pintar(); });
    u.$("#btn-nuevo").addEventListener("click", () => CRM.formCliente(null, (c) => CRM.ir("clientes/" + c.id_cliente)));
    u.$("#btn-excel").addEventListener("click", () => CRM.excel({
      archivo: `CARDIEL_clientes_${u.hoyISO()}.xlsx`, hoja: "Clientes", titulo: "Clientes CARDIEL",
      subtitulo: [`${actuales.length} clientes`, filtros.tipo, filtros.q && `búsqueda «${filtros.q}»`, `generado ${u.fFecha(u.hoyISO())}`].filter(Boolean).join(" · "),
      columnas: [{ t: "Cliente", w: 34 }, { t: "Tipo", w: 24 }, { t: "Ciudad", w: 16 }, { t: "Estado", w: 14 }, { t: "RFC", w: 15 }, { t: "Condiciones de pago", w: 20 }, { t: "Flota", w: 8, tipo: "num", total: true },
        { t: "Cotizaciones", w: 12, tipo: "num", total: true }, { t: "Abiertas", w: 10, tipo: "num", total: true }, { t: "Ganado", w: 15, tipo: "mxn", total: true }, { t: "% cierre", w: 10 }, { t: "Última cotización", w: 15, tipo: "fecha" }],
      filas: actuales.map(({ c, s }) => [c.nombre_cliente, c.tipo_cliente, c.ciudad_base, c.estado, c.rfc, c.condiciones_pago, c.tamano_flota_unidades || null,
        s.cotizaciones, s.abiertas, s.ganado, s.cierre === null ? "" : u.pct(s.cierre), s.ultima]),
    }));
    pintar();
  }

  function ficha(cont, id, pestana) {
    const c = db.cliente(id);
    if (!c) { cont.innerHTML = `<div class="tarjeta vacio">${I("alerta", 28)}No existe el cliente. <a href="#/clientes">Volver</a></div>`; return; }
    const s = db.statsCliente(id);
    const cots = u.ordenar(db.por("cotizaciones", "id_cliente", id), (x) => x.fecha + x.id_cotizacion, true);
    const unidades = db.por("unidades", "id_cliente", id);
    const contactos = db.por("contactos", "id_cliente", id);
    /* Qué le compra: productos más cotizados */
    const lineas = cots.flatMap((x) => db.lineasCot(x.id_cotizacion).map((l) => ({ ...l, cot: x })));
    const porProd = [...u.agrupar(lineas, (l) => l.id_producto || "libre:" + l.descripcion_documento)].map(([k, ls]) => ({
      k, p: ls[0].id_producto ? db.producto(ls[0].id_producto) : null, desc: ls[0].descripcion_documento, veces: ls.length,
      piezas: u.suma(ls, (l) => l.cantidad), ganadas: ls.filter((l) => l.cot.etapa === "ganada").length, ultimo: u.ordenar(ls, (l) => l.cot.fecha, true)[0],
    })).sort((a, b) => b.veces - a.veces);
    const acts = u.ordenar(db.por("actividades", "id_cliente", id), (a) => a.fecha + a.id_actividad, true);
    const tabs = [["cotizaciones", "Cotizaciones", cots.length], ["piezas", "Lo que pide", porProd.length], ["unidades", "Unidades", unidades.length], ["contactos", "Contactos", contactos.length], ["bitacora", "Bitácora", acts.length]];

    cont.innerHTML = `
      <div class="migas"><a href="#/clientes">Clientes</a>${I("chev-der", 13)}<span>${u.esc(c.nombre_cliente)}</span></div>
      <div class="tarjeta">
        <div class="ficha-cab"><div class="grande">${u.iniciales(c.nombre_cliente)}</div>
          <div class="tit"><h1>${u.esc(c.nombre_cliente)}</h1>
            <div class="meta">${c.tipo_cliente ? `<span>${I("camion", 15)}${u.esc(c.tipo_cliente)}</span>` : ""}${c.ciudad_base ? `<span>${I("ubicacion", 15)}${u.esc(c.ciudad_base)}${c.estado ? ", " + u.esc(c.estado) : ""}</span>` : ""}
            ${c.tamano_flota_unidades ? `<span>${I("remolque", 15)}${u.num(c.tamano_flota_unidades)} unidades</span>` : ""}${c.rfc ? `<span>${I("numeral", 15)}${u.esc(c.rfc)}</span>` : ""}
            ${c.condiciones_pago ? `<span>${I("dinero", 15)}${u.esc(c.condiciones_pago)}</span>` : ""}${c.fuente_web ? `<span>${I("externo", 15)}<a href="${u.esc(c.fuente_web)}" target="_blank" rel="noopener">Sitio</a></span>` : ""}</div></div>
          <div class="acciones"><button class="btn btn-sec" id="btn-editar">${I("editar", 16)}Editar</button><button class="btn btn-pri" id="btn-cot">${I("mas", 16)}Nueva cotización</button></div></div>
        <div class="datos-ficha">
          <div><small>Cotizado</small><b>${u.mxn(s.cotizado)}</b></div>
          <div><small>Ganado</small><b>${u.mxn(s.ganado)}</b></div>
          <div><small>Tasa de cierre</small><b>${s.cierre === null ? "—" : u.pct(s.cierre)}</b></div>
          <div><small>Última cotización</small><b>${s.ultima ? u.fFecha(s.ultima) : "—"}</b></div>
        </div>
      </div>
      ${c.nota ? `<div class="advertencia azul mt-16">${I("info", 16)}<span>${u.esc(c.nota)}</span></div>` : ""}
      <div class="tarjeta mt-16">
        <div class="pestanas">${tabs.map((t) => `<button data-tab="${t[0]}" class="${pestana === t[0] ? "activo" : ""}">${t[1]}<span class="n">${t[2]}</span></button>`).join("")}</div>
        <div id="tab"></div>
      </div>`;

    const tab = u.$("#tab");
    const pintarTab = (t) => {
      u.$$("[data-tab]").forEach((b) => b.classList.toggle("activo", b.dataset.tab === t));
      history.replaceState(null, "", `#/clientes/${id}/${t}`);
      if (t === "cotizaciones") tab.innerHTML = cots.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Folio</th><th>Fecha</th><th>Atención</th><th>Unidad</th><th>Partidas</th><th class="num">Total</th><th>Etapa</th></tr></thead><tbody>${cots.map((x) => {
        const l = db.lineasCot(x.id_cotizacion);
        return `<tr class="clic" data-cot="${x.id_cotizacion}"><td class="principal-celda">${x.id_cotizacion}</td><td class="nowrap">${u.fFecha(x.fecha)}</td><td>${u.esc(x.atencion || "—")}<div class="sec">${u.esc(x.base || "")}</div></td><td>${u.esc(x.unidad_tipo || "")}<div class="sec">${u.esc([x.unidad_marca, x.no_economico].filter(Boolean).join(" · "))}</div></td><td style="max-width:300px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.esc(l[0] ? l[0].descripcion_documento : "—")}</div><div class="sec">${l.length} partidas</div></td><td class="num"><b>${u.mxn(db.totalCot(x))}</b></td><td><span class="insignia etapa-${x.etapa}">${db.etapa(x.etapa).t}</span></td></tr>`; }).join("")}</tbody></table></div>`
        : `<div class="vacio">${I("cotizacion", 28)}Sin cotizaciones todavía.</div>`;
      if (t === "piezas") tab.innerHTML = porProd.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Pieza</th><th>Código</th><th class="num">Veces cotizada</th><th class="num">Piezas</th><th class="num">Ganadas</th><th class="num">Último precio</th><th>Última vez</th></tr></thead><tbody>${porProd.map((x) => `<tr ${x.p ? `class="clic" data-prod="${x.p.id_producto}"` : ""}><td><span class="principal-celda">${u.esc(x.p ? x.p.descripcion_original : x.desc)}</span>${x.p ? "" : `<div class="sec">Partida libre (sin ligar al catálogo)</div>`}</td><td>${u.esc(x.p ? x.p.no_parte_cardiel : "—")}</td><td class="num">${x.veces}</td><td class="num">${u.num(x.piezas)}</td><td class="num">${x.ganadas}</td><td class="num">${u.mxn(x.ultimo.precio_unitario)}</td><td class="nowrap">${u.fFecha(x.ultimo.cot.fecha)}</td></tr>`).join("")}</tbody></table></div>`
        : `<div class="vacio">${I("catalogo", 28)}Aún no hay partidas cotizadas.</div>`;
      if (t === "unidades") tab.innerHTML = `<div style="padding:14px 18px;display:flex;justify-content:flex-end"><button class="btn btn-sec btn-s" id="btn-unidad">${I("mas", 15)}Agregar unidad</button></div>` + (unidades.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Tipo</th><th>Marca</th><th>No. económico</th><th>Placas</th><th>No. de serie</th><th>Base</th><th class="num">Cotizaciones</th></tr></thead><tbody>${unidades.map((x) => `<tr><td>${u.esc(x.tipo || "—")}</td><td>${u.esc(x.marca || "—")}</td><td class="principal-celda">${u.esc(x.no_economico || "—")}</td><td>${u.esc(x.placas || "—")}</td><td class="mono">${u.esc(x.no_serie || "—")}</td><td>${u.esc(x.base || "—")}</td><td class="num">${cots.filter((k) => (x.no_economico && k.no_economico === x.no_economico) || (x.no_serie && k.no_serie === x.no_serie)).length}</td></tr>`).join("")}</tbody></table></div>` : `<div class="vacio">${I("remolque", 28)}Sin unidades registradas. Se agregan solas al capturarlas en una cotización.</div>`);
      if (t === "contactos") tab.innerHTML = `<div style="padding:14px 18px;display:flex;justify-content:flex-end"><button class="btn btn-sec btn-s" id="btn-contacto">${I("mas", 15)}Agregar contacto</button></div>` + (contactos.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Nombre</th><th>Puesto</th><th>Teléfono</th><th>Correo</th><th>Base</th></tr></thead><tbody>${contactos.map((x) => `<tr><td><div style="display:flex;gap:10px;align-items:center"><span class="avatar s" style="background:var(--azul-50);color:var(--azul-600)">${u.iniciales(x.nombre)}</span><span class="principal-celda">${u.esc(x.nombre)}</span></div></td><td>${u.esc(x.puesto || "—")}</td><td>${x.telefono ? `<a href="tel:${u.esc(x.telefono)}">${u.esc(x.telefono)}</a>` : "—"}</td><td>${x.correo ? `<a href="mailto:${u.esc(x.correo)}">${u.esc(x.correo)}</a>` : "—"}</td><td>${u.esc(x.base || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="vacio">${I("usuario", 28)}Sin contactos.</div>`);
      if (t === "bitacora") tab.innerHTML = acts.length ? `<ul class="actividad">${acts.slice(0, 60).map((a) => `<li><span class="marca-act ${a.tipo === "ganada" ? "verde" : a.tipo === "perdida" ? "rojo" : ""}">${I(a.tipo === "ganada" ? "check" : a.tipo === "perdida" ? "x" : a.tipo === "nota" ? "nota" : "cotizacion", 15)}</span><div><b>${u.esc(a.texto)}</b><small>${a.id_cotizacion ? `<a href="#/cotizaciones/${a.id_cotizacion}">${a.id_cotizacion}</a> · ` : ""}${u.esc(a.usuario || "")} · ${u.fFecha(a.fecha)}</small></div></li>`).join("")}</ul>` : `<div class="vacio">Sin actividad.</div>`;
      u.$$("[data-cot]", tab).forEach((tr) => tr.addEventListener("click", () => CRM.ir("cotizaciones/" + tr.dataset.cot)));
      u.$$("[data-prod]", tab).forEach((tr) => tr.addEventListener("click", () => CRM.ir("catalogo/" + tr.dataset.prod)));
      const bu = u.$("#btn-unidad"); if (bu) bu.addEventListener("click", () => formUnidad(id, () => ficha(cont, id, "unidades")));
      const bc = u.$("#btn-contacto"); if (bc) bc.addEventListener("click", () => formContacto(id, () => ficha(cont, id, "contactos")));
    };
    u.$$("[data-tab]").forEach((b) => b.addEventListener("click", () => pintarTab(b.dataset.tab)));
    u.$("#btn-editar").addEventListener("click", () => CRM.formCliente(c, () => ficha(cont, id, pestana)));
    u.$("#btn-cot").addEventListener("click", () => { sessionStorage.setItem("cardiel_precot", JSON.stringify({ id_cliente: id })); CRM.ir("cotizaciones/nueva"); });
    pintarTab(pestana);
  }

  /* Alta / edición de cliente (también se usa desde el editor de cotizaciones). */
  CRM.formCliente = (c, alGuardar) => {
    const e = c || {};
    u.modal({
      titulo: c ? "Editar cliente" : "Nuevo cliente", ancho: 640,
      cuerpo: `<div class="campos">
        <div class="campo c-8"><label>Nombre o razón social <span class="req">*</span></label><input name="nombre_cliente" value="${u.esc(e.nombre_cliente || "")}"></div>
        <div class="campo c-4"><label>RFC</label><input name="rfc" value="${u.esc(e.rfc || "")}" maxlength="13"></div>
        <div class="campo"><label>Tipo de cliente</label><input name="tipo_cliente" list="dl-tipo" data-cat="tipo_cliente" value="${u.esc(e.tipo_cliente || "")}"><datalist id="dl-tipo">${db.cat("tipo_cliente").map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
        <div class="campo"><label>Tamaño de flota (unidades)</label><input type="number" min="0" name="tamano_flota_unidades" value="${e.tamano_flota_unidades ?? ""}"></div>
        <div class="campo"><label>Ciudad base</label><input name="ciudad_base" value="${u.esc(e.ciudad_base || "")}"></div>
        <div class="campo"><label>Estado</label><input name="estado" value="${u.esc(e.estado || "")}"></div>
        <div class="campo"><label>Condiciones de pago</label><input name="condiciones_pago" list="dl-cp" data-cat="condiciones_pago" value="${u.esc(e.condiciones_pago || "")}"><datalist id="dl-cp">${db.cat("condiciones_pago").map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
        <div class="campo"><label>No. de proveedor que nos asignó</label><input name="no_proveedor" value="${u.esc(e.no_proveedor ?? "")}"></div>
        <div class="campo"><label>Teléfono</label><input name="telefono" value="${u.esc(e.telefono || "")}"></div>
        <div class="campo"><label>Sitio web</label><input name="fuente_web" value="${u.esc(e.fuente_web || "")}"></div>
        <div class="campo c-12"><label>Notas</label><textarea name="nota" rows="2">${u.esc(e.nota || "")}</textarea></div>
      </div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Guardar cliente", clase: "btn-pri", icono: "check", fn: (m) => {
        const f = u.leerForm(m);
        if (!f.nombre_cliente) { u.aviso("Escribe el nombre del cliente", "error"); return false; }
        if (!c && db.t.clientes.some((x) => u.norm(x.nombre_cliente) === u.norm(f.nombre_cliente))) { u.aviso("Ya existe un cliente con ese nombre", "error"); return false; }
        let r;
        if (c) { Object.assign(c, f); r = c; }
        else { r = { id_cliente: u.siguienteId(db.t.clientes, "id_cliente", "C", 3), activo: true, ...f }; db.t.clientes.push(r); }
        db.guardar("clientes"); u.aviso(c ? "Cliente actualizado" : "Cliente creado");
        if (alGuardar) alGuardar(r);
      } }],
    });
  };

  function formUnidad(idCliente, alGuardar) {
    u.modal({ titulo: "Agregar unidad", ancho: 560,
      cuerpo: `<div class="campos"><div class="campo"><label>Tipo</label><select name="tipo">${u.opciones(db.cat("unidad_tipo").filter((x) => x !== "REFACCION"))}</select></div><div class="campo"><label>Marca</label><input name="marca"></div>
        <div class="campo"><label>No. económico</label><input name="no_economico"></div><div class="campo"><label>Placas</label><input name="placas"></div>
        <div class="campo c-8"><label>No. de serie (VIN)</label><input name="no_serie" maxlength="25"></div><div class="campo c-4"><label>Base</label><input name="base"></div></div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Agregar", clase: "btn-pri", fn: (m) => {
        const f = u.leerForm(m); if (!f.no_economico && !f.no_serie && !f.placas) { u.aviso("Captura al menos no. económico, placas o serie", "error"); return false; }
        db.t.unidades.push({ id_unidad: u.siguienteId(db.t.unidades, "id_unidad", "U", 4), id_cliente: idCliente, ...f }); db.guardar("unidades"); u.aviso("Unidad agregada"); alGuardar();
      } }] });
  }

  function formContacto(idCliente, alGuardar) {
    u.modal({ titulo: "Agregar contacto", ancho: 520,
      cuerpo: `<div class="campos"><div class="campo c-12"><label>Nombre <span class="req">*</span></label><input name="nombre"></div><div class="campo"><label>Puesto</label><input name="puesto" value="Compras / Taller"></div><div class="campo"><label>Base</label><input name="base"></div>
        <div class="campo"><label>Teléfono</label><input name="telefono"></div><div class="campo"><label>Correo</label><input name="correo" type="email"></div></div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Agregar", clase: "btn-pri", fn: (m) => {
        const f = u.leerForm(m); if (!f.nombre) { u.aviso("Escribe el nombre", "error"); return false; }
        db.t.contactos.push({ id_contacto: u.siguienteId(db.t.contactos, "id_contacto", "CT", 4), id_cliente: idCliente, ...f }); db.guardar("contactos"); u.aviso("Contacto agregado"); alGuardar();
      } }] });
  }
})(window.CRM);
