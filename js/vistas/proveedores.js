/* Proveedores y compras: solo el registro que el Cerebro necesita (quién surte, a cuánto, cuándo). No es inventario. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};
  const est = { tab: "proveedores", q: "", pagina: 1 };

  CRM.vistas.proveedores = {
    render(cont, params) {
      if (params[0]) return fichaProveedor(cont, params[0]);
      cont.innerHTML = `
        <div class="encabezado"><div class="titulos"><h1>Proveedores y compras</h1><p>Registro de quién surte cada pieza y a qué costo. El inventario y las órdenes de compra completas son la Fase 3.</p></div>
          <div class="acciones"><button class="btn btn-sec" id="btn-prov">${I("mas", 16)}Nuevo proveedor</button><button class="btn btn-pri" id="btn-compra">${I("mas", 16)}Registrar compra</button></div></div>
        <div class="tarjeta">
          <div class="pestanas"><button data-tab="proveedores" class="${est.tab === "proveedores" ? "activo" : ""}">Proveedores<span class="n">${db.t.proveedores.length}</span></button><button data-tab="compras" class="${est.tab === "compras" ? "activo" : ""}">Compras<span class="n">${db.t.compras.length}</span></button></div>
          <div class="filtros"><div class="busqueda">${I("buscar", 16)}<input class="entrada" id="f-q" placeholder="Buscar…" value="${u.esc(est.q)}"></div><span class="tenue" id="f-conteo" style="margin-left:auto;font-size:12.5px"></span></div>
          <div id="zona"></div>
        </div>`;
      const pintar = () => (est.tab === "proveedores" ? proveedores() : compras());
      u.$$("[data-tab]").forEach((b) => b.addEventListener("click", () => { est.tab = b.dataset.tab; est.pagina = 1; this.render(cont, []); }));
      u.$("#f-q").addEventListener("input", u.debounce((e) => { est.q = e.target.value; est.pagina = 1; pintar(); }, 120));
      u.$("#btn-prov").addEventListener("click", () => formProveedor(null, () => this.render(cont, [])));
      u.$("#btn-compra").addEventListener("click", () => CRM.formCompra({}, () => { est.tab = "compras"; this.render(cont, []); }));
      pintar();
    },
  };

  function proveedores() {
    const n = u.norm(est.q);
    const ps = db.t.proveedores.filter((p) => !n || u.norm([p.nombre_proveedor, p.marcas_que_surte, p.pais, p.ciudad_estado, p.tipo_proveedor].join(" ")).includes(n))
      .map((p) => { const cs = db.por("compras", "id_proveedor", p.id_proveedor); return { p, n: cs.length, total: u.suma(cs, (c) => c.total_sin_iva), ultima: cs.reduce((m, c) => (c.fecha > m ? c.fecha : m), "") }; });
    u.$("#f-conteo").textContent = `${ps.length} proveedores`;
    u.$("#zona").innerHTML = `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Proveedor</th><th>Tipo</th><th>Marcas que surte</th><th>Condiciones</th><th>Tiempo de entrega</th><th class="num">Compras</th><th class="num">Monto</th><th>Última</th></tr></thead><tbody>
      ${u.ordenar(ps, (x) => x.total, true).map(({ p, n: nc, total, ultima }) => `<tr class="clic" data-id="${p.id_proveedor}"><td><span class="principal-celda">${u.esc(p.nombre_proveedor)}</span><div class="sec">${u.esc([p.ciudad_estado, p.pais].filter(Boolean).join(" · "))}</div></td>
        <td><span class="insignia">${u.esc(p.tipo_proveedor || "—")}</span></td><td style="max-width:220px">${u.esc(p.marcas_que_surte || "—")}</td><td>${u.esc(p.condiciones_pago || "—")}</td><td>${u.esc(p.lead_time || "—")}</td>
        <td class="num">${nc}</td><td class="num"><b>${u.mxn(total)}</b></td><td class="nowrap">${ultima ? u.fFecha(ultima) : "—"}</td></tr>`).join("")}
    </tbody></table></div>`;
    u.$$("tr[data-id]").forEach((tr) => tr.addEventListener("click", () => CRM.ir("proveedores/" + tr.dataset.id)));
  }

  function compras() {
    const n = u.norm(est.q);
    const cs = u.ordenar(db.t.compras.filter((c) => !n || u.norm([c.id_compra, db.nombreProveedor(c.id_proveedor), c.folio_factura_proveedor, c.id_cotizacion_origen, c.motivo_compra].join(" ")).includes(n)), (c) => c.fecha + c.id_compra, true);
    u.$("#f-conteo").textContent = `${cs.length} compras · ${u.mxn(u.suma(cs, (c) => c.total_sin_iva))}`;
    const pg = u.paginar(cs, est.pagina, 20);
    u.$("#zona").innerHTML = `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Compra</th><th>Fecha</th><th>Proveedor</th><th>Partidas</th><th>Motivo</th><th>Cotización</th><th>Factura</th><th class="num">Total s/IVA</th></tr></thead><tbody>
      ${pg.filas.map((c) => { const ls = db.por("detalle_compra", "id_compra", c.id_compra); return `<tr><td class="principal-celda">${c.id_compra}</td><td class="nowrap">${u.fFecha(c.fecha)}</td><td>${u.esc(db.nombreProveedor(c.id_proveedor))}</td>
        <td style="max-width:280px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ls.map((l) => { const p = db.producto(l.id_producto); return u.esc(p ? p.descripcion_original : l.descripcion_proveedor || ""); }).join(", ")}</div><div class="sec">${ls.length} partida(s)</div></td>
        <td><span class="insignia ${c.motivo_compra === "Pedido de cliente" ? "azul" : ""}">${u.esc(c.motivo_compra || "—")}</span></td>
        <td>${c.id_cotizacion_origen ? `<a href="#/cotizaciones/${c.id_cotizacion_origen}">${c.id_cotizacion_origen}</a>` : "—"}</td><td class="mono">${u.esc(c.folio_factura_proveedor || "—")}</td><td class="num"><b>${u.mxn(c.total_sin_iva)}</b></td></tr>`; }).join("")}
    </tbody></table></div>${u.htmlPaginas(pg, cs.length)}`;
    u.$$("[data-pag]").forEach((b) => b.addEventListener("click", () => { est.pagina = +b.dataset.pag; compras(); }));
  }

  function fichaProveedor(cont, id) {
    const p = db.proveedor(id);
    if (!p) { cont.innerHTML = `<div class="tarjeta vacio">No existe el proveedor. <a href="#/proveedores">Volver</a></div>`; return; }
    const cs = u.ordenar(db.por("compras", "id_proveedor", id), (c) => c.fecha, true);
    const lineas = cs.flatMap((c) => db.por("detalle_compra", "id_compra", c.id_compra).map((l) => ({ ...l, c })));
    const porProd = [...u.agrupar(lineas, (l) => l.id_producto)].map(([k, ls]) => ({ p: db.producto(k), n: ls.length, piezas: u.suma(ls, (l) => l.cantidad), ultimo: u.ordenar(ls, (l) => l.c.fecha, true)[0] })).sort((a, b) => b.n - a.n);
    cont.innerHTML = `
      <div class="migas"><a href="#/proveedores">Proveedores</a>${I("chev-der", 13)}<span>${u.esc(p.nombre_proveedor)}</span></div>
      <div class="tarjeta"><div class="ficha-cab"><div class="grande">${I("proveedor", 28)}</div><div class="tit"><h1>${u.esc(p.nombre_proveedor)}</h1>
        <div class="meta"><span>${u.esc(p.tipo_proveedor || "")}</span>${p.ciudad_estado || p.pais ? `<span>${I("ubicacion", 15)}${u.esc([p.ciudad_estado, p.pais].filter(Boolean).join(", "))}</span>` : ""}${p.fuente_web ? `<span>${I("externo", 15)}<a href="${u.esc(p.fuente_web)}" target="_blank" rel="noopener">Sitio</a></span>` : ""}</div></div>
        <div class="acciones"><button class="btn btn-sec" id="btn-editar">${I("editar", 16)}Editar</button><button class="btn btn-pri" id="btn-compra">${I("mas", 16)}Registrar compra</button></div></div>
        <div class="datos-ficha"><div><small>Condiciones</small><b style="font-size:14px">${u.esc(p.condiciones_pago || "—")}</b></div><div><small>Tiempo de entrega</small><b style="font-size:14px">${u.esc(p.lead_time || "—")}</b></div><div><small>Compras</small><b>${cs.length}</b></div><div><small>Monto comprado</small><b>${u.mxn(u.suma(cs, (c) => c.total_sin_iva))}</b></div></div></div>
      ${p.nota ? `<div class="advertencia azul mt-16">${I("info", 16)}<span>${u.esc(p.nota)}</span></div>` : ""}
      <div class="tarjeta mt-16"><div class="tarjeta-cab"><h3>Piezas que surte</h3><span class="sub">${u.esc(p.marcas_que_surte || "")}</span></div>
        ${porProd.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Pieza</th><th>Código</th><th class="num">Compras</th><th class="num">Piezas</th><th class="num">Último costo</th><th>Última compra</th></tr></thead><tbody>${porProd.map((x) => `<tr class="clic" data-p="${x.p ? x.p.id_producto : ""}"><td class="principal-celda">${u.esc(x.p ? x.p.descripcion_original : "—")}</td><td>${u.esc(x.p ? x.p.no_parte_cardiel : "")}</td><td class="num">${x.n}</td><td class="num">${u.num(x.piezas)}</td><td class="num">${u.mxn(x.ultimo.costo_unitario)}</td><td>${u.fFecha(x.ultimo.c.fecha)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="vacio">Sin compras registradas.</div>`}</div>`;
    u.$$("tr[data-p]").forEach((tr) => tr.dataset.p && tr.addEventListener("click", () => CRM.ir("catalogo/" + tr.dataset.p)));
    u.$("#btn-editar").addEventListener("click", () => formProveedor(p, () => fichaProveedor(cont, id)));
    u.$("#btn-compra").addEventListener("click", () => CRM.formCompra({ id_proveedor: id }, () => fichaProveedor(cont, id)));
  }

  function formProveedor(p, alGuardar) {
    const e = p || {};
    u.modal({ titulo: p ? "Editar proveedor" : "Nuevo proveedor", ancho: 620,
      cuerpo: `<div class="campos"><div class="campo c-8"><label>Nombre <span class="req">*</span></label><input name="nombre_proveedor" value="${u.esc(e.nombre_proveedor || "")}"></div>
        <div class="campo c-4"><label>Tipo</label><input name="tipo_proveedor" list="dl-tp" value="${u.esc(e.tipo_proveedor || "")}"><datalist id="dl-tp">${[...new Set(db.t.proveedores.map((x) => x.tipo_proveedor).filter(Boolean))].map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
        <div class="campo c-12"><label>Marcas que surte</label><input name="marcas_que_surte" value="${u.esc(e.marcas_que_surte || "")}"></div>
        <div class="campo"><label>Condiciones de pago</label><input name="condiciones_pago" value="${u.esc(e.condiciones_pago || "")}"></div><div class="campo"><label>Tiempo de entrega</label><input name="lead_time" value="${u.esc(e.lead_time || "")}"></div>
        <div class="campo"><label>Ciudad / estado</label><input name="ciudad_estado" value="${u.esc(e.ciudad_estado || "")}"></div><div class="campo"><label>País</label><input name="pais" value="${u.esc(e.pais || "México")}"></div>
        <div class="campo c-12"><label>Sitio web</label><input name="fuente_web" value="${u.esc(e.fuente_web || "")}"></div><div class="campo c-12"><label>Notas</label><textarea name="nota" rows="2">${u.esc(e.nota || "")}</textarea></div></div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Guardar", clase: "btn-pri", fn: (m) => {
        const f = u.leerForm(m); if (!f.nombre_proveedor) { u.aviso("Escribe el nombre", "error"); return false; }
        if (p) Object.assign(p, f); else db.t.proveedores.push({ id_proveedor: u.siguienteId(db.t.proveedores, "id_proveedor", "PR", 3), ...f });
        db.guardar("proveedores"); u.aviso("Proveedor guardado"); alGuardar();
      } }] });
  }

  /* Registrar compra; si viene de una cotización ganada, propone sus partidas. */
  CRM.formCompra = (pre = {}, alGuardar) => {
    const cot = pre.id_cotizacion ? db.cotizacion(pre.id_cotizacion) : null;
    const lineasCot = cot ? db.lineasCot(cot.id_cotizacion).filter((l) => l.id_producto) : [];
    const prods = u.ordenar(db.t.productos.filter((p) => p.activo !== false), (p) => p.descripcion_original);
    const filaHTML = (l = {}) => `<tr><td><select class="entrada c-prod" style="width:100%">${u.opciones(prods.map((p) => ({ v: p.id_producto, t: `${p.no_parte_cardiel} · ${p.descripcion_original}` })), l.id_producto, "Selecciona pieza…")}</select></td>
      <td><input class="entrada c-cant" type="number" min="1" value="${l.cantidad || 1}" style="width:80px"></td><td><input class="entrada c-costo" type="number" step="0.01" value="${l.costo_proveedor_unitario ?? ""}" style="width:120px" placeholder="0.00"></td><td><button class="btn-icono c-quitar" type="button" aria-label="Quitar">${I("borrar", 16)}</button></td></tr>`;
    u.modal({ titulo: cot ? `Compra para ${cot.id_cotizacion}` : "Registrar compra", ancho: 780,
      cuerpo: `<div class="campos">
        <div class="campo c-8"><label>Proveedor <span class="req">*</span></label><select name="id_proveedor" data-crear="proveedor">${u.opciones(u.ordenar(db.t.proveedores, (p) => p.nombre_proveedor).map((p) => ({ v: p.id_proveedor, t: p.nombre_proveedor })), pre.id_proveedor || (lineasCot[0] && lineasCot[0].id_proveedor_cotizado), "Selecciona…")}</select></div>
        <div class="campo c-4"><label>Fecha</label><input type="date" name="fecha" value="${u.hoyISO()}"></div>
        <div class="campo c-4"><label>Motivo</label><select name="motivo_compra">${u.opciones(["Pedido de cliente", "Reposición de inventario"], cot ? "Pedido de cliente" : "Reposición de inventario")}</select></div>
        <div class="campo c-4"><label>Cotización origen</label><input name="id_cotizacion_origen" value="${u.esc(cot ? cot.id_cotizacion : "")}" placeholder="COT…"></div>
        <div class="campo c-4"><label>Folio factura proveedor</label><input name="folio_factura_proveedor"></div>
        <div class="campo c-12"><label>Partidas</label><table class="tabla-compra"><thead><tr><th>Pieza</th><th>Cant.</th><th>Costo unitario</th><th></th></tr></thead><tbody id="c-lineas">${(lineasCot.length ? lineasCot : [{}]).map(filaHTML).join("")}</tbody></table>
          <button class="btn btn-sec btn-s mt-8" type="button" id="c-mas" style="width:fit-content">${I("mas", 15)}Agregar partida</button></div></div>`,
      alAbrir: (m) => {
        const enlazar = () => u.$$(".c-quitar", m).forEach((b) => { b.onclick = () => { if (u.$$("#c-lineas tr", m).length > 1) b.closest("tr").remove(); }; });
        u.$("#c-mas", m).addEventListener("click", () => { u.$("#c-lineas", m).insertAdjacentHTML("beforeend", filaHTML()); enlazar(); });
        enlazar();
      },
      acciones: [{ texto: "Cancelar" }, { texto: "Guardar compra", clase: "btn-pri", icono: "check", fn: (m) => {
        const f = u.leerForm(m);
        const ls = u.$$("#c-lineas tr", m).map((tr) => ({ id_producto: u.$(".c-prod", tr).value, cantidad: Number(u.$(".c-cant", tr).value) || 0, costo: Number(u.$(".c-costo", tr).value) || 0 })).filter((l) => l.id_producto && l.cantidad > 0);
        if (!f.id_proveedor) { u.aviso("Selecciona el proveedor", "error"); return false; }
        if (!ls.length) { u.aviso("Agrega al menos una partida", "error"); return false; }
        if (ls.some((l) => !l.costo)) { u.aviso("Captura el costo unitario de cada partida", "error"); return false; }
        const id = u.siguienteId(db.t.compras, "id_compra", "OC", 4);
        db.t.compras.push({ id_compra: id, fecha: f.fecha, id_proveedor: f.id_proveedor, moneda: "MXN", condiciones_pago: (db.proveedor(f.id_proveedor) || {}).condiciones_pago || null, fuente_id: null, motivo_compra: f.motivo_compra,
          id_cotizacion_origen: f.id_cotizacion_origen, folio_factura_proveedor: f.folio_factura_proveedor, fecha_recepcion: null, total_sin_iva: Math.round(u.suma(ls, (l) => l.cantidad * l.costo) * 100) / 100 });
        ls.forEach((l, k) => db.t.detalle_compra.push({ id_detalle_compra: `D${id}_${k + 1}`, id_compra: id, id_producto: l.id_producto, cantidad: l.cantidad, costo_unitario: l.costo, moneda: "MXN", subtotal: Math.round(l.cantidad * l.costo * 100) / 100, fuente_id: null, numero_parte_proveedor: null, descripcion_proveedor: null }));
        db.guardar("compras", "detalle_compra");
        if (f.id_cotizacion_origen) db.registrarActividad({ tipo: "nota", id_cotizacion: f.id_cotizacion_origen, id_cliente: (db.cotizacion(f.id_cotizacion_origen) || {}).id_cliente, texto: `Compra ${id} registrada con ${db.nombreProveedor(f.id_proveedor)}` });
        u.aviso(`Compra ${id} registrada. El Cerebro ya muestra este costo.`);
        if (alGuardar) alGuardar();
      } }] });
  };
})(window.CRM);
