/* Catálogo: productos, números de parte, datos técnicos, evidencia e historial. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};
  const filtros = { q: "", seg: "", comp: "", pagina: 1 };

  CRM.vistas.catalogo = {
    render(cont, params) {
      if (params[0]) return ficha(cont, params[0]);
      lista(cont);
    },
  };

  function lista(cont) {
    const segs = db.cat("segmentos");
    const prods = db.t.productos.filter((p) => p.activo !== false);
    cont.innerHTML = `
      <div class="encabezado"><div class="titulos"><h1>Catálogo</h1><p>Lo que el Cerebro sabe de cada pieza. Entre más completa la ficha, mejor identifica.</p></div>
        <div class="acciones"><button class="btn btn-sec" id="btn-excel" title="Descarga en Excel lo que estás viendo">${I("descargar", 16)}Excel</button><button class="btn btn-pri" id="btn-nuevo">${I("mas", 16)}Nuevo producto</button></div></div>
      <div class="rejilla r-4">${segs.map((s) => { const ps = prods.filter((p) => p.segmento_origen === s); const pc = u.suma(ps, (p) => db.completitud(p).pct) / (ps.length || 1);
        return `<button class="tarjeta kpi" data-seg="${u.esc(s)}" style="text-align:left;cursor:pointer;border-color:${filtros.seg === s ? "var(--azul)" : "var(--borde)"}"><div class="kpi-ico ${filtros.seg === s ? "" : "marino"}">${I(s.includes("tracto") ? "camion" : s.includes("Dolly") ? "remolque" : s.includes("Plataforma") ? "capas" : "catalogo", 20)}</div><div style="flex:1"><small>${u.esc(s)}</small><b>${ps.length}</b><div class="mini-prog mt-8"><div class="progreso"><i style="width:${pc * 100}%"></i></div><span>${Math.round(pc * 100)}%</span></div></div></button>`; }).join("")}</div>
      <div class="tarjeta mt-16">
        <div class="filtros">
          <div class="busqueda">${I("buscar", 16)}<input class="entrada" id="f-q" placeholder="Descripción, código CARDIEL, número de fabricante, marca…" value="${u.esc(filtros.q)}"></div>
          <select class="entrada" id="f-seg">${u.opciones(segs, filtros.seg, "Todos los segmentos")}</select>
          <select class="entrada" id="f-comp">${u.opciones([{ v: "baja", t: "Ficha incompleta (menos de 50%)" }, { v: "sinnp", t: "Sin número de fabricante" }, { v: "sinfoto", t: "Sin foto" }], filtros.comp, "Cualquier completitud")}</select>
          <span class="tenue" id="f-conteo" style="margin-left:auto;font-size:12.5px"></span>
        </div>
        <div id="zona"></div>
      </div>`;
    let actuales = [];
    const pintar = () => {
      const n = u.norm(filtros.q), cmp = u.compacto(filtros.q);
      let ps = prods.filter((p) => {
        if (filtros.seg && p.segmento_origen !== filtros.seg) return false;
        if (filtros.comp === "baja" && db.completitud(p).pct >= 0.5) return false;
        if (filtros.comp === "sinnp" && p.numero_parte_fabricante) return false;
        if (filtros.comp === "sinfoto" && (p.num_imagenes || p.foto)) return false;
        if (!n) return true;
        const eq = db.por("numeros_parte", "id_producto", p.id_producto).map((x) => x.numero_parte).join(" ");
        return u.norm([p.descripcion_original, p.no_parte_cardiel, p.numero_parte_fabricante, p.marca_comercial, p.fabricante, eq].join(" ")).includes(n) || (cmp.length >= 3 && u.compacto(eq + p.no_parte_cardiel + " " + p.numero_parte_fabricante).includes(cmp));
      });
      u.$("#f-conteo").textContent = `${ps.length} productos`;
      actuales = ps;
      const pg = u.paginar(ps, filtros.pagina, 25);
      u.$("#zona").innerHTML = ps.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Código CARDIEL</th><th>Descripción</th><th>Segmento</th><th>Fabricante · No. parte</th><th class="num">Precio lista</th><th class="num">Cotizado</th><th>Ficha</th></tr></thead><tbody>
        ${pg.filas.map((p) => { const c = db.completitud(p); const a = db.por("detalle_cotizacion", "id_producto", p.id_producto).length; return `<tr class="clic" data-id="${p.id_producto}">
          <td class="principal-celda nowrap">${u.esc(p.no_parte_cardiel || "—")}</td>
          <td style="max-width:340px"><span class="principal-celda">${u.esc(p.descripcion_original)}</span>${p.especificaciones ? `<div class="sec" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.esc(p.especificaciones)}</div>` : ""}</td>
          <td><span class="insignia">${u.esc(p.segmento_origen || "—")}</span></td>
          <td>${p.numero_parte_fabricante ? `${u.esc(p.fabricante || p.marca_comercial || "")}<div class="sec mono">${u.esc(p.numero_parte_fabricante)}</div>` : `<span class="insignia rojo">Falta</span>`}</td>
          <td class="num">${p.precio_lista ? u.mxn(p.precio_lista) : "—"}</td>
          <td class="num">${a}</td>
          <td><div class="mini-prog"><div class="progreso"><i style="width:${c.pct * 100}%;background:${c.pct >= 0.67 ? "var(--verde)" : c.pct >= 0.5 ? "var(--azul)" : "var(--rojo)"}"></i></div><span>${Math.round(c.pct * 100)}%</span></div></td></tr>`; }).join("")}
      </tbody></table></div>${u.htmlPaginas(pg, ps.length)}` : `<div class="vacio">${I("catalogo", 28)}No hay productos con esos filtros.</div>`;
      u.$$("tr[data-id]").forEach((tr) => tr.addEventListener("click", () => CRM.ir("catalogo/" + tr.dataset.id)));
      u.$$("[data-pag]").forEach((b) => b.addEventListener("click", () => { filtros.pagina = +b.dataset.pag; pintar(); }));
    };
    u.$("#f-q").addEventListener("input", u.debounce((e) => { filtros.q = e.target.value; filtros.pagina = 1; pintar(); }, 120));
    u.$("#f-seg").addEventListener("change", (e) => { filtros.seg = e.target.value; filtros.pagina = 1; lista(cont); });
    u.$("#f-comp").addEventListener("change", (e) => { filtros.comp = e.target.value; filtros.pagina = 1; pintar(); });
    u.$$("[data-seg]").forEach((b) => b.addEventListener("click", () => { filtros.seg = filtros.seg === b.dataset.seg ? "" : b.dataset.seg; filtros.pagina = 1; lista(cont); }));
    u.$("#btn-nuevo").addEventListener("click", () => formProducto(null, (p) => CRM.ir("catalogo/" + p.id_producto)));
    u.$("#btn-excel").addEventListener("click", () => CRM.excel({
      archivo: `CARDIEL_catalogo_${u.hoyISO()}.xlsx`, hoja: "Catálogo", titulo: "Catálogo CARDIEL",
      subtitulo: [`${actuales.length} productos`, filtros.seg, filtros.q && `búsqueda «${filtros.q}»`, `generado ${u.fFecha(u.hoyISO())}`].filter(Boolean).join(" · "),
      columnas: [{ t: "Código CARDIEL", w: 16 }, { t: "Descripción", w: 46 }, { t: "Segmento", w: 24 }, { t: "Fabricante", w: 20 }, { t: "No. parte fabricante", w: 20 }, { t: "Equivalencias", w: 30 },
        { t: "Precio lista", w: 14, tipo: "mxn" }, { t: "Veces cotizado", w: 13, tipo: "num", total: true }, { t: "Ficha completa", w: 13 }],
      filas: actuales.map((p) => [p.no_parte_cardiel, p.descripcion_original, p.segmento_origen, p.fabricante || p.marca_comercial, p.numero_parte_fabricante,
        db.por("numeros_parte", "id_producto", p.id_producto).filter((x) => x.tipo_numero !== "CODIGO_CARDIEL").map((x) => x.numero_parte).join(", "),
        p.precio_lista || null, db.por("detalle_cotizacion", "id_producto", p.id_producto).length, `${Math.round(db.completitud(p).pct * 100)}%`]),
    }));
    pintar();
  }

  function ficha(cont, id) {
    const p = db.producto(id);
    if (!p) { cont.innerHTML = `<div class="tarjeta vacio">${I("alerta", 28)}No existe el producto. <a href="#/catalogo">Volver</a></div>`; return; }
    const comp = db.completitud(p);
    const nps = db.por("numeros_parte", "id_producto", id);
    const obs = db.por("observaciones", "id_producto", id);
    const imgs = u.ordenar(db.por("imagenes", "id_producto", id), (x) => x.consecutivo || 9);
    const docs = db.t.documentos.filter((d) => d.estado === "validado" && (d.productos || []).includes(id));
    const a = db.antecedentes(id);
    const otros = db.t.productos.filter((x) => x.id_producto !== id && x.no_parte_cardiel && x.no_parte_cardiel === p.no_parte_cardiel);
    const ev = CRM.cerebro.consultar(p.no_parte_cardiel || p.descripcion_original).candidatos.find((c) => c.producto.no_parte_cardiel === p.no_parte_cardiel);

    cont.innerHTML = `
      <div class="migas"><a href="#/catalogo">Catálogo</a>${I("chev-der", 13)}<span>${u.esc(p.no_parte_cardiel || p.id_producto)}</span></div>
      <div class="tarjeta">
        <div class="ficha-cab"><div class="grande" style="background:var(--superficie-2);color:var(--gris-400);border:1px solid var(--borde)">${p.foto ? `<img src="${u.esc(p.foto)}" alt="">` : imgs[0] && imgs[0].url_imagen ? `${I("catalogo", 28)}<img src="${u.esc(imgs[0].url_imagen)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" style="position:absolute;inset:0">` : I("catalogo", 28)}</div>
          <div class="tit"><h1>${u.esc(p.descripcion_original)}</h1>
            <div class="meta"><span>${I("etiqueta", 15)}CARDIEL ${u.esc(p.no_parte_cardiel || "—")}</span>${p.numero_parte_fabricante ? `<span>${I("numeral", 15)}${u.esc(p.fabricante || p.marca_comercial || "")} ${u.esc(p.numero_parte_fabricante)}</span>` : ""}<span>${I("capas", 15)}${u.esc(p.segmento_origen || "")}</span>${otros.length ? `<span>También en: ${otros.map((o) => `<a href="#/catalogo/${o.id_producto}">${u.esc(o.segmento_origen)}</a>`).join(", ")}</span>` : ""}</div></div>
          <div class="acciones"><button class="btn btn-sec" id="btn-editar">${I("editar", 16)}Editar</button><button class="btn btn-sec" id="btn-preguntar">${I("cerebro", 16)}Probar en el Cerebro</button><button class="btn btn-pri" id="btn-cot">${I("cotizacion", 16)}Cotizar</button></div></div>
        <div class="datos-ficha">
          <div><small>Precio de lista</small><b>${p.precio_lista ? u.mxn(p.precio_lista) : "—"}</b><div class="tenue" style="font-size:11px">${u.esc(p.base_precio_lista || "")}</div></div>
          <div><small>Costo de referencia</small><b>${p.costo_referencia_mxn_2026 ? u.mxn(p.costo_referencia_mxn_2026) : "—"}</b></div>
          <div><small>Veces cotizado</small><b>${a.vecesCotizado}</b><div class="tenue" style="font-size:11px">${a.vecesGanado} ganadas</div></div>
          <div><small>Completitud de la ficha</small><b>${Math.round(comp.pct * 100)}%</b></div>
        </div>
      </div>
      <div class="rejilla r-2-1 mt-16">
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Números de parte y equivalencias</h3><button class="btn btn-sec btn-s" id="btn-np">${I("mas", 15)}Agregar</button></div>
            ${nps.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Tipo</th><th>Marca</th><th>Número</th><th>Confianza</th><th>Fuente</th></tr></thead><tbody>${nps.map((n) => `<tr><td><span class="insignia ${n.tipo_numero === "CODIGO_CARDIEL" ? "marino" : n.tipo_numero === "FABRICANTE" ? "azul" : ""}">${u.esc((n.tipo_numero || "").replace(/_/g, " ").toLowerCase())}</span></td><td>${u.esc(n.marca || "—")}</td><td class="principal-celda mono">${u.esc(n.numero_parte)}</td><td>${conf(n.nivel_confianza)}</td><td>${fuenteLink(n.fuente_id, n.url)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="vacio">Sin números registrados.</div>`}</div>
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Datos técnicos observados</h3><button class="btn btn-sec btn-s" id="btn-obs">${I("mas", 15)}Agregar</button></div>
            ${p.especificaciones || p.descripcion_tecnica || p.aplicacion ? `<div class="tarjeta-cuerpo"><dl class="dl">${p.descripcion_tecnica ? `<dt>Descripción técnica</dt><dd>${u.esc(p.descripcion_tecnica)}</dd>` : ""}${p.aplicacion ? `<dt>Aplicación</dt><dd>${u.esc(p.aplicacion)}</dd>` : ""}${p.especificaciones ? `<dt>Especificaciones</dt><dd style="font-weight:500">${u.esc(p.especificaciones)}</dd>` : ""}</dl></div>` : ""}
            ${obs.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Dato</th><th>Valor</th><th>Texto original</th><th>Fuente</th><th>Confianza</th></tr></thead><tbody>${obs.map((o) => `<tr><td>${u.esc(o.tipo_dato.replace(/_/g, " "))}</td><td class="principal-celda">${u.esc(o.valor)}${o.unidad ? " " + u.esc(o.unidad) : ""}</td><td class="sec">${u.esc(o.texto_original || "")}</td><td>${fuenteLink(o.fuente_id)}<div class="sec">${u.esc(o.ubicacion_fuente || "")}</div></td><td>${conf(o.nivel_confianza)}</td></tr>`).join("")}</tbody></table></div>` : !p.especificaciones ? `<div class="vacio">Sin datos técnicos. Agrégalos o sube el documento en Documentos.</div>` : ""}</div>
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Historial comercial</h3><span class="sub">cotizaciones y compras</span></div>
            ${a.lineas.length || a.compras.length ? `<div class="tabla-cont"><table class="tabla"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Cliente / proveedor</th><th class="num">Cant.</th><th class="num">Precio / costo</th><th>Estado</th></tr></thead><tbody>
              ${u.ordenar([...a.lineas.map((l) => ({ f: l.cot.fecha, h: `<td class="nowrap">${u.fFecha(l.cot.fecha)}</td><td><a href="#/cotizaciones/${l.id_cotizacion}">${l.id_cotizacion}</a><div class="sec">Cotización</div></td><td>${u.esc(db.nombreCliente(l.cot.id_cliente))}</td><td class="num">${u.num(l.cantidad)}</td><td class="num">${u.mxn(l.precio_unitario)}</td><td><span class="insignia etapa-${l.cot.etapa}">${db.etapa(l.cot.etapa).t}</span></td>` })),
                ...a.compras.map((l) => ({ f: l.oc.fecha, h: `<td class="nowrap">${u.fFecha(l.oc.fecha)}</td><td>${l.id_compra}<div class="sec">Compra</div></td><td>${u.esc(db.nombreProveedor(l.oc.id_proveedor))}</td><td class="num">${u.num(l.cantidad)}</td><td class="num">${u.mxn(l.costo_unitario)}</td><td><span class="insignia">${u.esc(l.oc.motivo_compra || "")}</span></td>` }))], (x) => x.f, true).slice(0, 25).map((x) => `<tr>${x.h}</tr>`).join("")}
            </tbody></table></div>` : `<div class="vacio">Todavía no se ha cotizado ni comprado.</div>`}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Qué le falta a la ficha</h3></div><div class="tarjeta-cuerpo">
            <div class="progreso" style="margin-bottom:14px"><i style="width:${comp.pct * 100}%"></i></div>
            <ul class="checklist">${comp.items.map((x) => `<li class="${x.ok ? "ok" : "falta"}">${I(x.ok ? "check-circulo" : "x-circulo", 17)}${u.esc(x.t)}</li>`).join("")}</ul>
            <a class="btn btn-sec btn-s mt-16" href="#/documentos">${I("subir", 15)}Subir evidencia</a></div></div>
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Fotos</h3><button class="btn btn-sec btn-s" id="btn-foto">${I("imagen", 15)}Subir foto</button><input type="file" id="in-foto" accept="image/*" hidden></div><div class="tarjeta-cuerpo">
            ${p.foto || imgs.length ? `<div class="galeria">${p.foto ? `<div class="foto"><img src="${u.esc(p.foto)}" alt=""><small>CARDIEL</small></div>` : ""}${imgs.slice(0, 8).map((im) => `<a class="foto" href="${u.esc(im.url_pagina || im.url_imagen || "#")}" target="_blank" rel="noopener" title="${u.esc(im.descripcion_imagen || "")}">${I("imagen", 22)}<img src="${u.esc(im.url_imagen || "")}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" style="position:absolute;inset:0"><small>${u.esc(im.fuente_imagen || "")}</small></a>`).join("")}</div>
            <p class="tenue mt-8" style="font-size:11.5px">Las fotos de internet son enlaces; si no cargan, sube la foto real de CARDIEL.</p>` : `<div class="vacio" style="padding:16px">${I("imagen", 26)}Sin fotos.</div>`}</div></div>
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Evidencia que usa el Cerebro</h3></div><div class="tarjeta-cuerpo">
            ${ev && ev.evidencia.length ? `<ul class="evidencia">${ev.evidencia.map((e) => `<li>${I(e.origen === "CARDIEL" ? "base" : "documentos", 14)}<div>${e.url ? `<a href="${u.esc(e.url)}" target="_blank" rel="noopener">${u.esc(e.nombre)}</a>` : u.esc(e.nombre)}<small>${u.esc(e.origen)} ${u.esc(e.ubicacion || "")} ${e.que ? "· " + u.esc(e.que) : ""}</small></div></li>`).join("")}</ul>` : `<p class="tenue">Sin evidencia registrada.</p>`}
            ${docs.length ? `<p class="mt-8" style="font-size:12px">${docs.length} documento(s) validado(s) ligados.</p>` : ""}</div></div>
        </div>
      </div>`;

    u.$("#btn-editar").addEventListener("click", () => formProducto(p, () => ficha(cont, id)));
    u.$("#btn-preguntar").addEventListener("click", () => CRM.preguntar(p.descripcion_original));
    u.$("#btn-cot").addEventListener("click", () => { sessionStorage.setItem("cardiel_precot", JSON.stringify({ productos: [id] })); CRM.ir("cotizaciones/nueva"); });
    u.$("#btn-np").addEventListener("click", () => formNumero(p, () => ficha(cont, id)));
    u.$("#btn-obs").addEventListener("click", () => formObservacion(p, () => ficha(cont, id)));
    u.$("#btn-foto").addEventListener("click", () => u.$("#in-foto").click());
    u.$("#in-foto").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const nombre = `${p.id_producto}_${p.no_parte_cardiel || ""}_${Date.now()}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`.replace(/[^A-Za-z0-9._-]/g, "_");
        const r = await db.subirArchivo(f, nombre);
        p.foto = r.ruta || r.datos; p.num_imagenes = (p.num_imagenes || 0) + 1;
        db.guardar("productos"); u.aviso("Foto agregada a la ficha"); ficha(cont, id);
      } catch (err) { u.aviso(err.message, "error"); }
    });
  }

  const conf = (c) => c ? `<span class="insignia ${c === "Alta" ? "verde" : c === "Media" ? "ambar" : "rojo"}">${u.esc(c)}</span>` : "—";
  function fuenteLink(id, url) {
    const f = id ? db.fuente(id) : null;
    const href = url || (f && f.url_publica);
    const nom = f ? f.nombre_fuente : id || "—";
    return href ? `<a href="${u.esc(href)}" target="_blank" rel="noopener">${u.esc(nom)}</a>` : `<span>${u.esc(nom)}</span>`;
  }

  function formProducto(p, alGuardar) {
    const e = p || { segmento_origen: db.cat("segmentos")[0] };
    u.modal({ titulo: p ? "Editar producto" : "Nuevo producto", ancho: 680,
      cuerpo: `<div class="campos">
        <div class="campo c-4"><label>Código CARDIEL <span class="req">*</span></label><input name="no_parte_cardiel" value="${u.esc(e.no_parte_cardiel || "")}"></div>
        <div class="campo c-8"><label>Descripción (como la usa CARDIEL) <span class="req">*</span></label><input name="descripcion_original" value="${u.esc(e.descripcion_original || "")}"></div>
        <div class="campo"><label>Segmento</label><input name="segmento_origen" list="dl-seg" data-cat="segmentos" value="${u.esc(e.segmento_origen || "")}"><datalist id="dl-seg">${db.cat("segmentos").map((s) => `<option value="${u.esc(s)}">`).join("")}</datalist></div>
        <div class="campo"><label>Marca comercial</label><input name="marca_comercial" value="${u.esc(e.marca_comercial || "")}"></div>
        <div class="campo"><label>Fabricante</label><input name="fabricante" value="${u.esc(e.fabricante || "")}"></div>
        <div class="campo"><label>No. de parte del fabricante</label><input name="numero_parte_fabricante" value="${u.esc(e.numero_parte_fabricante || "")}"></div>
        <div class="campo c-12"><label>Aplicación (unidad, modelo, motor)</label><input name="aplicacion" value="${u.esc(e.aplicacion || "")}" placeholder="Ej. Freightliner Cascadia 2018–2023 · Detroit DD15"></div>
        <div class="campo c-12"><label>Especificaciones</label><textarea name="especificaciones" rows="3">${u.esc(e.especificaciones || "")}</textarea></div>
        <div class="campo"><label>Precio de lista (MXN, sin IVA)</label><input type="number" step="0.01" name="precio_lista" value="${e.precio_lista ?? ""}"></div>
        <div class="campo"><label>Costo de referencia (MXN)</label><input type="number" step="0.01" name="costo_referencia_mxn_2026" value="${e.costo_referencia_mxn_2026 ?? ""}"></div>
      </div>`,
      acciones: [...(p ? [{ texto: "Desactivar", clase: "btn-texto", fn: async () => { p.activo = false; db.guardar("productos"); u.aviso("Producto desactivado"); CRM.ir("catalogo"); } }] : []), { texto: "Cancelar" }, { texto: "Guardar producto", clase: "btn-pri", icono: "check", fn: (m) => {
        const f = u.leerForm(m);
        if (!f.no_parte_cardiel || !f.descripcion_original) { u.aviso("Código y descripción son obligatorios", "error"); return false; }
        f.descripcion_original = f.descripcion_original.toUpperCase();
        let r;
        if (p) { Object.assign(p, f); r = p; if (f.precio_lista) p.base_precio_lista = "Capturado en el CRM"; }
        else {
          r = { id_producto: u.siguienteId(db.t.productos, "id_producto", "P", 3), activo: true, creado_en: u.hoyISO(), fuente_id: null, tiene_no_parte: f.numero_parte_fabricante ? "Sí" : "No", num_imagenes: 0, base_precio_lista: f.precio_lista ? "Capturado en el CRM" : null, ...f };
          db.t.productos.push(r);
          db.t.numeros_parte.push({ id_registro: u.siguienteId(db.t.numeros_parte, "id_registro", "NP", 4), id_producto: r.id_producto, tipo_numero: "CODIGO_CARDIEL", marca: "CARDIEL", numero_parte: f.no_parte_cardiel, descripcion: f.descripcion_original, fuente_id: null, url: null, nivel_confianza: "Alta", nota: "Alta en CRM" });
          if (f.numero_parte_fabricante) db.t.numeros_parte.push({ id_registro: u.siguienteId(db.t.numeros_parte, "id_registro", "NP", 4), id_producto: r.id_producto, tipo_numero: "FABRICANTE", marca: f.fabricante || f.marca_comercial, numero_parte: f.numero_parte_fabricante, descripcion: null, fuente_id: null, url: null, nivel_confianza: "Media", nota: "Capturado en CRM" });
        }
        db.guardar("productos", "numeros_parte"); u.aviso(p ? "Producto actualizado" : "Producto creado. El Cerebro ya lo encuentra.");
        if (alGuardar) alGuardar(r);
      } }] });
  }

  function formNumero(p, alGuardar) {
    u.modal({ titulo: "Agregar número de parte o equivalencia", ancho: 560,
      cuerpo: `<div class="campos"><div class="campo"><label>Tipo</label><select name="tipo_numero">${u.opciones([{ v: "FABRICANTE", t: "Fabricante" }, { v: "FABRICANTE_ALTERNO", t: "Fabricante alterno" }, { v: "EQUIVALENCIA", t: "Equivalencia" }])}</select></div>
        <div class="campo"><label>Marca</label><input name="marca"></div><div class="campo"><label>Número <span class="req">*</span></label><input name="numero_parte"></div>
        <div class="campo"><label>Confianza</label><select name="nivel_confianza">${u.opciones(["Alta", "Media", "Baja"], "Media")}</select></div>
        <div class="campo c-12"><label>URL de la fuente (opcional)</label><input name="url" placeholder="https://"></div></div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Agregar", clase: "btn-pri", fn: (m) => {
        const f = u.leerForm(m); if (!f.numero_parte) { u.aviso("Escribe el número", "error"); return false; }
        db.t.numeros_parte.push({ id_registro: u.siguienteId(db.t.numeros_parte, "id_registro", "NP", 4), id_producto: p.id_producto, descripcion: null, fuente_id: null, nota: "Capturado en CRM por " + CRM.usuario().nombre, ...f });
        if (f.tipo_numero === "FABRICANTE" && !p.numero_parte_fabricante) { p.numero_parte_fabricante = f.numero_parte; p.fabricante = p.fabricante || f.marca; db.guardar("productos"); }
        db.guardar("numeros_parte"); u.aviso("Número agregado. Ya se puede buscar en el Cerebro."); alGuardar();
      } }] });
  }

  function formObservacion(p, alGuardar) {
    u.modal({ titulo: "Agregar dato técnico", ancho: 560,
      cuerpo: `<div class="campos"><div class="campo"><label>Dato</label><input name="tipo_dato" list="dl-td" placeholder="medida, aplicación, material…"><datalist id="dl-td">${[...new Set(db.t.observaciones.map((o) => o.tipo_dato))].map((t) => `<option value="${u.esc(t)}">`).join("")}</datalist></div>
        <div class="campo"><label>Valor <span class="req">*</span></label><input name="valor"></div><div class="campo"><label>Unidad</label><input name="unidad" placeholder="in, mm, lb…"></div>
        <div class="campo"><label>Dónde se vio</label><input name="ubicacion_fuente" placeholder="Catálogo pág. 4, etiqueta…"></div>
        <div class="campo c-12"><label>Fuente</label><select name="fuente_id">${u.opciones(db.t.fuentes.map((f) => ({ v: f.id_fuente, t: `${f.id_fuente} · ${f.nombre_fuente}` })), "", "Sin fuente")}</select></div></div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Agregar", clase: "btn-pri", fn: (m) => {
        const f = u.leerForm(m); if (!f.valor) { u.aviso("Escribe el valor", "error"); return false; }
        db.t.observaciones.push({ id_observacion: u.siguienteId(db.t.observaciones, "id_observacion", "OT", 3), id_producto: p.id_producto, texto_original: f.valor, nivel_confianza: f.fuente_id ? "Alta" : "Media", validacion: "Capturado en CRM", ...f, tipo_dato: (f.tipo_dato || "dato").toLowerCase().replace(/\s+/g, "_") });
        db.guardar("observaciones"); u.aviso("Dato técnico agregado"); alGuardar();
      } }] });
  }
  CRM.formProducto = formProducto;
})(window.CRM);
