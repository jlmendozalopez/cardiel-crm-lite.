/* Documentos · ingesta controlada: subir → decir de qué piezas habla → validar → el Cerebro lo usa. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};
  const est = { verRechazados: false, filtro: "", arrastre: 0, ligado: false };
  const ORIGENES = ["CARDIEL", "Fabricante", "Distribuidor", "Web"];
  const enDocumentos = () => location.hash.startsWith("#/documentos");
  const repintar = () => CRM.vistas.documentos.render(u.$("#contenido"));

  CRM.vistas.documentos = {
    render(cont) {
      const docs = u.ordenar(db.t.documentos, (d) => d.validado_en || d.subido_en || "", true);
      const de = (e) => docs.filter((d) => d.estado === e);
      const pend = de("pendiente"), val = de("validado"), rech = de("rechazado");
      cont.innerHTML = `
        <div class="encabezado"><div class="titulos"><h1>Documentos</h1><p>Catálogos, fichas técnicas y cotizaciones de proveedores que le enseñan al Cerebro. Alguien los revisa antes de que los use.</p></div>
          ${docs.length ? `<button class="btn btn-pri" id="btn-subir">${I("subir", 16)}Subir documento</button>` : ""}
          <input type="file" id="in-doc" hidden accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"></div>
        ${docs.length ? `${resumen(val)}
          ${pend.length ? `<section class="docs-grupo por-revisar"><h2>Por revisar <span class="n">${pend.length}</span></h2><div class="tarjeta">${pend.map(fila).join("")}</div></section>` : ""}
          <section class="docs-grupo"><div class="docs-grupo-cab"><h2>Lo que ya conoce</h2>${val.length > 8 ? `<input id="filtro-docs" type="search" placeholder="Buscar documento" value="${u.esc(est.filtro)}" aria-label="Buscar documento">` : ""}</div>
            <div class="tarjeta" id="lista-validados">${filas(val)}</div></section>
          ${rech.length ? `<button class="btn btn-texto btn-s" id="btn-rechazados">${est.verRechazados ? "Ocultar" : "Ver"} rechazados (${rech.length})</button>
            ${est.verRechazados ? `<section class="docs-grupo mt-8"><div class="tarjeta">${rech.map(fila).join("")}</div></section>` : ""}` : ""}`
        : vacio()}
        <div class="soltar-capa" aria-hidden="true"><div>${I("subir", 30)}<b>Suelta el archivo para enseñárselo al Cerebro</b></div></div>`;

      const inp = u.$("#in-doc", cont), elegir = () => inp.click();
      u.$$("#btn-subir, #btn-subir-vacio", cont).forEach((b) => b.addEventListener("click", elegir));
      inp.addEventListener("change", () => { if (inp.files[0]) nuevo(inp.files[0]); inp.value = ""; });
      ligarFilas(cont);
      const filtro = u.$("#filtro-docs", cont);
      if (filtro) filtro.addEventListener("input", () => { est.filtro = filtro.value; u.$("#lista-validados", cont).innerHTML = filas(val); ligarFilas(u.$("#lista-validados", cont)); });
      const br = u.$("#btn-rechazados", cont);
      if (br) br.addEventListener("click", () => { est.verRechazados = !est.verRechazados; repintar(); });
      ligarArrastre();
    },
  };

  function vacio() {
    return `<div class="tarjeta docs-vacio">
      ${I("documentos", 30)}<h2>Enséñale al Cerebro con tus documentos</h2>
      <ol class="pasos-ingesta">
        <li><b>Sube</b> un catálogo, ficha técnica o cotización de proveedor.</li>
        <li><b>Di de qué piezas habla</b>. El Cerebro te sugiere cuáles.</li>
        <li><b>Alguien lo revisa</b>. Lo dudoso no entra.</li>
        <li><b>El Cerebro lo usa</b> como evidencia desde la siguiente pregunta.</li>
      </ol>
      <button class="btn btn-pri" id="btn-subir-vacio">${I("subir", 16)}Subir el primero</button>
      <p class="tenue">También puedes arrastrarlo aquí. PDF, Excel o foto.</p></div>`;
  }

  function resumen(val) {
    if (!val.length) return "";
    const piezas = new Set(val.flatMap((d) => d.productos || [])).size;
    const sin = val.filter((d) => !(d.productos || []).length).length;
    const falta = !sin ? "" : sin === val.length ? (sin === 1 ? "Todavía no dice de qué piezas habla" : "Ninguno dice todavía de qué piezas habla")
      : `${sin} todavía no ${sin === 1 ? "dice de qué piezas habla" : "dicen de qué piezas hablan"}`;
    return `<p class="docs-resumen">${I("cerebro", 16)}<span>El Cerebro aprende de <b>${val.length} ${val.length === 1 ? "documento" : "documentos"}</b>${piezas ? ` sobre <b>${piezas} ${piezas === 1 ? "pieza" : "piezas"}</b>` : ""}.${falta ? ` <span class="falta">${falta}: ${sin === 1 ? "ábrelo" : "ábrelos"} y elige las piezas para que pueda ${sin === 1 ? "citarlo" : "citarlos"}.</span>` : ""}</span></p>`;
  }

  const tipoDe = (nombre) => { const e = (nombre.split(".").pop() || "").toLowerCase(); return e === "pdf" ? "PDF" : ["xlsx", "xls", "csv"].includes(e) ? "Excel" : ["jpg", "jpeg", "png", "webp"].includes(e) ? "Imagen" : e.toUpperCase() || "Archivo"; };
  const srcDe = (d) => d.ruta || d.datos || null;
  const titulo = (d) => String(d.nombre || "").replace(/\.+[a-z0-9]{2,4}$/i, "").replace(/[._]+$/, "").trim() || d.nombre;
  const piezas = (n) => `${n} ${n === 1 ? "pieza" : "piezas"}`;

  function icoDoc(d) {
    if (d.tipo === "Imagen" && srcDe(d)) return `<div class="tipo-doc"><img src="${u.esc(srcDe(d))}" alt=""></div>`;
    return `<div class="tipo-doc ${d.tipo === "PDF" ? "pdf" : d.tipo === "Excel" ? "xls" : ""}">${u.esc({ PDF: "PDF", Excel: "XLS", Imagen: "IMG" }[d.tipo] || String(d.tipo || "DOC").slice(0, 4).toUpperCase())}</div>`;
  }

  function fila(d) {
    const n = (d.productos || []).length;
    let meta;
    if (d.estado === "pendiente") meta = `${n ? `Habla de ${piezas(n)}` : "Sin piezas"} · subido por ${u.esc((d.subido_por || "—").split(" ")[0])} ${u.esc(u.fFecha(d.subido_en))}`;
    else if (d.estado === "rechazado") meta = `Rechazado: ${u.esc(d.motivo_rechazo || "sin motivo")}`;
    else meta = `${n ? `Habla de ${piezas(n)}` : "Sin piezas"} · ${u.esc(d.origen || "")}`;
    return `<button class="doc-fila" data-doc="${u.esc(d.id_documento)}">${icoDoc(d)}
      <span class="info"><b>${u.esc(titulo(d))}</b><small>${meta}</small></span>
      ${d.estado === "pendiente" ? `<span class="btn btn-pri btn-s">Revisar</span>` : I("chev-der", 16)}</button>`;
  }

  function filas(val) {
    const f = u.norm(est.filtro);
    const lista = f ? val.filter((d) => u.norm(`${d.nombre} ${d.descripcion || ""} ${d.texto_clave || ""}`).includes(f)) : val;
    if (!lista.length) return `<div class="vacio">${f ? "Ningún documento coincide." : "Todavía no hay documentos validados."}</div>`;
    return lista.map(fila).join("");
  }

  function ligarFilas(raiz) {
    u.$$("[data-doc]", raiz).forEach((b) => b.addEventListener("click", () => {
      const d = db.uno("documentos", "id_documento", b.dataset.doc);
      if (d) (d.estado === "pendiente" ? revisar : detalle)(d);
    }));
  }

  /* Soltar un archivo en cualquier parte de la pantalla. Se liga una sola vez a la ventana. */
  function ligarArrastre() {
    if (est.ligado) return;
    est.ligado = true;
    const conArchivo = (e) => [...(e.dataTransfer && e.dataTransfer.types || [])].includes("Files");
    const mostrar = (v) => document.body.classList.toggle("soltando", v);
    window.addEventListener("dragenter", (e) => { if (enDocumentos() && conArchivo(e)) { est.arrastre++; mostrar(true); } });
    window.addEventListener("dragleave", () => { if (est.arrastre && --est.arrastre === 0) mostrar(false); });
    window.addEventListener("dragover", (e) => { if (enDocumentos() && conArchivo(e)) e.preventDefault(); });
    window.addEventListener("drop", (e) => {
      if (!enDocumentos() || !conArchivo(e)) return;
      e.preventDefault(); est.arrastre = 0; mostrar(false);
      if (e.dataTransfer.files[0] && !document.querySelector(".modal-fondo")) nuevo(e.dataTransfer.files[0]);
    });
  }

  function verArchivo(d) {
    const src = srcDe(d); if (!src) return;
    if (src.startsWith("data:")) {
      const [cab, b64] = src.split(",");
      const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      window.open(URL.createObjectURL(new Blob([arr], { type: cab.slice(5).split(";")[0] })), "_blank");
    } else window.open(src, "_blank");
  }

  const chipProducto = (id, liga) => {
    const p = db.producto(id);
    const txt = p ? `${p.no_parte_cardiel} · ${p.descripcion_original}` : id;
    return liga && p ? `<a class="insignia azul" href="#/catalogo/${id}">${u.esc(txt)}</a>` : `<span class="insignia azul">${u.esc(txt)}</span>`;
  };

  /* Números de parte en los datos clave que el Cerebro todavía no conoce. */
  function numerosNuevos(d) {
    const nums = [...new Set((String(d.texto_clave || "").match(/[A-Z0-9][A-Z0-9\-\.]{3,}/gi) || []).filter((x) => /\d/.test(x) && /[A-Z\-]/i.test(x) || /^\d{5,}$/.test(x)))];
    const ya = new Set(db.t.numeros_parte.map((n) => u.compacto(n.numero_parte)));
    return nums.filter((x) => !ya.has(u.compacto(x)));
  }

  /* Piezas que el Cerebro reconoce en el nombre del archivo. */
  function sugerencias(nombre, sel) {
    const limpio = titulo({ nombre }).replace(/[_\-]+/g, " ")
      .replace(/\b(cotizacion|cotización|catalogo|catálogo|lista|productos|ficha|tecnica|técnica|factura|marca|para|de|del|la|el|los|las|y|copia|final|v\d+)\b/gi, " ")
      .replace(/\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/g, " ").trim();
    if (limpio.length < 3) return [];
    try {
      return CRM.cerebro.consultar(limpio).candidatos.filter((c) => c.confianza !== "baja" && !sel.has(c.producto.id_producto)).slice(0, 3).map((c) => c.producto);
    } catch { return []; }
  }

  function nuevo(archivo) {
    const d = { id_documento: null, nombre: archivo.name, tipo: tipoDe(archivo.name), origen: "CARDIEL", productos: [], id_cotizacion: null, pagina: null, descripcion: null, texto_clave: null, estado: "pendiente" };
    formDocumento(d, archivo);
  }

  function formDocumento(d, archivo, alTerminar = repintar) {
    const sel = new Set(d.productos || []);
    const sugeridas = sugerencias(d.nombre, sel);
    let vistaPrevia = "";
    u.modal({ titulo: archivo ? "Enseñarle un documento al Cerebro" : "Editar documento", ancho: 640,
      cuerpo: `<div class="doc-cab"><div id="prev-doc">${icoDoc(d)}</div><div><b>${u.esc(titulo(d))}</b><small>${u.esc(d.tipo)}${archivo ? " · " + u.tamano(archivo.size) : ""}</small></div></div>
        <div class="campos">
          <div class="campo c-12"><label for="busca-prod">¿De qué piezas habla?</label><div class="selector-prod"><input id="busca-prod" placeholder="Busca por código, descripción o número de parte" autocomplete="off"><div class="lista-sug oculto" id="sug-prod"></div></div>
            <div class="chips-sel" id="chips-prod"></div><div class="sugeridas" id="sugeridas"></div></div>
          <div class="campo c-12"><label>¿Qué debe aprender?</label><textarea name="texto_clave" rows="3" placeholder="Números de parte, equivalencias o medidas. Ej. S-24691 equivale a 60961-000">${u.esc(d.texto_clave || "")}</textarea><span class="ayuda">Los números de parte que escribas aquí se vuelven equivalencias al validarlo.</span></div>
        </div>
        <details class="interno"><summary>${I("chev-abajo", 14)}Más detalles</summary>
          <div class="campos mt-8">
            <div class="campo c-8"><label>Nombre del documento</label><input name="nombre" value="${u.esc(d.nombre)}"></div>
            <div class="campo c-4"><label>De dónde viene</label><select name="origen">${u.opciones(ORIGENES, d.origen)}</select></div>
            <div class="campo c-12"><label>¿Qué contiene?</label><input name="descripcion" value="${u.esc(d.descripcion || "")}" placeholder="Ej. Catálogo Hendrickson de bujes para suspensión de remolque"></div>
            <div class="campo c-4"><label>Página</label><input name="pagina" value="${u.esc(d.pagina || "")}" placeholder="Ej. 14"></div>
            <div class="campo c-8"><label>Cotización relacionada</label><input name="id_cotizacion" list="dl-cots" value="${u.esc(d.id_cotizacion || "")}" placeholder="COT…"><datalist id="dl-cots">${u.ordenar(db.t.cotizaciones, (c) => c.fecha, true).slice(0, 80).map((c) => `<option value="${c.id_cotizacion}">${u.esc(db.nombreCliente(c.id_cliente))}</option>`).join("")}</datalist></div>
          </div></details>`,
      alAbrir: (m) => {
        if (archivo && d.tipo === "Imagen") { const url = URL.createObjectURL(archivo); u.$("#prev-doc", m).innerHTML = `<div class="tipo-doc grande"><img src="${url}" alt=""></div>`; vistaPrevia = url; }
        const chips = () => {
          u.$("#chips-prod", m).innerHTML = [...sel].map((id) => { const p = db.producto(id); return `<span class="insignia azul">${u.esc(p ? p.no_parte_cardiel + " · " + p.descripcion_original : id)}<button type="button" data-q="${id}" aria-label="Quitar">${I("x", 12)}</button></span>`; }).join("");
          u.$$("[data-q]", m).forEach((b) => b.addEventListener("click", () => { sel.delete(b.dataset.q); chips(); }));
          const sug = sugeridas.filter((p) => !sel.has(p.id_producto));
          u.$("#sugeridas", m).innerHTML = sug.length ? `<span>¿Es alguna de estas?</span>${sug.map((p) => `<button type="button" class="sugerida" data-s="${p.id_producto}">${I("mas", 12)}${u.esc(p.no_parte_cardiel)} · ${u.esc(p.descripcion_original)}</button>`).join("")}` : "";
          u.$$("[data-s]", m).forEach((b) => b.addEventListener("click", () => { sel.add(b.dataset.s); chips(); }));
        };
        chips();
        const inp = u.$("#busca-prod", m), sug = u.$("#sug-prod", m);
        inp.addEventListener("input", u.debounce(() => {
          const n = u.norm(inp.value), c = u.compacto(inp.value);
          if (n.length < 2) { sug.classList.add("oculto"); return; }
          const r = db.t.productos.filter((p) => p.activo !== false && !sel.has(p.id_producto) && (u.norm(p.descripcion_original).includes(n) || (c.length >= 3 && u.compacto((p.no_parte_cardiel || "") + " " + (p.numero_parte_fabricante || "")).includes(c)))).slice(0, 8);
          sug.innerHTML = r.map((p) => `<button type="button" data-p="${p.id_producto}"><span class="cod">${u.esc(p.no_parte_cardiel)}</span><span class="d">${u.esc(p.descripcion_original)}</span></button>`).join("") || `<div class="tenue" style="padding:10px;font-size:12px">Sin coincidencias. Puedes darla de alta en Catálogo.</div>`;
          sug.classList.remove("oculto");
          u.$$("[data-p]", sug).forEach((b) => b.addEventListener("mousedown", (e) => { e.preventDefault(); sel.add(b.dataset.p); inp.value = ""; sug.classList.add("oculto"); chips(); }));
        }, 100));
        inp.addEventListener("blur", () => setTimeout(() => sug.classList.add("oculto"), 150));
      },
      acciones: [{ texto: "Cancelar", fn: () => { if (vistaPrevia) URL.revokeObjectURL(vistaPrevia); } }, { texto: archivo ? "Enviar a revisión" : "Guardar", clase: "btn-pri", icono: archivo ? "subir" : "check", fn: async (m) => {
        const f = u.leerForm(m);
        if (!f.nombre) { u.aviso("Escribe el nombre del documento", "error"); u.$("details.interno", m).open = true; return false; }
        Object.assign(d, f, { productos: [...sel] });
        if (archivo) {
          try {
            const id = u.siguienteId(db.t.documentos, "id_documento", "D", 4);
            const r = await db.subirArchivo(archivo, `${id}_${archivo.name}`);
            Object.assign(d, { id_documento: id, ruta: r.ruta, datos: r.datos, tamano: archivo.size, subido_por: CRM.usuario().nombre, subido_en: u.hoyISO(), estado: "pendiente" });
            db.t.documentos.push(d);
            db.registrarActividad({ tipo: "documento", texto: `Documento por revisar: ${d.nombre}` });
          } catch (err) { u.aviso(err.message, "error"); return false; }
        }
        db.guardar("documentos"); CRM.refrescarMenu();
        u.aviso(archivo ? "Listo. Queda en «Por revisar»." : "Documento actualizado");
        if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
        if (alTerminar) alTerminar(d);
      } }] });
  }

  function cabecera(d, linea) {
    return `<div class="doc-cab">${icoDoc(d)}<div><b>${u.esc(titulo(d))}</b><small>${linea}</small></div>
      ${srcDe(d) ? `<button type="button" class="btn btn-sec btn-s" data-ver>${I("ver", 15)}Ver archivo</button>` : ""}</div>`;
  }
  const ligarVer = (m, d) => { const b = u.$("[data-ver]", m); if (b) b.addEventListener("click", () => verArchivo(d)); };
  const sinPiezas = `<div class="advertencia">${I("alerta", 16)}<span>No dice de qué piezas habla, así que el Cerebro todavía no lo puede citar.</span></div>`;

  function revisar(d) {
    const nuevos = numerosNuevos(d), prods = d.productos || [];
    u.modal({ titulo: "Revisar documento", ancho: 600,
      cuerpo: `${cabecera(d, `${u.esc(d.origen || "")} · subido por ${u.esc(d.subido_por || "—")} ${u.esc(u.fFecha(d.subido_en))}`)}
        <h4 class="doc-sub">Habla de</h4>
        ${prods.length ? `<div class="chips-sel">${prods.map((id) => chipProducto(id)).join("")}</div>` : sinPiezas}
        ${d.texto_clave ? `<h4 class="doc-sub">Lo que va a aprender</h4><p class="doc-clave">${u.esc(d.texto_clave)}</p>` : ""}
        ${nuevos.length && prods.length ? `<label class="doc-check"><input type="checkbox" name="agregar_nums" checked><span>Reconocer ${nuevos.length === 1 ? "este número" : `estos ${nuevos.length} números`} como equivalencia: <b>${nuevos.map(u.esc).join(", ")}</b></span></label>` : ""}`,
      alAbrir: (m) => ligarVer(m, d),
      acciones: [
        { texto: "Rechazar", clase: "btn-texto peligro", fn: () => { setTimeout(() => rechazar(d), 160); } },
        { texto: "Editar", fn: () => { setTimeout(() => formDocumento(d, null, () => { repintar(); revisar(d); }), 160); } },
        { texto: "Enseñar al Cerebro", clase: "btn-pri", icono: "check", fn: (m) => {
          const chk = u.$("[name=agregar_nums]", m);
          const idF = u.siguienteId(db.t.fuentes, "id_fuente", "F", 3);
          db.t.fuentes.push({ id_fuente: idF, nombre_fuente: d.nombre, tipo: d.tipo, propietario_origen: d.origen === "CARDIEL" ? "CARDIEL" : d.origen, descripcion: d.descripcion, url_publica: null,
            fecha_documento: u.hoyISO(), formato_original: d.tipo, estructura_fuente: null, calidad_legibilidad: null, observaciones: `Ingerido en CRM; validado por ${CRM.usuario().nombre}` });
          Object.assign(d, { estado: "validado", validado_por: CRM.usuario().nombre, validado_en: u.hoyISO(), id_fuente: idF });
          const tablas = ["documentos", "fuentes"];
          const agregados = chk && chk.checked ? nuevos : [];
          for (const num of agregados) for (const idp of prods) db.t.numeros_parte.push({ id_registro: u.siguienteId(db.t.numeros_parte, "id_registro", "NP", 4), id_producto: idp, tipo_numero: "EQUIVALENCIA", marca: null, numero_parte: num, descripcion: d.descripcion, fuente_id: idF, url: null, nivel_confianza: d.origen === "Web" ? "Media" : "Alta", nota: "Extraído de " + d.nombre });
          if (agregados.length) tablas.push("numeros_parte");
          db.guardar(...tablas);
          db.registrarActividad({ tipo: "documento", texto: `Documento validado: ${d.nombre}` });
          CRM.refrescarMenu(); repintar();
          const partes = [];
          if (prods.length) partes.push(`lo citará para ${piezas(prods.length)}`);
          if (agregados.length) partes.push(`reconoce ${agregados.length} ${agregados.length === 1 ? "número nuevo" : "números nuevos"}`);
          u.aviso(partes.length ? `El Cerebro aprendió: ${partes.join(" y ")}.` : "Validado. Falta decir de qué piezas habla para que el Cerebro lo use.");
        } }] });
  }

  function detalle(d) {
    const prods = d.productos || [];
    const aprendidos = d.id_fuente ? db.t.numeros_parte.filter((n) => n.fuente_id === d.id_fuente) : [];
    const nums = [...new Set(aprendidos.map((n) => n.numero_parte))];
    const linea = d.estado === "rechazado"
      ? `Rechazado: ${u.esc(d.motivo_rechazo || "sin motivo")}`
      : `${u.esc(d.origen || "")}${d.pagina ? ` · pág. ${u.esc(d.pagina)}` : ""} · validado por ${u.esc(d.validado_por || "—")} ${u.esc(u.fFecha(d.validado_en))}`;
    const editar = () => { setTimeout(() => formDocumento(d, null, () => { repintar(); detalle(d); }), 160); };
    const acciones = d.estado === "rechazado"
      ? [{ texto: "Editar", fn: editar }, { texto: "Volver a revisar", clase: "btn-pri", fn: () => { d.estado = "pendiente"; d.motivo_rechazo = null; db.guardar("documentos"); CRM.refrescarMenu(); repintar(); u.aviso("Regresó a «Por revisar»"); } }]
      : prods.length ? [{ texto: "Editar", fn: editar }, { texto: "Cerrar", clase: "btn-pri" }]
      : [{ texto: "Cerrar" }, { texto: "Elegir piezas", clase: "btn-pri", icono: "etiqueta", fn: editar }];
    u.modal({ titulo: "Documento", ancho: 600,
      cuerpo: `${cabecera(d, linea)}
        ${d.descripcion ? `<p class="doc-desc">${u.esc(d.descripcion)}</p>` : ""}
        <h4 class="doc-sub">Habla de</h4>
        ${prods.length ? `<div class="chips-sel">${prods.map((id) => chipProducto(id, true)).join("")}</div>` : sinPiezas}
        ${d.estado === "validado" && (prods.length || nums.length) ? `<h4 class="doc-sub">Lo que aprendió el Cerebro</h4><ul class="doc-aprendio">
          ${prods.length ? `<li>${I("check", 14)}<span>Lo cita como evidencia de ${piezas(prods.length)}.</span></li>` : ""}
          ${nums.length ? `<li>${I("check", 14)}<span>Reconoce ${nums.length === 1 ? "el número" : "los números"} <b>${nums.map(u.esc).join(", ")}</b>.</span></li>` : ""}</ul>` : ""}
        ${d.texto_clave ? `<h4 class="doc-sub">Datos clave</h4><p class="doc-clave">${u.esc(d.texto_clave)}</p>` : ""}`,
      alAbrir: (m) => ligarVer(m, d),
      acciones });
  }

  function rechazar(d) {
    u.modal({ titulo: "Rechazar documento", ancho: 460, cuerpo: `<div class="campos"><div class="campo c-12"><label>¿Por qué?</label><input name="motivo" placeholder="Ilegible, duplicado, no corresponde…"></div></div>`,
      acciones: [{ texto: "Cancelar" }, { texto: "Rechazar", clase: "btn-peligro", fn: (m) => {
        d.estado = "rechazado"; d.motivo_rechazo = u.$("[name=motivo]", m).value || "Sin motivo"; db.guardar("documentos"); CRM.refrescarMenu();
        u.aviso("Documento rechazado. No entra al Cerebro."); repintar();
      } }] });
  }
})(window.CRM);
