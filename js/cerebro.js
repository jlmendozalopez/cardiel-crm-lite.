/* Cerebro Digital · motor SIMULADO de recuperación.
   Imita la salida que tendrá el RAG real del MVP (candidatos, evidencia, confianza, antecedentes, abstención)
   usando reglas + similitud de texto sobre los datos del CRM. Todo lo que se capture en el CRM
   (productos, números de parte, documentos validados, cotizaciones) entra al índice en la siguiente consulta. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db;

  const VACIAS = new Set(("de del la el los las para por con sin un una unos unas y o a en que necesito necesita busco buscamos pieza piezas cliente " +
    "pide pidio quiero me mi se su sus tengo tiene no numero num parte refaccion refacciones favor hola cotizar cotizacion cotiza dame tienes hay lo al es " +
    "cotizame cotizar pz pzs pza pieza como cual cuanto cuesta precio esta este esa ese mas muy son unidad tipo marca modelo nos le les solo").split(" "));

  const GRUPOS = [
    "ojillo ojo ojillos ojos lunette drawbar", "buje bujes bushing bushings", "trifuncional trifunsional", "patin patines landing gear pata patas",
    "papalote papalotes", "rotula rotulas terminal terminales", "balata balatas lining zapata zapatas", "tambor tambores drum drums",
    "filtro filtros filter", "bolsa bolsas fuelle fuelles airbag", "amortiguador amortiguadores shock", "embrague embragues clutch",
    "cofre hood", "faro faros headlight", "defensa defensas bumper", "parrilla grille", "bisagra bisagras hinge", "esquinero esquineros esquina esquinas esq",
    "gasket empaque empaques", "lodera loderas mudflap", "tope topes", "cadena cadenas", "gancho ganchos hook", "perno pernos pin", "rey king kingpin",
    "eje ejes axle", "puente puentes", "tanque tanques", "sensor sensores", "banda bandas belt", "soporte soportes", "bomba bombas",
    "toldo toldos techo", "lona lonas cortina cortinas", "puerta puertas", "cerrojo cerrojos chapa", "vara varas", "tornillo tornillos",
    "asiento asientos", "lamina laminas lam", "lainer liner", "deposito depositos", "anticongelante anticogelante refrigerante",
    "cascadia freightliner", "dd15 detroit", "direccional direccionales steer", "derecha derecho der rh", "izquierda izquierdo izq lh",
    "delantero delanteros delantera frontal", "trasero traseros trasera", "aire air", "linea lineas manguera mangueras", "kit juego",
    "aluminio alum", "refrigerado refrigerada thermo", "plataforma encortinada", "caja seca", "dolly dollys",
  ];
  const CANON = new Map();
  GRUPOS.forEach((g) => { const ws = g.split(" "); ws.forEach((w) => CANON.set(w, ws[0])); });

  const PESO = { desc: 1, numero: 1, marca: 0.85, cotizado: 0.75, documento: 0.75, tecnico: 0.6, segmento: 0.5, imagen: 0.4 };
  const ETIQUETA = { desc: "descripción", numero: "número de parte", marca: "marca", cotizado: "cotizaciones anteriores", documento: "documento validado", tecnico: "datos técnicos", segmento: "segmento", imagen: "foto" };

  function tokens(texto) {
    return u.norm(texto).replace(/(\d)\s*x\s*(\d)/g, "$1x$2").split(" ")
      .map((t) => t.replace(/^[\.\-\/]+|[\.\-\/]+$/g, "")).filter((t) => t && t.length > 1 || /\d/.test(t));
  }
  const canon = (t) => CANON.get(t) || t;

  let indice = null, versionIndice = -1;

  function construir() {
    const t = db.t, docs = new Map();
    const agregar = (idp, texto, campo) => {
      const d = docs.get(idp); if (!d) return;
      for (const tk of tokens(texto)) {
        if (VACIAS.has(tk)) continue;
        const c = canon(tk);
        const prev = d.tok.get(c);
        if (!prev || PESO[campo] > PESO[prev]) d.tok.set(c, campo);
      }
    };
    for (const p of t.productos) {
      if (p.activo === false) continue;
      docs.set(p.id_producto, { p, tok: new Map(), numeros: new Set() });
      agregar(p.id_producto, p.descripcion_original, "desc");
      agregar(p.id_producto, [p.no_parte_cardiel, p.numero_parte_fabricante].join(" "), "numero");
      agregar(p.id_producto, [p.marca_comercial, p.fabricante, p.marca_detectada].join(" "), "marca");
      agregar(p.id_producto, p.segmento_origen, "segmento");
      agregar(p.id_producto, [p.descripcion_tecnica, p.aplicacion, p.especificaciones].join(" "), "tecnico");
      [p.no_parte_cardiel, p.numero_parte_fabricante].forEach((n) => n && docs.get(p.id_producto).numeros.add(u.compacto(n)));
    }
    for (const o of t.observaciones) agregar(o.id_producto, `${o.valor || ""} ${o.texto_original || ""}`, "tecnico");
    for (const n of t.numeros_parte) {
      agregar(n.id_producto, `${n.numero_parte || ""}`, "numero");
      agregar(n.id_producto, `${n.marca || ""}`, "marca");
      agregar(n.id_producto, n.descripcion, "tecnico");
      const d = docs.get(n.id_producto); if (d && n.numero_parte) d.numeros.add(u.compacto(n.numero_parte));
    }
    for (const l of t.detalle_cotizacion) {
      if (!l.id_producto) continue;
      agregar(l.id_producto, l.descripcion_documento, "cotizado");
      const d = docs.get(l.id_producto); if (d && l.numero_parte_documento) d.numeros.add(u.compacto(l.numero_parte_documento));
    }
    for (const doc of t.documentos) {
      if (doc.estado !== "validado") continue;
      for (const idp of doc.productos || []) {
        agregar(idp, `${doc.nombre || ""} ${doc.descripcion || ""} ${doc.texto_clave || ""}`, "documento");
        const d = docs.get(idp);
        if (d) (String(doc.texto_clave || "").match(/[A-Z0-9][A-Z0-9\-\.]{3,}/gi) || []).filter((x) => /\d/.test(x)).forEach((x) => d.numeros.add(u.compacto(x)));
      }
    }
    for (const im of t.imagenes) agregar(im.id_producto, im.descripcion_imagen, "imagen");

    const df = new Map();
    for (const d of docs.values()) for (const k of d.tok.keys()) df.set(k, (df.get(k) || 0) + 1);
    const marcas = new Set();
    t.productos.forEach((p) => [p.marca_comercial, p.fabricante, p.marca_detectada].forEach((m) => m && tokens(m).forEach((x) => x.length > 2 && marcas.add(x))));
    ["utility", "gami", "wabash", "great", "dane", "baldwin", "fleetguard", "gabriel", "eaton", "bendix", "firestone", "kgi", "imt", "itec"].forEach((m) => marcas.add(m));
    indice = { docs, df, N: docs.size, marcas, vocab: new Set(df.keys()) };
    versionIndice = db.version;
  }

  function lematizar(t) {
    if (indice.vocab.has(t)) return t;
    if (t.endsWith("es") && indice.vocab.has(t.slice(0, -2))) return t.slice(0, -2);
    if (t.endsWith("s") && indice.vocab.has(t.slice(0, -1))) return t.slice(0, -1);
    return t;
  }

  function parecido(a, b) {
    if (a.length < 5 || b.length < 5 || /\d/.test(a) || /\d/.test(b)) return false;
    if (a.slice(0, 5) === b.slice(0, 5)) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, dif = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++dif > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return dif + (a.length - i) + (b.length - j) <= 1;
  }

  /* Interpreta la consulta: piezas, marcas, medidas y números de parte. */
  function interpretar(texto) {
    const crudos = tokens(texto).filter((x) => !VACIAS.has(x));
    const conceptos = [...new Set(crudos.map((x) => lematizar(canon(x))))];
    const numeros = [...new Set((String(texto).match(/[A-Za-z0-9][A-Za-z0-9\-\.]{2,}/g) || []).filter((x) => /\d/.test(x) && /[a-z\-]/i.test(x) || /^\d{4,}$/.test(x)).map(u.compacto).filter((x) => x.length >= 4))];
    const medidas = [...new Set((u.norm(texto).match(/\d+(?:[\.\-]\d+)?(?:\/\d+)?(?:\s?(?:in|mm|cm|mt|mts|lb|psi))?|\d+x\d+/g) || []).filter((m) => /[\/\.x]|in|mm|cm|mt|lb|psi/.test(m)))];
    const marcas = conceptos.filter((c) => indice.marcas.has(c) && !CANON.has(c));
    const piezas = conceptos.filter((c) => !marcas.includes(c) && !/\d/.test(c) && (indice.df.get(c) || 0) > 0);
    return { conceptos, numeros, medidas, marcas, piezas };
  }

  const SEGMENTO_UNIDAD = { TRACTO: ["Refacciones para tracto"], DOLLY: ["Dolly H"], REMOLQUE: ["Caja seca / refrigerada", "Plataforma encortinada / paletizada"] };

  /* Consulta principal. contexto: {id_cliente, unidad_tipo} */
  function consultar(texto, contexto = {}) {
    if (!indice || versionIndice !== db.version) construir();
    const inter = interpretar(texto);
    const Q = inter.conceptos.filter((c) => !/^cotiz/.test(c));
    /* Palabra que no aparece en ningún lado (ni parecida): pesa poco, suele ser ruido de la conversación. */
    const conocido = new Map(Q.map((c) => [c, indice.df.has(c) || [...indice.vocab].some((k) => parecido(c, k))]));
    const idf = (c) => Math.log(1 + indice.N / (indice.df.get(c) || 0.5)) * (conocido.get(c) === false ? 0.3 : 1);
    const totalPeso = u.suma(Q, idf) || 1;

    const res = [], debiles = [];
    for (const d of indice.docs.values()) {
      let s = 0; const hits = [];
      for (const q of Q) {
        let campo = d.tok.get(q), factor = 1, termino = q;
        if (!campo) {
          for (const [k, c] of d.tok) if (parecido(q, k)) { campo = c; factor = 0.6; termino = k; break; }
        }
        if (campo) { s += idf(q) * PESO[campo] * factor; hits.push({ q, termino, campo }); }
      }
      let cobertura = s / totalPeso;
      let pnExacto = null;
      for (const n of inter.numeros) {
        if (d.numeros.has(n)) { pnExacto = n; break; }
        if (n.length >= 5) for (const m of d.numeros) if (m.includes(n) || (m.length >= 5 && n.includes(m))) { cobertura = Math.max(cobertura, 0.55); hits.push({ q: n, termino: m, campo: "numero" }); break; }
      }
      if (pnExacto) cobertura = Math.max(cobertura, 0.97);
      if (!Q.length && !pnExacto && cobertura < 0.55) continue;
      /* Necesita al menos una coincidencia en lo que identifica la pieza; si no, solo es "cercano". */
      const especifico = pnExacto || hits.some((h) => ["desc", "numero", "documento"].includes(h.campo));
      if (!especifico) { if (cobertura >= 0.3) debiles.push({ producto: d.p, cobertura }); continue; }
      /* Desempate: prefiere la descripción que se parece más completa a lo pedido. */
      const descTok = tokens(d.p.descripcion_original).filter((x) => !VACIAS.has(x)).length || 1;
      const precision = Math.min(1, hits.filter((h) => h.campo === "desc").length / descTok);
      cobertura = cobertura * (0.88 + 0.12 * precision);
      if (pnExacto) cobertura = Math.max(cobertura, 0.95);
      let notaContexto = [];
      if (contexto.unidad_tipo && (SEGMENTO_UNIDAD[contexto.unidad_tipo] || []).includes(d.p.segmento_origen)) { cobertura += 0.04; notaContexto.push("coincide con el tipo de unidad"); }
      if (contexto.id_cliente && db.antecedentes(d.p.id_producto, contexto.id_cliente).delCliente.length) { cobertura += 0.05; notaContexto.push("este cliente ya lo ha pedido"); }
      if (cobertura >= 0.3) res.push({ producto: d.p, orden: cobertura, cobertura: Math.min(cobertura, 0.99), hits, pnExacto, notaContexto, matched: new Set(hits.map((h) => h.q)).size });
    }
    res.sort((a, b) => b.orden - a.orden || b.matched - a.matched);

    /* Mismo código CARDIEL en varios segmentos: se muestra una vez. */
    const vistos = new Map(), cand = [];
    for (const r of res) {
      const k = r.producto.no_parte_cardiel || r.producto.id_producto;
      if (vistos.has(k)) { vistos.get(k).otrosSegmentos.push(r.producto.segmento_origen); continue; }
      r.otrosSegmentos = []; vistos.set(k, r); cand.push(r);
    }
    const top = cand[0] ? cand[0].cobertura : 0;
    const candidatos = cand.filter((r) => r.cobertura >= Math.max(0.33, top * 0.6)).slice(0, 3).map((r) => enriquecer(r, contexto));
    candidatos.forEach((c) => {
      c.confianza = c.pnExacto || (c.cobertura >= 0.72 && c.matched >= Math.min(2, Q.length)) ? "alta" : c.cobertura >= 0.5 ? "media" : "baja";
    });

    /* Líneas reales que aún no tienen artículo: se proponen como pendientes de confirmar. */
    const pendientes = [];
    for (const l of db.t.lineas_sin_match) {
      if (l.estado && /resuelt|confirmad/i.test(l.estado)) continue;
      const tk = new Set(tokens(l.descripcion_documento).map((x) => lematizar(canon(x))));
      const s = u.suma(Q.filter((q) => tk.has(q)), idf) / totalPeso;
      const pn = inter.numeros.some((n) => u.compacto(l.candidato_numero_parte).includes(n));
      if (s >= 0.5 || pn) pendientes.push({ linea: l, cobertura: pn ? 0.9 : s });
    }
    pendientes.sort((a, b) => b.cobertura - a.cobertura);
    /* Si hay una solicitud real parecida sin artículo confirmado, no se afirma con confianza alta. */
    if (pendientes.length && pendientes[0].cobertura >= 0.8) candidatos.forEach((c) => { if (c.confianza === "alta" && !c.pnExacto) { c.confianza = "media"; c.avisoPendiente = true; } });

    const abstiene = !candidatos.length || (candidatos[0].confianza === "baja" && !pendientes.length && candidatos[0].cobertura < 0.4);
    const faltan = [];
    if (!inter.marcas.length) faltan.push("Marca o fabricante de la pieza (Hendrickson, Holland, Meritor, ITEC…)");
    if (!inter.numeros.length) faltan.push("Número estampado, de etiqueta o de la factura anterior");
    if (!inter.medidas.length) faltan.push("Medida principal (diámetro, largo, rosca, calibre)");
    if (!contexto.unidad_tipo) faltan.push("Tipo y modelo de la unidad (tracto Cascadia, dolly H, caja seca…)");
    faltan.push("Foto de la pieza completa y de su etiqueta o número");

    return {
      texto, interpretacion: inter, candidatos: abstiene ? [] : candidatos, pendientes, abstiene, faltan,
      fuentes: {
        productos: indice.N, numeros: db.t.numeros_parte.length, observaciones: db.t.observaciones.length,
        documentos: db.t.documentos.filter((d) => d.estado === "validado").length, cotizaciones: db.t.detalle_cotizacion.length, compras: db.t.detalle_compra.length,
      },
      cercanos: abstiene ? [...cand, ...debiles.sort((a, b) => b.cobertura - a.cobertura)].slice(0, 3).map((r) => r.producto) : [],
    };
  }

  function origenDe(idFuente) {
    const f = db.fuente(idFuente);
    if (!f) return { nombre: idFuente, origen: "—" };
    const tipo = /^F\d/.test(f.id_fuente) || f.propietario_origen === "CARDIEL" ? "CARDIEL" : /fabricante|oem|catalog|ficha/i.test(`${f.nombre_fuente} ${f.descripcion}`) ? "Fabricante" : "Web";
    return { nombre: f.nombre_fuente, origen: tipo, url: f.url_publica, fecha: f.fecha_documento };
  }

  function enriquecer(r, contexto) {
    const p = r.producto, ev = [];
    const vistos = new Set();
    const add = (e) => { const k = e.nombre + "|" + (e.ubicacion || ""); if (!vistos.has(k)) { vistos.add(k); ev.push(e); } };
    if (p.fuente_id) add({ ...origenDe(p.fuente_id), ubicacion: "Lista de productos", que: "Código CARDIEL y descripción" });
    for (const doc of db.t.documentos) if (doc.estado === "validado" && (doc.productos || []).includes(p.id_producto))
      add({ nombre: doc.nombre, origen: doc.origen, ubicacion: doc.pagina ? "pág. " + doc.pagina : null, que: doc.descripcion || "Documento validado", idDoc: doc.id_documento, ruta: doc.ruta, datos: doc.datos });
    for (const o of db.por("observaciones", "id_producto", p.id_producto)) add({ ...origenDe(o.fuente_id), ubicacion: o.ubicacion_fuente, que: `${o.tipo_dato.replace(/_/g, " ")}: ${o.valor}${o.unidad ? " " + o.unidad : ""}` });
    if (p.fuente_id_numero_parte) add({ ...origenDe(p.fuente_id_numero_parte), url: p.url_numero_parte || origenDe(p.fuente_id_numero_parte).url, ubicacion: null, que: "Número de parte del fabricante" });
    const orden = { CARDIEL: 0, Fabricante: 1, Distribuidor: 2, Web: 3 };
    ev.sort((a, b) => (orden[a.origen] ?? 4) - (orden[b.origen] ?? 4));

    const equivalencias = db.por("numeros_parte", "id_producto", p.id_producto).filter((n) => n.tipo_numero !== "CODIGO_CARDIEL")
      .map((n) => ({ numero: n.numero_parte, marca: n.marca, tipo: n.tipo_numero, confianza: n.nivel_confianza, url: n.url }));
    const obs = db.por("observaciones", "id_producto", p.id_producto);
    const img = db.por("imagenes", "id_producto", p.id_producto).sort((a, b) => (a.consecutivo || 9) - (b.consecutivo || 9))[0];
    return { ...r, evidencia: ev.slice(0, 6), equivalencias, observaciones: obs, imagen: p.foto || (img && img.url_imagen) || null, antecedentes: db.antecedentes(p.id_producto, contexto.id_cliente) };
  }

  /* Cliente y tipo de unidad mencionados en texto libre. frase: el texto con que se reconoció al cliente. */
  const UNIDADES = [
    ["DOLLY", /\bdolly\b/],
    ["REMOLQUE", /\b(remolque|caja seca|caja refrigerada|refrigerad[oa]|thermo|plataforma|encortinad[oa]|paletizad[oa]|semirremolque)\b/],
    ["TRACTO", /\b(tracto|tractocamion|cascadia|freightliner|kenworth|international|prostar|volvo|peterbilt|t680|t800|lt625)\b/],
  ];
  const clave = (n) => u.norm(n).replace(/\(.*?\)/g, "").replace(/[,\s]\s*s\.?\s*a\.?(\s*de\s*c\.?\s*v\.?)?\s*$/, "").replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();
  const nucleo = (k) => k.replace(/^(grupo|autotransportes de carga|autotransportes|transportes|fletes)\s+/, "");
  function contexto(texto) {
    const t = " " + u.norm(texto).replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ") + " ";
    const r = {};
    const uni = UNIDADES.find(([, re]) => re.test(t)); if (uni) r.unidad_tipo = uni[0];
    let mejor = null;
    for (const c of db.t.clientes) {
      if (c.activo === false || /publico en general/.test(u.norm(c.nombre_cliente))) continue;
      const k = clave(c.nombre_cliente);
      for (const p of new Set([k, nucleo(k)])) if (p.length >= 3 && t.includes(" " + p + " ") && (!mejor || p.length > mejor.frase.length)) mejor = { id: c.id_cliente, frase: p };
    }
    if (mejor) { r.id_cliente = mejor.id; r.frase = mejor.frase; }
    return r;
  }

  /* Separa un mensaje de WhatsApp o dictado en partidas con cantidad, e identifica cada una con el Cerebro. */
  const NUMEROS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, par: 2 };
  const PAL_NUM = Object.keys(NUMEROS).join("|");
  const RELLENO = new RegExp("\\b(hola|buen(o|a|os|as)?( dias?| tardes?| noches?)?|que tal|oye|amigo|disculpa|por favor|favor de|gracias|saludos|" +
    "me (puedes |podrias )?(cotizar|cotizas|pasas precio( de)?|apoyas con( precio de)?)|cotizame|cotizacion( de)?|cotizar|necesito|necesitamos|ocupo|ocupamos|" +
    "quiero|queremos|requiero|requerimos|busco|me urge|urgente|precio( de)?|cuanto cuesta(n)?|tienes|tienen|que me (mandes|envies)|mandame|enviame)\\b", "g");
  const SOLO_CONTEXTO = new Set(["tracto", "tractocamion", "dolly", "remolque", "caja", "seca", "refrigerada", "unidad", "unidades", "camion", "cascadia", "freightliner", "kenworth", "international", "volvo"]);
  function desglosar(texto, ctxBase = {}) {
    const ctx = contexto(texto);
    const quitaCliente = ctx.frase ? new RegExp(`\\b(es |son |seria )?(para |de |del |a )?(grupo |transportes |autotransportes( de carga)? |fletes )?${ctx.frase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g") : null;
    const trozos = String(texto).split(/[\n\r,;]+|\s+\+\s+/).flatMap((linea) => {
      let t = u.norm(linea);
      if (quitaCliente) t = t.replace(quitaCliente, " ");
      return t.replace(RELLENO, " ").split(new RegExp(`\\s+(?:y|e|mas|tambien|ademas|otra?s?)\\s+(?=(?:\\d{1,3}\\s|(?:${PAL_NUM})\\s))`));
    });
    const contexto2 = { ...ctxBase, ...(ctx.id_cliente ? { id_cliente: ctx.id_cliente } : {}), ...(ctx.unidad_tipo ? { unidad_tipo: ctx.unidad_tipo } : {}) };
    const partidas = [];
    for (let s of trozos) {
      s = (s || "").replace(/^[\s\-•*.·]+|[\s.]+$/g, "").replace(/^(y|e|mas|tambien|ademas)\s+/, "");
      let cantidad = 1, m;
      if ((m = s.match(new RegExp(`^(\\d{1,3}|${PAL_NUM})(?:\\s*x)?\\s+(?:de\\s+)?(?:(?:pzs?|pzas?|piezas?|juegos?|jgos?|kits?)\\s+(?:de\\s+)?)?`)))) {
        cantidad = NUMEROS[m[1]] || Number(m[1]); s = s.slice(m[0].length);
      }
      if ((m = s.match(/\s+(?:x\s?(\d{1,3})|\((\d{1,3})\s*(?:pzs?|piezas?)?\))$/))) { cantidad = Number(m[1] || m[2]); s = s.slice(0, m.index); }
      s = s.replace(/\b(es |son )?(para|de) (la |el |un |una )?$/, "").trim();
      const utiles = tokens(s).filter((w) => !VACIAS.has(w) && !SOLO_CONTEXTO.has(w));
      if (!utiles.length) continue;
      const r = consultar(s, contexto2);
      partidas.push({ texto: s, cantidad: cantidad > 0 ? cantidad : 1, candidatos: r.candidatos.map((c) => ({ producto: c.producto, confianza: c.confianza })), cercanos: r.cercanos || [] });
    }
    return { id_cliente: ctx.id_cliente || null, unidad_tipo: ctx.unidad_tipo || null, partidas };
  }

  CRM.cerebro = { consultar, ETIQUETA, tokens, origenDe, contexto, desglosar };
})(window.CRM);
