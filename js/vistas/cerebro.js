/* Cerebro Digital · copiloto del vendedor (respuesta simulada con evidencia). */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};
  const sesion = { mensajes: [], contexto: { id_cliente: "", unidad_tipo: "" }, imagen: null };

  const EJEMPLOS = ["Buje trifuncional Hendrickson 7/8", "S-24691", "Balatas para Cascadia", "Necesito una pieza para remolque"];

  CRM.vistas.cerebro = {
    render(cont) {
      const ctxGuardado = sessionStorage.getItem("cardiel_ctx_cerebro");
      if (ctxGuardado) { sessionStorage.removeItem("cardiel_ctx_cerebro"); try { Object.assign(sesion.contexto, JSON.parse(ctxGuardado)); } catch (e) { /* */ } }
      const f = this.fuentes();
      cont.innerHTML = `
      <div class="encabezado"><div class="titulos"><h1>Cerebro Digital</h1><p>Describe la pieza que pidió el cliente. El Cerebro busca en catálogo, números de parte, documentos y cotizaciones, y te responde con evidencia.</p></div></div>
      <div class="cerebro">
        <div class="tarjeta chat">
          <div class="chat-cuerpo" id="chat" aria-live="polite" aria-label="Conversación con el Cerebro"></div>
          <div class="chat-entrada">
            <div class="chat-barra" id="chat-barra"></div>
            <div id="adjunto"></div>
            <form class="caja con-dictado" id="form-chat">
              <button type="button" class="btn-icono" id="btn-foto" title="Adjuntar foto de la pieza" aria-label="Adjuntar foto">${I("clip", 19)}</button>
              <input type="file" id="archivo-foto" accept="image/*" aria-label="Foto de la pieza" hidden>
              <textarea id="entrada" rows="1" data-dictado placeholder="Ej. buje Hendrickson 7/8" aria-label="¿Qué pieza te pidieron?"></textarea>
              <button class="btn btn-pri" type="submit">${I("enviar", 16)}Consultar</button>
            </form>
          </div>
        </div>
        <div class="panel-lateral">
          <div class="tarjeta">
            <div class="tarjeta-cab"><h3>Fuentes que consulta</h3><span class="sub">en vivo</span></div>
            <div class="tarjeta-cuerpo"><ul class="fuentes-lista">
              <li><span>Productos del catálogo</span><b>${f.productos}</b></li>
              <li><span>Números de parte y equivalencias</span><b>${f.numeros}</b></li>
              <li><span>Observaciones técnicas</span><b>${f.observaciones}</b></li>
              <li><span>Documentos validados</span><b>${f.documentos}</b></li>
              <li><span>Partidas cotizadas</span><b>${f.cotizaciones}</b></li>
              <li><span>Partidas compradas</span><b>${f.compras}</b></li>
            </ul>
            <div class="advertencia azul">${I("info", 16)}<span>Demo simulada: busca con reglas y similitud de texto. En el MVP esta misma pantalla usará el RAG multimodal del equipo.</span></div></div>
          </div>
          <div class="tarjeta">
            <div class="tarjeta-cab"><h3>Consultas recientes</h3></div>
            <div class="tarjeta-cuerpo" id="recientes">${recientes()}</div>
          </div>
        </div>
      </div>`;

      const chat = u.$("#chat");
      if (!sesion.mensajes.length) chat.innerHTML = bienvenida();
      else sesion.mensajes.forEach((m) => chat.insertAdjacentHTML("beforeend", m.html));
      enlazarResultados(chat);
      u.$$(".traza li", chat).forEach((li) => li.classList.add("listo"));

      const entrada = u.$("#entrada");
      entrada.addEventListener("input", () => { entrada.style.height = "auto"; entrada.style.height = Math.min(140, entrada.scrollHeight) + "px"; });
      entrada.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); u.$("#form-chat").requestSubmit(); } });
      u.$("#form-chat").addEventListener("submit", (e) => { e.preventDefault(); enviar(entrada.value.trim()); });
      u.$("#chat-barra").addEventListener("click", (e) => {
        if (e.target.closest("#quitar-ctx")) { sesion.contexto = { id_cliente: "", unidad_tipo: "" }; pintarBarra(); u.$("#entrada").focus(); return; }
        if (!e.target.closest("#btn-limpiar")) return;
        const antes = { mensajes: sesion.mensajes, contexto: { ...sesion.contexto }, imagen: sesion.imagen, imagenNombre: sesion.imagenNombre };
        Object.assign(sesion, { mensajes: [], contexto: { id_cliente: "", unidad_tipo: "" }, imagen: null, imagenNombre: null });
        this.render(cont);
        u.aviso("Conversación borrada", "ok", { texto: "Deshacer", fn: () => { Object.assign(sesion, antes); if (u.$("#chat")) this.render(cont); } });
      });
      pintarBarra();
      u.$("#btn-foto").addEventListener("click", () => u.$("#archivo-foto").click());
      u.$("#archivo-foto").addEventListener("change", async (e) => {
        const a = e.target.files[0]; if (!a) return;
        sesion.imagen = await reducir(a, 900);
        sesion.imagenNombre = a.name;
        pintarAdjunto();
      });
      enlazarRecientes();
      pintarAdjunto();
      const pendiente = sessionStorage.getItem("cardiel_pregunta");
      if (pendiente) { sessionStorage.removeItem("cardiel_pregunta"); enviar(pendiente); }
      else entrada.focus();
    },
    fuentes() {
      return { productos: db.t.productos.filter((p) => p.activo !== false).length, numeros: db.t.numeros_parte.length, observaciones: db.t.observaciones.length,
        documentos: db.t.documentos.filter((d) => d.estado === "validado").length, cotizaciones: db.t.detalle_cotizacion.length, compras: db.t.detalle_compra.length };
    },
  };

  /* Sin selectores: el cliente y la unidad se toman de lo que escribe el vendedor o de la cotización desde la que llegó. */
  function detectarContexto(texto) {
    const { frase, ...r } = CRM.cerebro.contexto(texto);
    return r;
  }
  function pintarBarra() {
    const b = u.$("#chat-barra"); if (!b) return;
    const { id_cliente, unidad_tipo } = sesion.contexto;
    const ctx = [id_cliente ? db.nombreCliente(id_cliente).replace(/[,\s]\s*S\.?\s*A\.?(\s*de\s*C\.?\s*V\.?)?\s*$/i, "") : null, unidad_tipo ? unidad_tipo.charAt(0) + unidad_tipo.slice(1).toLowerCase() : null].filter(Boolean);
    const hay = sesion.mensajes.length || ctx.length;
    b.hidden = !hay;
    b.innerHTML = hay ? `${ctx.length ? `<span class="ctx-actual" title="El Cerebro ordena los candidatos y trae el historial con este contexto">Para ${ctx.map((x) => `<b>${u.esc(x)}</b>`).join(" · ")}<button type="button" class="btn-icono" id="quitar-ctx" aria-label="Quitar contexto">${I("x", 13)}</button></span>` : "<span></span>"}
      ${sesion.mensajes.length ? `<button type="button" class="btn btn-texto btn-s" id="btn-limpiar" aria-label="Empezar de nuevo" title="Borra la conversación para empezar otra consulta">${I("refrescar", 14)}Empezar de nuevo</button>` : ""}` : "";
  }

  /* Borrar del historial solo lo oculta: las consultas siguen contando en los indicadores y en lo que aprende el Cerebro. */
  const visibles = () => (db.t.consultas || []).filter((c) => !c.oculta);
  function recientes() {
    const cs = visibles();
    return cs.length ? `<ul class="historial-consultas">${u.ordenar(cs, (c) => c.fecha, true).slice(0, 10).map((c) => `<li><button type="button" class="reciente" data-q="${u.esc(c.texto)}"><b>${u.esc(c.texto)}</b><small>${u.esc(c.usuario || "")} · ${u.relativo(c.fecha)} · ${c.abstencion ? "faltó un dato" : u.esc(c.resultado || "")}</small></button><button type="button" class="btn-icono quitar-reciente" data-quitar-q="${c.id_consulta}" aria-label="Borrar «${u.esc(c.texto)}» del historial" title="Borrar del historial">${I("x", 14)}</button></li>`).join("")}</ul>
      <div class="pie-recientes"><button type="button" class="btn btn-texto btn-s" id="btn-borrar-historial">${I("borrar", 14)}Borrar historial</button></div>`
      : `<p class="tenue">Todavía no hay consultas guardadas.</p>`;
  }
  function ocultar(lista, mensaje) {
    lista.forEach((c) => (c.oculta = true));
    db.guardar("consultas"); pintarRecientes();
    u.aviso(mensaje, "ok", { texto: "Deshacer", fn: () => { lista.forEach((c) => delete c.oculta); db.guardar("consultas"); pintarRecientes(); } });
  }
  function pintarRecientes() {
    const rec = u.$("#recientes"); if (!rec) return;
    rec.innerHTML = recientes(); enlazarRecientes();
  }
  function enlazarRecientes() {
    u.$$("#recientes [data-q]").forEach((b) => b.addEventListener("click", () => enviar(b.dataset.q)));
    u.$$("#recientes [data-quitar-q]").forEach((b) => b.addEventListener("click", () => {
      const c = (db.t.consultas || []).find((x) => x.id_consulta === b.dataset.quitarQ);
      if (c) ocultar([c], `Borraste «${c.texto}» del historial`);
    }));
    const todo = u.$("#btn-borrar-historial");
    if (todo) todo.addEventListener("click", () => { const l = visibles(); ocultar(l, `Historial borrado (${l.length} consulta${l.length === 1 ? "" : "s"})`); });
  }

  function bienvenida() {
    return `<div class="chat-bienvenida" id="bienvenida">
      <div class="sello">${I("cerebro", 32)}</div>
      <h2>¿Qué pieza te pidieron?</h2>
      <p>Escribe como te lo pidió el cliente: tipo de pieza, marca, medida, número que traiga o la unidad. Puedes adjuntar la foto que te mandó por WhatsApp.</p>
      <div class="sugerencias">${EJEMPLOS.map((e) => `<button type="button" data-ej="${u.esc(e)}">${u.esc(e)}</button>`).join("")}</div>
    </div>`;
  }

  function pintarAdjunto() {
    const cont = u.$("#adjunto"); if (!cont) return;
    cont.innerHTML = sesion.imagen ? `<div class="adjunto"><img src="${sesion.imagen}" alt=""><span>${u.esc(sesion.imagenNombre || "Foto")}</span><button class="btn-icono" id="quitar-foto" aria-label="Quitar foto">${I("x", 15)}</button></div>` : "";
    const q = u.$("#quitar-foto"); if (q) q.addEventListener("click", () => { sesion.imagen = null; pintarAdjunto(); });
  }

  function reducir(archivo, max) {
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", 0.82));
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(archivo);
    });
  }

  function enviar(texto) {
    if (!texto && !sesion.imagen) return;
    const chat = u.$("#chat"); if (!chat) return;
    const bien = u.$("#bienvenida"); if (bien) bien.remove();
    if (texto) Object.assign(sesion.contexto, detectarContexto(texto));
    const ctx = { ...sesion.contexto };
    const imagen = sesion.imagen;
    const consulta = texto || "Pieza en la foto";
    const ctxTxt = [ctx.id_cliente ? db.nombreCliente(ctx.id_cliente) : null, ctx.unidad_tipo ? ctx.unidad_tipo.toLowerCase() : null].filter(Boolean);
    const htmlUsuario = `<div class="msg-usuario">${u.esc(consulta)}${imagen ? `<img src="${imagen}" alt="Foto adjunta">` : ""}${ctxTxt.length ? `<div class="ctx">${ctxTxt.map((c) => `<span>${u.esc(c)}</span>`).join("")}</div>` : ""}</div>`;
    chat.insertAdjacentHTML("beforeend", htmlUsuario);
    sesion.mensajes.push({ html: htmlUsuario });
    pintarBarra();
    const pens = document.createElement("div"); pens.className = "msg-cerebro"; pens.innerHTML = `<div class="sello">${I("cerebro", 18)}</div><div class="pensando"><i></i><i></i><i></i></div>`;
    chat.appendChild(pens);
    u.$("#entrada").value = ""; u.$("#entrada").style.height = "auto";
    sesion.imagen = null; pintarAdjunto();
    pens.scrollIntoView({ behavior: "smooth", block: "end" });

    setTimeout(() => {
      const r = CRM.cerebro.consultar(consulta, ctx);
      const html = respuesta(r, ctx, !!imagen);
      pens.outerHTML = html;
      const nuevo = chat.lastElementChild;
      sesion.mensajes.push({ html });
      enlazarResultados(nuevo);
      u.$$(".traza li", nuevo).forEach((li, i) => setTimeout(() => li.classList.add("listo"), 140 * i));
      setTimeout(() => nuevo.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      /* Cada consulta queda registrada: también es conocimiento (qué piden y qué no encontramos). */
      db.t.consultas = db.t.consultas || [];
      db.t.consultas.push({ id_consulta: u.siguienteId(db.t.consultas, "id_consulta", "Q", 5), fecha: u.ahoraISO(), usuario: CRM.usuario().nombre, texto: consulta,
        id_cliente: ctx.id_cliente || null, unidad_tipo: ctx.unidad_tipo || null, con_imagen: !!imagen, imagen: imagen || null,
        abstencion: r.abstiene, candidatos: r.candidatos.map((c) => c.producto.id_producto), resultado: r.candidatos[0] ? r.candidatos[0].producto.descripcion_original : (r.pendientes[0] ? "Pendiente: " + r.pendientes[0].linea.descripcion_documento : null) });
      db.guardar("consultas");
      pintarRecientes();
    }, 650);
  }

  function marcar(texto, hits) {
    let t = u.esc(texto);
    const ts = [...new Set(hits.filter((h) => h.campo === "desc" || h.campo === "numero").map((h) => h.termino))].filter((x) => x.length > 1);
    for (const w of ts) {
      const re = new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&").split("").map((ch) => ch === "-" ? "-?" : ch).join("") + ")", "i");
      t = t.replace(re, "<mark>$1</mark>");
    }
    return t;
  }

  function respuesta(r, ctx, conImagen) {
    const it = r.interpretacion;
    const chips = [
      ...it.piezas.map((x) => `<span class="insignia marino">${I("pieza", 12)}${u.esc(x)}</span>`),
      ...it.marcas.map((x) => `<span class="insignia azul">${I("etiqueta", 12)}${u.esc(x)}</span>`),
      ...it.medidas.map((x) => `<span class="insignia borde">${u.esc(x)}</span>`),
      ...it.numeros.map((x) => `<span class="insignia ambar">${I("numeral", 12)}${u.esc(x)}</span>`),
    ].join("");
    const nCand = r.candidatos.length;
    const pasos = [
      `Interpreté la solicitud${it.marcas.length ? `; detecté marca ${it.marcas.join(", ")}` : ""}${it.numeros.length ? ` y número ${it.numeros.join(", ")}` : ""}.`,
      conImagen ? "Guardé la foto con la consulta. El análisis visual (forma, texto y número estampado) se activa en el MVP; esta demo usa la descripción escrita." : null,
      `Busqué en ${r.fuentes.productos} productos, ${r.fuentes.numeros} números de parte, ${r.fuentes.observaciones} observaciones técnicas y ${r.fuentes.documentos} documentos validados.`,
      `Crucé ${r.fuentes.cotizaciones} partidas cotizadas y ${r.fuentes.compras} compras para traer antecedentes.`,
      r.abstiene ? "No encontré evidencia suficiente para afirmar una pieza." : `Encontré ${nCand} candidato${nCand === 1 ? "" : "s"}${r.pendientes.length ? " y una solicitud real parecida sin artículo confirmado" : ""}.`,
    ].filter(Boolean);
    let html = `<div class="msg-cerebro"><div class="sello">${I("cerebro", 18)}</div><div class="cuerpo">
      <div class="traza">${chips ? `<div class="interpreta"><span>Entendí:</span>${chips}</div>` : ""}<ol>${pasos.map((p) => `<li>${I("check", 15)}<span>${p}</span></li>`).join("")}</ol></div>`;

    for (const p of r.pendientes.slice(0, 1)) html += tarjetaPendiente(p);
    if (r.abstiene) html += abstencion(r, ctx);
    r.candidatos.forEach((c, i) => { html += tarjetaCandidato(c, i, ctx); });
    html += `</div></div>`;
    return html;
  }

  function tarjetaPendiente(p) {
    const l = p.linea;
    return `<div class="candidato" style="border-color:#F0D49B">
      <div class="cand-cab"><div class="cand-img" style="color:var(--ambar)">${I("alerta", 26)}</div>
        <div class="cand-tit"><div class="rango">Solicitud real sin artículo confirmado</div><h3>${u.esc(l.descripcion_documento)}</h3>
          <div class="chips"><span class="insignia ambar">${u.esc(l.estado || "Pendiente de confirmar")}</span><a class="insignia borde" href="#/cotizaciones/${l.id_cotizacion}">${l.id_cotizacion} · ${u.mxn(l.precio_unitario)}</a></div></div>
        <div class="confianza conf-${(l.confianza || "baja").toLowerCase()}"><b>Confianza ${u.esc((l.confianza || "Baja").toLowerCase())}</b><div class="barrita"><i style="width:${l.confianza === "Alta" ? 90 : l.confianza === "Media" ? 60 : 30}%"></i></div></div></div>
      <div class="cand-cuerpo">
        <div><h4>${I("pieza", 13)}Candidato investigado</h4><dl class="dl"><dt>Fabricante</dt><dd>${u.esc(l.candidato_fabricante || "—")}</dd><dt>No. parte</dt><dd>${u.esc(l.candidato_numero_parte || "—")}</dd></dl><p class="mt-8" style="font-size:12px">${u.esc(l.candidato_descripcion || "")}</p></div>
        <div><h4>${I("enlace", 13)}Equivalencias candidatas</h4><p style="font-size:12px">${u.esc(l.equivalencias_candidatas || "—")}</p></div>
        <div><h4>${I("info", 13)}Nota</h4><p style="font-size:12px">${u.esc((l.nota || "").slice(0, 320))}${(l.nota || "").length > 320 ? "…" : ""}</p></div>
      </div>
      <div class="cand-pie"><span class="porque">No se debe afirmar como artículo del catálogo hasta que CARDIEL lo confirme.</span>${l.url ? `<a class="btn btn-sec btn-s" href="${u.esc(l.url)}" target="_blank" rel="noopener">${I("externo", 14)}Ver fuente</a>` : ""}</div>
    </div>`;
  }

  function abstencion(r, ctx) {
    const mensaje = `Hola, para identificar la pieza que necesitas (“${r.texto}”) ¿me ayudas con alguno de estos datos?\n${r.faltan.map((f) => "• " + f).join("\n")}\nSi puedes, mándame una foto de la pieza o del número que trae estampado. ¡Gracias!`;
    return `<div class="abstencion"><h3>${I("buscar", 18)}Necesito un dato más para identificarla</h3>
      <p class="mt-8" style="color:var(--texto-2)">Prefiero no adivinar. Con alguno de estos datos la encuentro:</p>
      <ul>${r.faltan.map((f) => `<li>${u.esc(f)}</li>`).join("")}</ul>
      ${r.cercanos.length ? `<p class="mt-16" style="font-size:12.5px;color:var(--texto-2)"><b style="color:var(--marino)">Parecidas en el catálogo</b> · sin confirmar</p><div class="cercanos">${r.cercanos.map((p) => `<a href="#/catalogo/${p.id_producto}">${u.esc(p.descripcion_original)}</a>`).join("")}</div>` : ""}
      <div class="acciones mt-16"><button class="btn btn-pri btn-s" data-copiar="${u.esc(mensaje)}">${I("copiar", 15)}Copiar mensaje para el cliente</button><button class="btn btn-sec btn-s" data-solicitud="${u.esc(r.texto)}" data-cli="${u.esc(ctx.id_cliente || "")}" data-uni="${u.esc(ctx.unidad_tipo || "")}">${I("bandeja", 15)}Registrar como solicitud por identificar</button></div></div>`;
  }

  function tarjetaCandidato(c, i, ctx) {
    const p = c.producto, a = c.antecedentes;
    const pct = Math.round(c.cobertura * 100);
    const porque = [...new Set(c.hits.map((h) => CRM.cerebro.ETIQUETA[h.campo]))];
    const precioRef = a.ultimaCliente || a.ultima;
    return `<div class="candidato ${i === 0 ? "top" : ""}">
      <div class="cand-cab">
        <div class="cand-img">${c.imagen ? `<img src="${u.esc(c.imagen)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createRange().createContextualFragment(CRM.icono('catalogo',26)))">` : I("catalogo", 26)}</div>
        <div class="cand-tit"><div class="rango">${i === 0 ? "Candidato principal" : "Alternativa " + i}</div>
          <h3>${marcar(p.descripcion_original, c.hits)}</h3>
          <div class="chips"><span class="insignia marino">CARDIEL ${u.esc(p.no_parte_cardiel || "—")}</span>${p.numero_parte_fabricante ? `<span class="insignia azul">${u.esc(p.fabricante || p.marca_comercial || "Fabricante")} ${u.esc(p.numero_parte_fabricante)}</span>` : `<span class="insignia rojo">Sin número de fabricante</span>`}<span class="insignia">${u.esc(p.segmento_origen || "")}</span>${c.otrosSegmentos.length ? `<span class="insignia borde">También en ${u.esc(c.otrosSegmentos.join(", "))}</span>` : ""}</div>
        </div>
        <div class="confianza conf-${c.confianza}"><b>Confianza ${c.confianza} · ${pct}%</b><div class="barrita"><i style="width:${pct}%"></i></div></div>
      </div>
      <div class="cand-cuerpo">
        <div><h4>${I("pieza", 13)}Datos técnicos</h4>
          <dl class="dl">${c.observaciones.slice(0, 4).map((o) => `<dt>${u.esc(o.tipo_dato.replace(/_/g, " "))}</dt><dd>${u.esc(o.valor)}${o.unidad ? " " + u.esc(o.unidad) : ""}</dd>`).join("") || ""}
          ${p.aplicacion ? `<dt>Aplicación</dt><dd>${u.esc(p.aplicacion)}</dd>` : ""}</dl>
          ${p.especificaciones ? `<p class="mt-8" style="font-size:12px;color:var(--texto-2)">${u.esc(p.especificaciones.slice(0, 220))}${p.especificaciones.length > 220 ? "…" : ""}</p>` : !c.observaciones.length && !p.aplicacion ? `<p class="tenue">Sin datos técnicos registrados todavía.</p>` : ""}
          ${c.equivalencias.length ? `<h4 class="mt-16">${I("enlace", 13)}Equivalencias</h4><div class="chips" style="display:flex;flex-wrap:wrap;gap:5px">${c.equivalencias.slice(0, 6).map((e) => `<span class="insignia borde" title="${u.esc(e.tipo)} · confianza ${u.esc(e.confianza || "")}">${u.esc(e.marca || "")} ${u.esc(e.numero)}</span>`).join("")}</div>` : ""}
        </div>
        <div><h4>${I("escudo", 13)}Evidencia</h4>
          <ul class="evidencia">${c.evidencia.map((e) => `<li>${I(e.origen === "CARDIEL" ? "base" : "documentos", 14)}<div>${e.url ? `<a href="${u.esc(e.url)}" target="_blank" rel="noopener">${u.esc(e.nombre)}</a>` : u.esc(e.nombre)}<small><span class="insignia ${e.origen === "CARDIEL" ? "marino" : e.origen === "Fabricante" ? "azul" : ""}" style="font-size:10px;padding:0 6px">${u.esc(e.origen)}</span> ${u.esc(e.ubicacion || "")} ${e.que ? "· " + u.esc(e.que) : ""}</small></div></li>`).join("") || `<li class="tenue">Sin fuente registrada.</li>`}</ul>
        </div>
        <div><h4>${I("historial", 13)}Antecedentes comerciales</h4>
          <dl class="dl dl-ancho">
            <dt>Cotizado</dt><dd>${a.vecesCotizado} veces · ${a.vecesGanado} ganadas</dd>
            ${precioRef ? `<dt>${a.ultimaCliente ? "Último a este cliente" : "Último precio"}</dt><dd>${u.mxn(precioRef.precio_unitario)} <span class="tenue" style="font-weight:500">· ${u.fFecha(precioRef.cot.fecha)} · <a href="#/cotizaciones/${precioRef.id_cotizacion}">${precioRef.id_cotizacion}</a></span></dd>` : ""}
            ${a.ultima && a.ultimaCliente && a.ultima !== a.ultimaCliente ? `<dt>Último general</dt><dd>${u.mxn(a.ultima.precio_unitario)} <span class="tenue" style="font-weight:500">· ${u.esc(db.nombreCliente(a.ultima.cot.id_cliente))}</span></dd>` : ""}
            ${p.precio_lista ? `<dt>Precio de lista</dt><dd>${u.mxn(p.precio_lista)}</dd>` : ""}
          </dl>
          <details class="interno"><summary>${I("candado", 14)}Proveedor y costo (interno) ${I("chev-abajo", 14)}</summary>
            <dl class="dl">${a.ultimaCompra ? `<dt>Último proveedor</dt><dd>${u.esc(db.nombreProveedor(a.ultimaCompra.oc.id_proveedor))}</dd><dt>Último costo</dt><dd>${u.mxn(a.ultimaCompra.costo_unitario)} <span class="tenue" style="font-weight:500">· ${u.fFecha(a.ultimaCompra.oc.fecha)}</span></dd>` : `<dt>Proveedor</dt><dd class="tenue">Sin compras registradas</dd>`}</dl>
          </details>
          <div class="advertencia">${I("alerta", 16)}<span>Precio y proveedor son históricos. Confirma precio vigente y disponibilidad antes de cotizar.</span></div>
        </div>
      </div>
      ${c.avisoPendiente ? `<div class="advertencia" style="margin:0 16px 12px">${I("info", 16)}<span>Hay una solicitud real parecida que no coincide con este artículo. Confirma con el cliente antes de cotizar.</span></div>` : ""}
      <div class="cand-pie"><span class="porque">Coincide por: ${porque.join(", ")}${c.notaContexto.length ? " · " + c.notaContexto.join(", ") : ""}</span>
        <a class="btn btn-sec btn-s" href="#/catalogo/${p.id_producto}">${I("ver", 15)}Ver ficha</a>
        <button class="btn btn-pri btn-s" data-precot="${p.id_producto}" data-cli="${u.esc(ctx.id_cliente || "")}" data-uni="${u.esc(ctx.unidad_tipo || "")}">${I("cotizacion", 15)}Crear pre-cotización</button>
      </div>
    </div>`;
  }

  function enlazarResultados(raiz) {
    u.$$("[data-ej]", raiz).forEach((b) => b.addEventListener("click", () => enviar(b.dataset.ej)));
    u.$$("[data-precot]", raiz).forEach((b) => b.addEventListener("click", () => {
      sessionStorage.setItem("cardiel_precot", JSON.stringify({ id_cliente: b.dataset.cli, unidad_tipo: b.dataset.uni, productos: [b.dataset.precot] }));
      CRM.ir("cotizaciones/nueva");
    }));
    u.$$("[data-copiar]", raiz).forEach((b) => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copiar); u.aviso("Mensaje copiado. Pégalo en WhatsApp o en el correo."); }
      catch (e) { u.modal({ titulo: "Mensaje para el cliente", ancho: 520, cuerpo: `<p class="texto-modal">Selecciónalo y cópialo:</p><textarea class="entrada mt-8" style="height:160px;padding:10px" readonly aria-label="Mensaje para el cliente">${u.esc(b.dataset.copiar)}</textarea>`, acciones: [{ texto: "Cerrar" }] }); }
    }));
    u.$$("[data-solicitud]", raiz).forEach((b) => b.addEventListener("click", () => {
      sessionStorage.setItem("cardiel_precot", JSON.stringify({ id_cliente: b.dataset.cli, unidad_tipo: b.dataset.uni, libre: b.dataset.solicitud, etapa: "solicitud" }));
      CRM.ir("cotizaciones/nueva");
    }));
  }
})(window.CRM);
