/* Inicio: lo que pide atención hoy y cómo va el mes. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};

  CRM.vistas.inicio = {
    render(cont) {
      const cots = db.t.cotizaciones;
      const hoy = u.hoy();
      const abiertas = cots.filter(db.abierta);
      const seguimiento = u.ordenar(cots.filter(db.requiereSeguimiento), (c) => u.dias(db.ultimaActividad(c)), true);
      const hace = (n) => u.iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - n));
      const ultimos90 = cots.filter((c) => c.fecha >= hace(90));
      const cerradas90 = ultimos90.filter((c) => ["ganada", "perdida", "sin_respuesta"].includes(c.etapa));
      const ganadas90 = cerradas90.filter((c) => c.etapa === "ganada");
      const anio = String(hoy.getFullYear());
      const ganadoAnio = u.suma(cots.filter((c) => c.etapa === "ganada" && (c.fecha || "").startsWith(anio)), db.totalCot);

      /* Últimos 12 meses: cotizado vs ganado */
      const meses = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const delMes = cots.filter((c) => (c.fecha || "").startsWith(k));
        meses.push({ t: u.MESES_C[d.getMonth()], v: u.suma(delMes, db.totalCot), v2: u.suma(delMes.filter((c) => c.etapa === "ganada"), db.totalCot) });
      }
      /* Motivos de pérdida (12 meses) */
      const perdidas = cots.filter((c) => c.etapa === "perdida" && c.fecha >= hace(365));
      const motivos = [...u.agrupar(perdidas, (c) => c.motivo_perdida || "Sin motivo registrado")].map(([k, v]) => ({ k, n: v.length })).sort((a, b) => b.n - a.n);
      const maxMot = Math.max(1, ...motivos.map((m) => m.n));
      /* Embudo de 90 días: cuántas llegaron al menos a cada fase. Perdidas y sin respuesta salen por un lado. */
      const llegaron = (...ids) => ultimos90.filter((c) => ids.includes(c.etapa));
      const fases = [
        { t: "Solicitudes", e: "solicitud", lista: ultimos90 },
        { t: "Cotizadas", e: "cotizada", lista: llegaron("cotizada", "seguimiento", "ganada", "perdida", "sin_respuesta") },
        { t: "Con seguimiento", e: "seguimiento", lista: llegaron("seguimiento", "ganada", "perdida", "sin_respuesta") },
        { t: "Ganadas", e: "ganada", lista: llegaron("ganada") },
      ];
      const anchoFase = fases.reduce((a, f, i) => {
        const proporcional = ultimos90.length ? (f.lista.length / ultimos90.length) * 100 : 0;
        return [...a, i ? Math.max(22, Math.min(a[i - 1] * 0.84, proporcional)) : 100];
      }, []);
      const salieron = { perdida: llegaron("perdida").length, sin_respuesta: llegaron("sin_respuesta").length };
      /* Lo de hoy pide acción; lo muy viejo se rescata o se cierra sin gritar en rojo. */
      const diasSin = (c) => u.dias(db.ultimaActividad(c));
      const rescatar = seguimiento.filter((c) => !c.proximo_seguimiento && diasSin(c) > 30);
      const deHoy = seguimiento.filter((c) => !rescatar.includes(c)).sort((a, b) => (b.proximo_seguimiento ? 1 : 0) - (a.proximo_seguimiento ? 1 : 0) || diasSin(b) - diasSin(a));
      const conEvidencia = (db.t.consultas || []).filter((c) => !c.abstencion).length;
      const atajos = [...new Set(u.ordenar((db.t.consultas || []).filter((c) => !c.oculta_atajo && !c.oculta), (c) => c.fecha, true).map((c) => c.texto))].slice(0, 3);
      /* Salud del conocimiento */
      const prods = db.t.productos.filter((p) => p.activo !== false);
      const comp = prods.map((p) => db.completitud(p).pct);
      const conNP = prods.filter((p) => p.numero_parte_fabricante).length;
      const docsPend = db.t.documentos.filter((d) => d.estado === "pendiente").length;
      const consultas = db.t.consultas || [];
      const act = u.ordenar(db.t.actividades, (a) => a.fecha + a.id_actividad, true).slice(0, 7);
      const us = CRM.usuario();
      const hora = new Date().getHours();

      /* Ficha mínima: quién y cuánto lleva esperando. El detalle vive en el modal. */
      const ficha = (c, calma) => {
        const cliente = db.nombreCliente(c.id_cliente);
        const espera = c.proximo_seguimiento
          ? { ico: "calendario", t: u.fFecha(c.proximo_seguimiento).replace(/ \d{4}$/, ""), largo: `programado el ${u.fFecha(c.proximo_seguimiento)}` }
          : { ico: "reloj", t: `${diasSin(c)} d`, largo: `${diasSin(c)} días sin movimiento` };
        return `<li><button type="button" class="ficha${calma ? " calma" : ""}" data-ficha="${c.id_cotizacion}" title="${u.esc(cliente)} · ${c.id_cotizacion}" aria-label="${u.esc(cliente)}, ${c.id_cotizacion}, ${espera.largo}. Ver detalle">
          <span class="ficha-sup"><span class="avatar s" aria-hidden="true">${u.esc(u.iniciales(cliente))}</span><span class="ficha-espera">${I(espera.ico, 14)}${espera.t}</span></span>
          <span class="ficha-nombre">${u.esc(cliente)}</span>
        </button></li>`;
      };

      cont.innerHTML = `
      <section class="saludo tarjeta" aria-labelledby="saludo-titulo">
        <div>
          <h1 id="saludo-titulo">${hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches"}, ${u.esc(us.nombre.split(" ")[0])}</h1>
          <p>${u.fFechaLarga(u.hoyISO())} · ${deHoy.length ? `${deHoy.length} seguimiento${deHoy.length === 1 ? "" : "s"} para hoy` : "Sin seguimientos urgentes hoy"}</p>
        </div>
        <div>
          <label class="pregunta-titulo" for="pregunta-inicio">¿Qué pieza te pidieron?</label>
          <form class="pregunta con-dictado" id="form-pregunta">
            ${I("cerebro", 20)}
            <input id="pregunta-inicio" data-dictado placeholder="Ej. buje trifuncional Hendrickson 7/8" autocomplete="off">
            <button class="btn btn-pri" type="submit">Consultar al Cerebro</button>
          </form>
        </div>
        ${atajos.length ? `<div class="atajos" aria-label="Consultas recientes">${atajos.map((t) => `<span class="atajo"><button type="button" data-preg="${u.esc(t)}">${u.esc(t)}</button><button type="button" class="quitar" data-quitar-atajo="${u.esc(t)}" aria-label="Quitar «${u.esc(t)}» de recientes" title="Quitar">${I("x", 13)}</button></span>`).join("")}</div>` : ""}
      </section>

      <div class="rejilla r-2-1 mt-16">
        <div class="tarjeta">
          <div class="tarjeta-cab"><h2 class="h3">Seguimiento de hoy</h2><a class="btn btn-texto btn-s" href="#/cotizaciones">Ver todas ${I("flecha", 15)}</a></div>
          ${deHoy.length ? `<ul class="fichas">${deHoy.slice(0, 8).map((c) => ficha(c)).join("")}</ul>${deHoy.length > 8 ? `<div class="pie-tarjeta">Y ${deHoy.length - 8} más en el tablero.</div>` : ""}`
            : `<div class="vacio">${I("check-circulo", 28)}Todo al día. Nadie espera respuesta hoy.</div>`}
        </div>
        <div class="tarjeta">
          <div class="tarjeta-cab"><h2 class="h3">Rescatar o cerrar</h2><span class="sub">más de 30 días</span></div>
          ${rescatar.length ? `<ul class="fichas">${rescatar.slice(0, 4).map((c) => ficha(c, true)).join("")}</ul>
            <div class="pie-tarjeta"><span>${rescatar.length > 4 ? `Y ${rescatar.length - 4} más.` : ""}</span><button class="btn btn-sec btn-s" id="btn-cerrar-viejas">Cerrar las ${rescatar.length}</button></div>`
            : `<div class="vacio">${I("check-circulo", 28)}Nada pendiente de cerrar.</div>`}
        </div>
      </div>

      <div class="seccion-titulo"><h2>Cómo va el negocio</h2><span>MXN antes de IVA</span></div>
      <div class="tarjeta negocio">
        ${stat("Cotizaciones abiertas", abiertas.length, u.mxnCorto(u.suma(abiertas, db.totalCot)) + " en juego")}
        ${stat("Tasa de cierre · 90 días", cerradas90.length ? u.pct(ganadas90.length / cerradas90.length) : "—", `${ganadas90.length} ganadas de ${cerradas90.length} cerradas`)}
        ${stat("Ganado en " + anio, u.mxnCorto(ganadoAnio), "Cotizaciones ganadas")}
        ${stat("Consultas al Cerebro", consultas.length, consultas.length ? `${u.pct(conEvidencia / consultas.length)} con evidencia` : "Aún sin consultas")}
      </div>

      <div class="rejilla r-2-1 mt-16">
        <div class="tarjeta">
          <div class="tarjeta-cab"><h3>Cotizado y ganado · 12 meses</h3></div>
          <div class="tarjeta-cuerpo">${CRM.graf.columnas({ datos: meses, leyenda: ["Cotizado", "Ganado"], color: "#C9D4E5", color2: "#0F2747" })}</div>
        </div>
        <div class="tarjeta">
          <div class="tarjeta-cab"><h3>Embudo · últimos 90 días</h3></div>
          <div class="tarjeta-cuerpo">
            <ol class="embudo" aria-label="Embudo de cotizaciones de los últimos 90 días">${fases.map((f, i) => {
              const a = anchoFase[i], b = i < fases.length - 1 ? anchoFase[i + 1] : a * 0.78;
              const paso = i && fases[i - 1].lista.length ? u.pct(f.lista.length / fases[i - 1].lista.length) + " avanzan" : "Entraron";
              return `<li class="fase">
                <div class="forma" style="--e:var(--e-${f.e});clip-path:polygon(${50 - a / 2}% 0,${50 + a / 2}% 0,${50 + b / 2}% 100%,${50 - b / 2}% 100%)"><b>${f.lista.length}</b></div>
                <div class="fase-dato"><span>${f.t}</span><small>${paso} · ${u.mxnCorto(u.suma(f.lista, db.totalCot))}</small></div>
              </li>`;
            }).join("")}</ol>
            <p class="embudo-salidas">Salieron: <span class="insignia etapa-perdida">${salieron.perdida} perdidas</span><span class="insignia etapa-sin_respuesta">${salieron.sin_respuesta} sin respuesta</span></p>
          </div>
        </div>
      </div>

      <div class="rejilla r-3 mt-16">
        <div class="tarjeta">
          <div class="tarjeta-cab"><h3>Por qué se pierden</h3><span class="sub">12 meses · ${perdidas.length}</span></div>
          <div class="tarjeta-cuerpo"><div class="barras-h">${motivos.length ? motivos.map((m) => `<div class="barra-h"><div class="fila"><b>${u.esc(m.k)}</b><span>${m.n}</span></div><div class="pista"><i style="width:${(m.n / maxMot) * 100}%"></i></div></div>`).join("") : `<p class="tenue">Sin cotizaciones perdidas.</p>`}</div></div>
        </div>
        <div class="tarjeta">
          <div class="tarjeta-cab"><h3>Conocimiento del Cerebro</h3><a class="btn btn-texto btn-s" href="#/catalogo">Catálogo ${I("flecha", 15)}</a></div>
          <div class="tarjeta-cuerpo" style="display:flex;gap:18px;align-items:center">
            ${CRM.graf.dona(u.suma(comp, (x) => x) / (comp.length || 1), "#2D7FF9", 110)}
            <div class="medidor" style="flex:1">
              <div class="fila"><span>Productos activos</span><b>${prods.length}</b></div>
              <div class="fila"><span>Con número de fabricante</span><b>${conNP}</b></div>
              <div class="fila"><span>Documentos validados</span><b>${db.t.documentos.filter((d) => d.estado === "validado").length}</b></div>
              <div class="fila"><span>Por validar</span><b style="color:${docsPend ? "var(--rojo)" : "inherit"}">${docsPend}</b></div>
            </div>
          </div>
          <p class="tenue" style="padding:0 18px 16px;font-size:12px">Completitud promedio de las fichas: número de parte, marca, datos técnicos, aplicación, foto y fuente.</p>
        </div>
        <div class="tarjeta">
          <div class="tarjeta-cab"><h3>Actividad reciente</h3></div>
          <ul class="actividad">${act.map((a) => `<li><span class="marca-act ${a.tipo === "ganada" ? "verde" : a.tipo === "perdida" ? "rojo" : a.tipo === "cerebro" ? "azul" : ""}">${I(a.tipo === "ganada" ? "check" : a.tipo === "perdida" ? "x" : a.tipo === "nota" ? "nota" : a.tipo === "cerebro" ? "cerebro" : a.tipo === "documento" ? "documentos" : "cotizacion", 15)}</span>
            <div><b>${u.esc(a.texto)}</b><small>${a.id_cotizacion ? `<a href="#/cotizaciones/${a.id_cotizacion}">${a.id_cotizacion}</a> · ` : ""}${u.esc(a.id_cliente ? db.nombreCliente(a.id_cliente) : "")} · ${u.relativo(a.fecha)}</small></div></li>`).join("")}</ul>
        </div>
      </div>`;

      u.$("#form-pregunta").addEventListener("submit", (e) => { e.preventDefault(); const q = u.$("#pregunta-inicio").value.trim(); if (q) CRM.preguntar(q); else u.$("#pregunta-inicio").focus(); });
      u.$$("[data-preg]").forEach((b) => b.addEventListener("click", () => CRM.preguntar(b.dataset.preg)));
      const repintar = () => { if (u.$(".saludo")) this.render(cont); };
      u.$$("[data-quitar-atajo]").forEach((b) => b.addEventListener("click", () => {
        const texto = b.dataset.quitarAtajo;
        const marcadas = (db.t.consultas || []).filter((c) => c.texto === texto && !c.oculta_atajo);
        marcadas.forEach((c) => (c.oculta_atajo = true));
        db.guardar("consultas"); repintar();
        u.aviso(`Quitaste «${texto}» de recientes`, "ok", { texto: "Deshacer", fn: () => { marcadas.forEach((c) => delete c.oculta_atajo); db.guardar("consultas"); repintar(); } });
      }));
      u.$$("[data-ficha]").forEach((b) => b.addEventListener("click", () => {
        const c = db.cotizacion(b.dataset.ficha);
        detalle(c, rescatar.includes(c), { repintar, cerrar: (lista) => cerrarSinRespuesta(lista, repintar) });
      }));
      const bc = u.$("#btn-cerrar-viejas");
      if (bc) bc.addEventListener("click", async () => {
        const n = rescatar.length;
        if (!(await u.confirmar(`Cerrar ${n} cotizaciones viejas`, `Pasarán a «Sin respuesta» porque llevan más de 30 días sin movimiento. Si algún cliente vuelve, la reabres desde su cotización.`, `Marcar ${n} sin respuesta`))) return;
        cerrarSinRespuesta(rescatar, repintar);
      });
    },
  };

  /* Pasa cotizaciones a «Sin respuesta» con opción de deshacer (incluye borrar las notas que se agregaron). */
  function cerrarSinRespuesta(lista, repintar) {
    const previas = lista.map((c) => ({ c, etapa: c.etapa, prox: c.proximo_seguimiento }));
    const desde = db.t.actividades.length;
    lista.forEach((c) => { c.etapa = "sin_respuesta"; c.proximo_seguimiento = null; db.registrarActividad({ tipo: "nota", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente, texto: "Cerrada sin respuesta (más de 30 días)" }); });
    const notas = new Set(db.t.actividades.slice(desde));
    db.guardar("cotizaciones"); CRM.refrescarMenu(); repintar();
    const n = lista.length;
    u.aviso(n === 1 ? `${lista[0].id_cotizacion} pasó a Sin respuesta` : `${n} cotizaciones pasaron a Sin respuesta`, "ok", { texto: "Deshacer", fn: () => {
      previas.forEach((p) => { p.c.etapa = p.etapa; p.c.proximo_seguimiento = p.prox; });
      for (let i = db.t.actividades.length - 1; i >= 0; i--) if (notas.has(db.t.actividades[i])) db.t.actividades.splice(i, 1);
      db.cambio(); db.guardar("actividades"); db.guardar("cotizaciones"); CRM.refrescarMenu(); repintar();
      u.aviso(n === 1 ? "Listo, se reabrió" : "Listo, se reabrieron");
    } });
  }

  /* Mensaje de seguimiento listo para WhatsApp. */
  function mensajeSeguimiento(c) {
    const l = db.lineasCot(c.id_cotizacion);
    const pieza = l[0] ? l[0].descripcion_documento.toLowerCase() + (l.length > 1 ? ` y ${l.length - 1} partida${l.length > 2 ? "s" : ""} más` : "") : "las refacciones que nos pidió";
    const saludo = c.atencion && !/^(publico|mostrador)/i.test(c.atencion) ? `Hola, ${c.atencion.split(" ")[0]}` : "Hola";
    return `${saludo}, buen día. Le escribo de CARDIEL por la cotización ${c.id_cotizacion} de ${pieza}, por ${u.mxn(db.totalCot(c))} más IVA. ¿Tuvieron oportunidad de revisarla? Si necesitan ajustar precio, marca o cantidades, con gusto lo vemos. Saludos, ${CRM.usuario().nombre.split(" ")[0]}.`;
  }

  /* Detalle de una ficha de seguimiento: aquí sí se ven todos los datos y las acciones. */
  function detalle(c, esRescate, { repintar, cerrar }) {
    if (!c) return;
    const l = db.lineasCot(c.id_cotizacion);
    const d = u.dias(db.ultimaActividad(c));
    const contacto = db.por("contactos", "id_cliente", c.id_cliente).find((x) => x.telefono);
    const tel = contacto ? contacto.telefono.replace(/\D/g, "") : "";
    const wa = tel ? `https://wa.me/${tel.length === 10 ? "52" + tel : tel}?text=${encodeURIComponent(mensajeSeguimiento(c))}` : "";
    const dato = (ico, etiqueta, valor, extra = "") => `<li><span class="ico-dato">${I(ico, 17)}</span><div><small>${etiqueta}</small><b>${valor}</b>${extra}</div></li>`;
    const m = u.modal({
      titulo: db.nombreCliente(c.id_cliente), ancho: 520,
      cuerpo: `<ul class="detalle-ficha">
        ${dato("cotizacion", "Cotización", `${c.id_cotizacion} · ${u.fFecha(c.fecha)}`, ` <a href="#/cotizaciones/${c.id_cotizacion}" data-abrir>Abrir ${I("flecha", 13)}</a>`)}
        ${dato("pieza", l.length === 1 ? "Qué pidió" : `Qué pidió · ${l.length} partidas`, u.esc(l[0] ? l[0].descripcion_documento : "Sin partidas"), l.length > 1 ? `<span>${l.slice(1, 3).map((x) => u.esc(x.descripcion_documento)).join(" · ")}${l.length > 3 ? " · …" : ""}</span>` : "")}
        ${dato("dinero", "Total sin IVA", u.mxn(db.totalCot(c)))}
        ${dato(c.proximo_seguimiento ? "calendario" : "reloj", c.proximo_seguimiento ? "Seguimiento programado" : "Sin movimiento", c.proximo_seguimiento ? u.fFecha(c.proximo_seguimiento) : `${d} días`, `<span>Último movimiento ${u.relativo(db.ultimaActividad(c))}</span>`)}
        ${c.atencion || contacto ? dato("usuario", "Atención", u.esc(c.atencion || contacto.nombre), contacto ? `<span><a href="tel:${u.esc(contacto.telefono)}">${u.esc(contacto.telefono)}</a></span>` : "") : ""}
      </ul>
      <div class="detalle-mensaje"><button type="button" class="btn btn-sec btn-s" data-copiar-msj>${I("copiar", 15)}Copiar mensaje de seguimiento</button>${wa ? `<a class="btn btn-sec btn-s" href="${wa}" target="_blank" rel="noopener">${I("externo", 15)}Abrir WhatsApp</a>` : ""}</div>`,
      acciones: [
        esRescate ? { texto: "Marcar sin respuesta", fn: () => cerrar([c]) } : { texto: "Cerrar" },
        { texto: "Registrar seguimiento", clase: "btn-pri", icono: "nota", fn: () => { setTimeout(() => CRM.seguimiento(c.id_cotizacion, repintar), 180); } },
      ],
    });
    u.$("[data-copiar-msj]", m.el).addEventListener("click", () => u.copiar(mensajeSeguimiento(c), "Mensaje copiado. Pégalo en WhatsApp."));
    u.$("[data-abrir]", m.el).addEventListener("click", () => m.cerrar());
  }

  function stat(titulo, valor, sub) {
    return `<div class="stat"><small>${titulo}</small><b>${valor}</b><span>${sub}</span></div>`;
  }

  /* Ventana para registrar un seguimiento (se usa en Inicio, tablero y editor). */
  CRM.seguimiento = (idCot, alTerminar) => {
    const c = db.cotizacion(idCot);
    if (!c) return;
    u.modal({
      titulo: `Seguimiento · ${c.id_cotizacion} · ${db.nombreCliente(c.id_cliente)}`, ancho: 560,
      cuerpo: `<div class="campos">
        <div class="campo c-12"><label>¿Qué pasó?</label><textarea name="texto" data-dictado placeholder="Ej. Llamé a compras; esperan autorización de OC el viernes."></textarea></div>
        <div class="campo"><label>Nueva etapa</label><select name="etapa">${u.opciones(db.ETAPAS.map((e) => ({ v: e.id, t: e.t })), c.etapa === "cotizada" ? "seguimiento" : c.etapa)}</select></div>
        <div class="campo"><label>Próximo seguimiento</label><input type="date" name="proximo" value="${u.iso(new Date(Date.now() + 3 * 864e5))}"></div>
        <div class="campo c-12 oculto" id="campo-motivo"><label>Motivo de pérdida</label>${u.motivos("motivo", c.motivo_perdida)}</div>
      </div>`,
      alAbrir: (m) => {
        const sel = u.$("[name=etapa]", m);
        const ver = () => u.$("#campo-motivo", m).classList.toggle("oculto", sel.value !== "perdida");
        sel.addEventListener("change", ver); ver();
        u.ligarMotivos(m);
      },
      acciones: [{ texto: "Cancelar" }, { texto: "Guardar seguimiento", clase: "btn-pri", icono: "check", fn: (m) => {
        const f = u.leerForm(m);
        if (f.etapa === "perdida" && !f.motivo) { u.aviso("Indica el motivo de pérdida", "error"); return false; }
        const antes = c.etapa;
        c.etapa = f.etapa;
        c.motivo_perdida = f.etapa === "perdida" ? f.motivo : null;
        c.proximo_seguimiento = db.etapa(f.etapa).abierta ? f.proximo : null;
        db.registrarActividad({ tipo: f.etapa === "ganada" ? "ganada" : f.etapa === "perdida" ? "perdida" : "nota", id_cotizacion: c.id_cotizacion, id_cliente: c.id_cliente,
          texto: f.texto || (antes !== f.etapa ? `Cambió a ${db.etapa(f.etapa).t}` : "Seguimiento registrado") + (f.etapa === "perdida" ? ` (${f.motivo})` : "") });
        db.guardar("cotizaciones");
        u.aviso("Seguimiento guardado");
        CRM.refrescarMenu();
        if (alTerminar) alTerminar();
      } }],
    });
  };
})(window.CRM);
