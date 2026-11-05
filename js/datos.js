/* Almacén de datos del CRM-lite (sin servidor).
   - Carpeta conectada (Chrome / Edge): lee y escribe directo los archivos data/<tabla>.json
     con la API de acceso a archivos del navegador. Se conecta una vez; el navegador recuerda la carpeta.
   - Sin carpeta conectada: arranca con data/semilla.js y guarda en este navegador hasta que la conectes. */
window.CRM = window.CRM || {};
(function (CRM) {
  "use strict";
  const u = CRM.u;
  const CLAVE_LOCAL = "cardiel_crm_lite_v1";
  const TABLAS = ["productos", "clientes", "cotizaciones", "detalle_cotizacion", "proveedores", "compras", "detalle_compra",
    "fuentes", "observaciones", "numeros_parte", "lineas_sin_match", "imagenes", "unidades", "contactos", "actividades",
    "documentos", "usuarios", "config", "consultas"];

  const db = { modo: "navegador", t: {}, carpeta: null, carpetaGuardada: false, soportaCarpeta: "showDirectoryPicker" in window };

  /* ── Recordar la carpeta entre sesiones (IndexedDB guarda el permiso del navegador) ── */
  function idb(accion, valor) {
    return new Promise((ok) => {
      try {
        const r = indexedDB.open("cardiel_crm_lite", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("k");
        r.onerror = () => ok(null);
        r.onsuccess = () => {
          const tx = r.result.transaction("k", accion === "get" ? "readonly" : "readwrite");
          const st = tx.objectStore("k");
          const q = accion === "get" ? st.get("carpeta") : accion === "del" ? st.delete("carpeta") : st.put(valor, "carpeta");
          q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null);
        };
      } catch (e) { ok(null); }
    });
  }

  async function leerCarpeta(dir) {
    const t = {};
    for (const n of TABLAS) {
      try { const f = await (await dir.getFileHandle(n + ".json")).getFile(); t[n] = JSON.parse(await f.text()); } catch (e) { /* tabla que aún no existe */ }
    }
    return t;
  }

  async function escribirTabla(dir, n) {
    const h = await dir.getFileHandle(n + ".json", { create: true });
    const w = await h.createWritable();
    await w.write(JSON.stringify(db.t[n], null, 1));
    await w.close();
  }

  db.cargar = async function () {
    let guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || "null"); } catch (e) { guardado = null; }
    db.t = guardado || JSON.parse(JSON.stringify(window.CARDIEL_SEMILLA || {}));
    db.modo = "navegador";
    completar();
    if (!db.soportaCarpeta) return;
    const h = await idb("get");
    if (!h) return;
    db.carpetaGuardada = true;
    try {
      if ((await h.queryPermission({ mode: "readwrite" })) === "granted") await usarCarpeta(h, false);
      else db.carpetaPendiente = h;
    } catch (e) { /* permiso no disponible: se pide con clic */ }
  };

  /* Conecta la carpeta data/. Si ya tiene JSON, manda la carpeta; si está vacía, se llena con lo actual. */
  async function usarCarpeta(dir, nueva) {
    const t = await leerCarpeta(dir);
    db.carpeta = dir; db.modo = "carpeta"; db.carpetaPendiente = null;
    if (Array.isArray(t.productos) && Array.isArray(t.cotizaciones)) { db.t = t; completar(); db.version++; }
    else { completar(); for (const n of TABLAS) await escribirTabla(dir, n); }
    if (nueva) await idb("put", dir);
  }

  db.conectarCarpeta = async function () {
    if (!db.soportaCarpeta) throw new Error("Este navegador no permite guardar en carpetas. Abre el portal en Chrome o Edge.");
    if (db.carpetaPendiente) {
      if ((await db.carpetaPendiente.requestPermission({ mode: "readwrite" })) === "granted") { await usarCarpeta(db.carpetaPendiente, false); return db.carpeta.name; }
    }
    const dir = await window.showDirectoryPicker({ id: "cardiel-data", mode: "readwrite" });
    if (dir.name !== "data") {
      const ok = await u.confirmar("¿Es la carpeta correcta?", `Elegiste la carpeta «${dir.name}». Los datos del portal viven en la carpeta «data» que está junto a index.html. ¿Usar «${dir.name}» de todos modos?`, "Usar esta carpeta");
      if (!ok) return null;
    }
    await usarCarpeta(dir, true);
    return dir.name;
  };
  /* Para pruebas o integraciones: conectar un handle ya obtenido. */
  db._usarHandle = (dir) => usarCarpeta(dir, false);

  function completar() {
    for (const n of TABLAS) if (db.t[n] === undefined) db.t[n] = n === "config" ? {} : [];
  }

  const pendientes = new Set();
  let temporizador = null;
  /* Marca una tabla como modificada; se escribe en su JSON (o en el navegador) enseguida. */
  db.guardar = function (...tablas) {
    tablas.forEach((t) => pendientes.add(t));
    db.version++;
    clearTimeout(temporizador);
    temporizador = setTimeout(escribir, 120);
  };

  async function escribir() {
    const lista = [...pendientes]; pendientes.clear();
    estado("guardando");
    try {
      if (db.modo === "carpeta") { for (const t of lista) await escribirTabla(db.carpeta, t); }
      else localStorage.setItem(CLAVE_LOCAL, JSON.stringify(db.t));
      estado("ok");
    } catch (e) {
      console.error(e);
      estado("error");
      u.aviso(e.name === "QuotaExceededError" ? "El navegador se quedó sin espacio. Conecta la carpeta data o exporta un respaldo." : "No se pudo guardar: " + e.message, "error");
    }
  }

  function estado(s) {
    const el = document.getElementById("estado-guardado");
    if (!el) return;
    el.dataset.estado = db.modo === "carpeta" ? s : s === "ok" ? "local" : s;
    el.querySelector("span").textContent = s === "guardando" ? "Guardando…" : s === "error" ? "Error al guardar" :
      "Cambios guardados";
    const b = document.getElementById("btn-carpeta");
    if (b && b.lastElementChild) b.lastElementChild.textContent = db.carpetaPendiente ? "Reconectar carpeta data" : "Conectar carpeta data";
  }
  db.pintarEstado = () => estado("ok");

  /* Archivos subidos: con carpeta van a data/documentos/; sin carpeta, dentro del JSON del navegador. */
  db.subirArchivo = async function (archivo, nombreDestino) {
    const nombre = String(nombreDestino).replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 120);
    if (db.modo === "carpeta") {
      const docs = await db.carpeta.getDirectoryHandle("documentos", { create: true });
      const w = await (await docs.getFileHandle(nombre, { create: true })).createWritable();
      await w.write(archivo); await w.close();
      return { ruta: "data/documentos/" + nombre, datos: null };
    }
    if (archivo.size > 1.5 * 1024 * 1024) throw new Error("Sin la carpeta data conectada el límite es 1.5 MB por archivo. Conéctala en Configuración.");
    return { ruta: null, datos: await u.leerArchivo(archivo) };
  };

  db.exportar = () => u.descargar(`CARDIEL_CRM_respaldo_${u.hoyISO()}.json`, JSON.stringify(db.t, null, 1));
  db.importar = async function (archivo) {
    const texto = await archivo.text();
    const j = JSON.parse(texto);
    if (!j || !Array.isArray(j.productos) || !Array.isArray(j.cotizaciones)) throw new Error("El archivo no es un respaldo del CRM-lite.");
    db.t = j; completar();
    db.guardar(...TABLAS);
  };
  db.reiniciar = function () {
    db.t = JSON.parse(JSON.stringify(window.CARDIEL_SEMILLA));
    completar();
    db.guardar(...TABLAS);
  };

  /* ── Consultas de dominio ──────────────────────────────────────────── */
  const idx = {};
  db.por = function (tabla, campo, valor) {
    const k = tabla + "|" + campo;
    if (!idx[k] || idx[k].n !== db.t[tabla].length || idx[k].v !== db.version) {
      const m = new Map();
      for (const r of db.t[tabla]) { const key = r[campo]; if (!m.has(key)) m.set(key, []); m.get(key).push(r); }
      idx[k] = { n: db.t[tabla].length, v: db.version, m };
    }
    return idx[k].m.get(valor) || [];
  };
  db.version = 0;
  db.cambio = () => { db.version++; };
  db.uno = (tabla, campo, valor) => db.t[tabla].find((r) => r[campo] === valor) || null;

  db.cliente = (id) => db.uno("clientes", "id_cliente", id);
  db.producto = (id) => db.uno("productos", "id_producto", id);
  db.proveedor = (id) => db.uno("proveedores", "id_proveedor", id);
  db.cotizacion = (id) => db.uno("cotizaciones", "id_cotizacion", id);
  db.fuente = (id) => db.uno("fuentes", "id_fuente", id);
  db.nombreCliente = (id) => (db.cliente(id) || {}).nombre_cliente || "Sin cliente";
  db.nombreProveedor = (id) => (db.proveedor(id) || {}).nombre_proveedor || "—";
  db.config = () => db.t.config || {};
  db.cat = (n) => (db.config().catalogos || {})[n] || [];

  db.lineasCot = (id) => db.por("detalle_cotizacion", "id_cotizacion", id);
  db.totalCot = (c) => c.total_sin_iva ?? u.suma(db.lineasCot(c.id_cotizacion), (l) => l.subtotal);

  db.ETAPAS = [
    { id: "solicitud", t: "Solicitud", abierta: true },
    { id: "cotizada", t: "Cotizada", abierta: true },
    { id: "seguimiento", t: "En seguimiento", abierta: true },
    { id: "ganada", t: "Ganada" },
    { id: "perdida", t: "Perdida" },
    { id: "sin_respuesta", t: "Sin respuesta" },
  ];
  db.etapa = (id) => db.ETAPAS.find((e) => e.id === id) || db.ETAPAS[1];
  db.abierta = (c) => !!db.etapa(c.etapa).abierta;

  db.ultimaActividad = (c) => {
    const a = db.por("actividades", "id_cotizacion", c.id_cotizacion);
    return a.reduce((m, x) => (x.fecha > m ? x.fecha : m), c.fecha || "");
  };
  /* Una cotización abierta pide seguimiento si su fecha programada ya llegó o si lleva N días sin movimiento. */
  db.requiereSeguimiento = (c) => {
    if (!db.abierta(c)) return false;
    if (c.proximo_seguimiento) return u.dias(c.proximo_seguimiento) >= 0;
    return u.dias(db.ultimaActividad(c)) >= (db.config().dias_alerta_seguimiento || 3);
  };

  db.statsCliente = (id) => {
    const cots = db.por("cotizaciones", "id_cliente", id);
    const g = cots.filter((c) => c.etapa === "ganada"), cerradas = cots.filter((c) => ["ganada", "perdida", "sin_respuesta"].includes(c.etapa));
    return {
      cotizaciones: cots.length, cotizado: u.suma(cots, db.totalCot), ganado: u.suma(g, db.totalCot), ganadas: g.length,
      cierre: cerradas.length ? g.length / cerradas.length : null, abiertas: cots.filter(db.abierta).length,
      ultima: cots.reduce((m, c) => (c.fecha > m ? c.fecha : m), ""),
    };
  };

  /* Antecedentes comerciales de un producto: lo cotizado y lo comprado. */
  db.antecedentes = (idProducto, idCliente) => {
    const lineas = db.por("detalle_cotizacion", "id_producto", idProducto).map((l) => ({ ...l, cot: db.cotizacion(l.id_cotizacion) }))
      .filter((l) => l.cot).sort((a, b) => (b.cot.fecha || "").localeCompare(a.cot.fecha || ""));
    const compras = db.por("detalle_compra", "id_producto", idProducto).map((l) => ({ ...l, oc: db.uno("compras", "id_compra", l.id_compra) }))
      .filter((l) => l.oc).sort((a, b) => (b.oc.fecha || "").localeCompare(a.oc.fecha || ""));
    const delCliente = idCliente ? lineas.filter((l) => l.cot.id_cliente === idCliente) : [];
    const ganadas = lineas.filter((l) => l.cot.etapa === "ganada");
    return { lineas, compras, delCliente, ultima: lineas[0] || null, ultimaCliente: delCliente[0] || null, ultimaCompra: compras[0] || null,
      vecesCotizado: lineas.length, vecesGanado: ganadas.length };
  };

  /* Qué tan completa está la ficha de un producto (para saber qué falta conseguir). */
  db.completitud = (p) => {
    const obs = db.por("observaciones", "id_producto", p.id_producto);
    const docs = db.t.documentos.filter((d) => d.estado === "validado" && (d.productos || []).includes(p.id_producto));
    const items = [
      { t: "Número de parte del fabricante", ok: !!p.numero_parte_fabricante },
      { t: "Marca o fabricante", ok: !!(p.fabricante || p.marca_comercial || p.marca_detectada) },
      { t: "Especificaciones o datos técnicos", ok: !!(p.especificaciones || p.descripcion_tecnica || obs.length) },
      { t: "Aplicación (unidad / modelo)", ok: !!(p.aplicacion || obs.some((o) => o.tipo_dato === "aplicacion")) },
      { t: "Fotografía", ok: (p.num_imagenes || 0) > 0 || !!p.foto },
      { t: "Documento fuente validado", ok: !!p.fuente_id_numero_parte || docs.length > 0 },
    ];
    return { items, pct: items.filter((i) => i.ok).length / items.length };
  };

  /* Los catálogos crecen con el uso: lo que se escribe nuevo queda disponible la siguiente vez. */
  db.aprender = (cat, valor) => {
    const v = String(valor || "").trim();
    if (!v) return false;
    db.t.config = db.t.config || {};
    const cats = (db.t.config.catalogos = db.t.config.catalogos || {});
    const lista = (cats[cat] = cats[cat] || []);
    if (lista.some((x) => u.norm(x) === u.norm(v))) return false;
    lista.push(v);
    db.guardar("config");
    return true;
  };
  CRM.aprender = db.aprender;

  /* Alta rápida desde una lista buscable: basta el nombre; el resto se completa desde la ficha cuando haga falta. */
  CRM.crearValor = (tipo, texto) => {
    const nombre = String(texto || "").trim();
    if (!nombre) return null;
    if (tipo === "cliente") {
      const r = { id_cliente: u.siguienteId(db.t.clientes, "id_cliente", "C", 3), activo: true, nombre_cliente: nombre };
      db.t.clientes.push(r); db.cambio(); db.guardar("clientes");
      u.aviso(`Cliente «${nombre}» agregado. Completa sus datos desde su ficha cuando haga falta.`);
      return { v: r.id_cliente, t: nombre };
    }
    if (tipo === "proveedor") {
      const r = { id_proveedor: u.siguienteId(db.t.proveedores, "id_proveedor", "PR", 3), nombre_proveedor: nombre };
      db.t.proveedores.push(r); db.cambio(); db.guardar("proveedores");
      u.aviso(`Proveedor «${nombre}» agregado.`);
      return { v: r.id_proveedor, t: nombre };
    }
    if (tipo.startsWith("cat:")) { db.aprender(tipo.slice(4), nombre); return { v: nombre, t: nombre }; }
    return null;
  };

  db.registrarActividad = (a) => {
    db.t.actividades.push({ id_actividad: u.siguienteId(db.t.actividades, "id_actividad", "A", 5), fecha: u.hoyISO(), usuario: CRM.usuario().nombre, ...a });
    db.cambio();
    db.guardar("actividades");
  };

  CRM.db = db;
})(window.CRM);
