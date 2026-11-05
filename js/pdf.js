/* Cotización en PDF con el formato de CARDIEL (carta, una o más páginas). Usa jsPDF incluido en vendor/. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db;
  const MARINO = [15, 39, 71], ROJO = [195, 27, 27], GRIS = [107, 114, 128], LINEA = [150, 156, 166];
  const COL = { it: [14, 24], cant: [24, 40], desc: [40, 132], mat: [132, 152], mo: [152, 168], tot: [168, 202] };
  const ALTO_FILA = 4.6, MIN_FILAS = 14;

  function encabezado(doc, cot, cfg) {
    const L = window.CARDIEL_LOGO;
    if (L) doc.addImage(L.src, "PNG", 14, 11, 64, 64 * L.h / L.w);
    const cx = 160;
    doc.setFont("times", "bold"); doc.setFontSize(13.5);
    const razon = doc.splitTextToSize(cfg.razon_social || "", 80);
    razon.forEach((t, i) => doc.text(t, cx, 15 + i * 5.2, { align: "center" }));
    let y = 15 + razon.length * 5.2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.6);
    doc.text(cfg.direccion_1 || "", cx, y, { align: "center" }); y += 3.4;
    doc.setFontSize(7); doc.text(cfg.direccion_2 || "", cx, y, { align: "center" }); y += 3.6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.6); doc.text(cfg.rfc || "", cx, y, { align: "center" }); y += 3.3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(cfg.telefono || "", cx, y, { align: "center" });
  }

  function barraColumnas(doc, y) {
    doc.setDrawColor(...MARINO); doc.setLineWidth(0.25); doc.setLineDashPattern([1.2, 0.8], 0);
    doc.rect(14, y, 188, 10);
    [COL.cant[0], COL.desc[0], COL.mat[0], COL.mo[0], COL.tot[0]].forEach((x) => doc.line(x, y, x, y + 10));
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "bold"); doc.setTextColor(0);
    const c = (r, t, tam) => { doc.setFontSize(tam); doc.text(t, (r[0] + r[1]) / 2, y + 6.3, { align: "center" }); };
    c(COL.it, "IT", 8); c(COL.cant, "CANTIDAD", 7.4); c(COL.desc, "DESCRIPCION Y DETALLE DE ACTIVIDADES", 8.4);
    c(COL.mat, "MATERIALES", 6.8); c(COL.mo, "M.O.", 8.4); c(COL.tot, "TOTAL POR ACTIVIDAD", 8);
    return y + 13;
  }

  function cuadricula(doc, y, alto) {
    doc.setDrawColor(...LINEA); doc.setLineWidth(0.15);
    doc.rect(14, y, 188, alto);
    [COL.cant[0], COL.desc[0], COL.mat[0], COL.mo[0], COL.tot[0]].forEach((x) => doc.line(x, y, x, y + alto));
  }

  function generar(cot, lineas) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const cfg = db.config();
    const cli = db.cliente(cot.id_cliente) || {};
    const iva = cfg.iva ?? 0.16;

    encabezado(doc, cot, cfg);

    /* Folio */
    doc.setFillColor(...MARINO); doc.roundedRect(150, 40.5, 52, 7, 1.2, 1.2, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(`COTIZACIÓN  ${cot.id_cotizacion}`, 176, 45.2, { align: "center" });
    doc.setTextColor(0);

    /* Cliente / fecha */
    let y = 52;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.6);
    doc.text((cli.nombre_cliente || "").toUpperCase(), 14, y);
    doc.setFontSize(6.8);
    doc.text(`NO DE PROVEEDOR: ${cot.no_proveedor_cliente ?? cli.no_proveedor ?? ""}`, 14, y + 3.4);
    doc.text(`BASE: ${cot.base || ""}`, 14, y + 6.8);
    doc.text(`${cfg.lugar_emision || ""} a ${u.fFechaLarga(cot.fecha)}`, 202, y, { align: "right" });
    doc.text(`At'n: ${cot.atencion || ""}`, 202, y + 7.5, { align: "right" });

    y += 13;
    doc.setFontSize(6.9);
    const apertura = doc.splitTextToSize(cfg.texto_apertura || "", 188);
    doc.text(apertura, 14, y); y += apertura.length * 3.2 + 2.5;

    /* Recuadro de la unidad */
    const ux = 133, uw = 69, ul = 25, uh = 3.9;
    const filasU = [["UNIDAD TIPO", cot.unidad_tipo || "REFACCION"], ["MARCA", cot.unidad_marca], ["NO. ECO", cot.no_economico], ["NO. SERIE.", cot.no_serie], ["PLACAS", cot.placas]];
    doc.setDrawColor(...LINEA); doc.setLineWidth(0.15);
    filasU.forEach((f, i) => {
      const yy = y + i * uh;
      doc.rect(ux, yy, ul, uh); doc.rect(ux + ul, yy, uw - ul, uh);
      doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); doc.text(f[0], ux + ul / 2, yy + 2.8, { align: "center" });
      doc.setFont("helvetica", i === 0 ? "bold" : "normal"); doc.setFontSize(6.2); doc.text(String(f[1] ?? ""), ux + ul + (uw - ul) / 2, yy + 2.8, { align: "center" });
    });
    y += filasU.length * uh + 4;

    /* Partidas (con salto de página si hace falta) */
    const filas = [];
    filas.push({ titulo: (cot.unidad_tipo || "REFACCION").toUpperCase() });
    lineas.forEach((l, i) => {
      const np = l.numero_parte_documento || l.numero_parte_catalogo;
      let texto = (l.descripcion_documento || "").toUpperCase();
      if (np && !u.compacto(texto).includes(u.compacto(np))) texto += `  ·  No. PARTE ${np}`;
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.6);
      const partes = doc.splitTextToSize(texto, COL.desc[1] - COL.desc[0] - 3);
      filas.push({ it: i + 1, l, partes, alto: Math.max(ALTO_FILA, partes.length * 2.9 + 1.7) });
    });
    while (filas.length < MIN_FILAS) filas.push({});

    const subtotal = u.suma(lineas, (l) => l.subtotal);
    const ivaMonto = Math.round(subtotal * iva * 100) / 100;
    const pieAlto = 92; // totales + leyendas + firma
    y = barraColumnas(doc, y);
    let yTabla = y;
    const cerrarTabla = (hasta) => cuadricula(doc, yTabla, hasta - yTabla);

    for (const f of filas) {
      const alto = f.alto || ALTO_FILA;
      if (y + alto > 279.4 - 18 - (f === filas[filas.length - 1] ? pieAlto : 0) && f.l) {
        cerrarTabla(y); pie(doc, cot);
        doc.addPage(); encabezado(doc, cot, cfg); y = barraColumnas(doc, 44); yTabla = y;
      }
      doc.setDrawColor(...LINEA); doc.setLineWidth(0.15); doc.line(14, y + alto, 202, y + alto);
      if (f.titulo) { doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); doc.text(f.titulo, (COL.desc[0] + COL.desc[1]) / 2, y + 3.2, { align: "center" }); }
      if (f.l) {
        const yb = y + 3.3;
        doc.setFont("helvetica", "bold"); doc.setFontSize(6.6);
        doc.text(String(f.it), (COL.it[0] + COL.it[1]) / 2, yb, { align: "center" });
        doc.text(u.num(f.l.cantidad), (COL.cant[0] + COL.cant[1]) / 2, yb, { align: "center" });
        doc.text(f.partes, COL.desc[0] + 1.5, yb);
        doc.setFont("helvetica", "normal");
        doc.text(fmt(f.l.materiales ?? f.l.precio_unitario), COL.mat[1] - 1.5, yb, { align: "right" });
        if (Number(f.l.mano_obra)) doc.text(fmt(f.l.mano_obra), COL.mo[1] - 1.5, yb, { align: "right" });
        doc.setFont("helvetica", "bolditalic");
        doc.text(fmt(f.l.subtotal), COL.tot[1] - 1.5, yb, { align: "right" });
      }
      y += alto;
    }
    if (y + pieAlto > 279.4 - 12) { cerrarTabla(y); pie(doc, cot); doc.addPage(); encabezado(doc, cot, cfg); y = 44; yTabla = y; }
    /* Totales */
    const tot = [["SUBTOTAL", subtotal, false], [`I.V.A. ${Math.round(iva * 100)}%`, ivaMonto, false], ["TOTAL", subtotal + ivaMonto, true]];
    tot.forEach((t) => {
      doc.setDrawColor(...LINEA); doc.line(COL.mat[0], y + 5.6, 202, y + 5.6);
      doc.setFont("helvetica", "bolditalic"); doc.setFontSize(t[2] ? 9 : 7.4);
      doc.text(t[0], COL.mo[1] - 1.5, y + 4.2, { align: "right" });
      doc.setFontSize(t[2] ? 11 : 8);
      doc.text(fmt(t[1]), COL.tot[1] - 1.5, y + 4.2, { align: "right" });
      y += 5.6;
    });
    cerrarTabla(y - 5.6 * 3);
    doc.setDrawColor(...LINEA); doc.rect(COL.mat[0], y - 5.6 * 3, 202 - COL.mat[0], 5.6 * 3);
    doc.line(COL.tot[0], y - 5.6 * 3, COL.tot[0], y);

    /* Leyendas */
    y += 5;
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.9); doc.setTextColor(0);
    doc.text(doc.splitTextToSize(cfg.leyenda_imss || "", 150), 40, y); y += 9;
    doc.setFontSize(6.6); doc.text(cfg.leyenda_precios || "", 108, y, { align: "center" }); y += 4;
    doc.setFontSize(8.6); doc.text(cfg.leyenda_iva || "", 108, y, { align: "center" }); y += 7;
    doc.setFont("helvetica", "bolditalic"); doc.setFontSize(7); doc.text("ASPECTOS COMERCIALES", 108, y, { align: "center" }); y += 4.4;
    const ac = [["TIEMPO DE ENTREGA:", cot.tiempo_entrega, ROJO, "bold"], ["CONDICIONES DE PAGO:", cot.condiciones_pago, [0, 0, 0], "bold"],
      ["FORMA DE PAGO:", cot.forma_pago, [0, 0, 0], "normal"], ["VIGENCIA DE COTIZACIÓN:", cot.vigencia, [0, 0, 0], "normal"]];
    ac.forEach((a) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor(0); doc.text(a[0], 40, y);
      doc.setFont("helvetica", a[3]); doc.setTextColor(...a[2]);
      const v = doc.splitTextToSize(String(a[1] || ""), 84); doc.text(v, 118, y); y += Math.max(3.4, v.length * 3);
    });
    doc.setTextColor(0); y += 3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.text(cfg.cierre || "", 108, y, { align: "center" }); y += 7;
    doc.setFont("helvetica", "bold"); doc.text("ATENTAMENTE", 108, y, { align: "center" }); y += 7;
    [cot.elaboro, cot.autorizo, cfg.firma_area, ...(cfg.firma_telefonos || []).map((t) => "TEL: " + t)].filter(Boolean).forEach((t) => {
      doc.text(String(t), 108, y, { align: "center" }); y += 3.1;
    });
    pie(doc, cot);
    return doc;
  }

  function pie(doc, cot) {
    const n = doc.getNumberOfPages();
    doc.setDrawColor(...MARINO); doc.setLineWidth(0.3); doc.line(14, 268, 202, 268);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...GRIS);
    doc.text(`${cot.id_cotizacion} · ${db.nombreCliente(cot.id_cliente)}`, 14, 272);
    doc.text(`Página ${n}`, 202, 272, { align: "right" });
    doc.setTextColor(0);
  }

  const fmt = (v) => (v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  CRM.pdf = {
    cotizacion(cot, accion = "descargar", mensaje) {
      if (!window.jspdf) { u.aviso("No se cargó el generador de PDF (vendor/jspdf.umd.min.js).", "error"); return; }
      const lineas = db.lineasCot(cot.id_cotizacion);
      const doc = generar(cot, lineas);
      const nombre = `${cot.id_cotizacion}_${u.compacto(db.nombreCliente(cot.id_cliente)).slice(0, 24)}.pdf`;
      if (accion === "ver") { const url = doc.output("bloburl"); window.open(url, "_blank"); }
      else u.entregar(nombre, doc.output("blob"), mensaje || `PDF de ${cot.id_cotizacion} descargado.`);
      return nombre;
    },
  };
})(window.CRM);
