/* Excel (.xlsx) con el formato de CARDIEL: logo, título, encabezado marino, pesos y fechas con formato,
   filtros y encabezado fijo. Se arma a mano (ZIP sin compresión) para no depender de librerías. */
(function (CRM) {
  "use strict";
  const u = CRM.u;
  const enc = new TextEncoder();
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  /* ── ZIP (método store) ── */
  const TABLA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(archivos) {
    const partes = [], central = []; let offset = 0;
    for (const [nombre, datos] of archivos) {
      const n = enc.encode(nombre), d = typeof datos === "string" ? enc.encode(datos) : datos, crc = crc32(d);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
      partes.push(new Uint8Array(h.buffer), n, d);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, n.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), n);
      offset += 30 + n.length + d.length;
    }
    const tam = central.reduce((s, x) => s + x.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tam, true); fin.setUint32(16, offset, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  const letra = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const serial = (iso) => { const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5 : null; };

  /* Estilos: 0 normal · 1 título · 2 subtítulo · 3 encabezado · 4 texto · 5 pesos · 6 número · 7 fecha · 8 etiqueta total · 9 pesos total · 10 número total */
  const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="5"><font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="15"/><color rgb="FF0F2747"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FF0F2747"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0F2747"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEDF4FF"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>
<border><left/><right/><top style="medium"><color rgb="FF0F2747"/></top><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="3" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const ESTILO_TIPO = { texto: 4, mxn: 5, num: 6, fecha: 7 };

  /* spec: { archivo, hoja, titulo, subtitulo, columnas: [{ t, w, tipo, total }], filas: [[...]] } */
  function libro(spec) {
    const cols = spec.columnas, F0 = 7; // fila del encabezado de la tabla (1-based)
    const celda = (ref, v, estilo) => {
      if (v === null || v === undefined || v === "") return `<c r="${ref}" s="${estilo}"/>`;
      if (typeof v === "number" && isFinite(v)) return `<c r="${ref}" s="${estilo}"><v>${v}</v></c>`;
      return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    };
    const filas = [];
    filas.push(`<row r="5" ht="22" customHeight="1">${celda("A5", spec.titulo, 1)}</row>`);
    filas.push(`<row r="6">${celda("A6", spec.subtitulo || "", 2)}</row>`);
    filas.push(`<row r="${F0}" ht="22" customHeight="1">${cols.map((c, i) => celda(letra(i) + F0, c.t, 3)).join("")}</row>`);
    spec.filas.forEach((f, k) => {
      const r = F0 + 1 + k;
      filas.push(`<row r="${r}">${cols.map((c, i) => {
        let v = f[i];
        if (c.tipo === "fecha") v = serial(v) ?? v;
        if ((c.tipo === "mxn" || c.tipo === "num") && v !== null && v !== "" && v !== undefined) v = Number(v);
        return celda(letra(i) + r, v, ESTILO_TIPO[c.tipo] || 4);
      }).join("")}</row>`);
    });
    const ultima = F0 + spec.filas.length;
    if (cols.some((c) => c.total) && spec.filas.length) {
      const r = ultima + 1;
      filas.push(`<row r="${r}" ht="20" customHeight="1">${cols.map((c, i) => {
        const ref = letra(i) + r;
        if (i === 0) return celda(ref, "Total", 8);
        if (c.total) return `<c r="${ref}" s="${c.tipo === "mxn" ? 9 : 10}"><f>SUBTOTAL(9,${letra(i)}${F0 + 1}:${letra(i)}${ultima})</f></c>`;
        return `<c r="${ref}" s="8"/>`;
      }).join("")}</row>`);
    }
    const anchoCols = cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(c.w || 14, c.t.length * 1.1) + 3}" customWidth="1"/>`).join("");
    const rango = `A${F0}:${letra(cols.length - 1)}${Math.max(ultima, F0 + 1)}`;
    const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${F0}" topLeftCell="A${F0 + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/><cols>${anchoCols}</cols>
<sheetData>${filas.join("")}</sheetData>
<autoFilter ref="${rango}"/>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;L${esc(spec.titulo)}&amp;RPágina &amp;P de &amp;N</oddFooter></headerFooter>
<ignoredErrors><ignoredError sqref="A1:${letra(cols.length - 1)}${ultima + 2}" numberStoredAsText="1"/></ignoredErrors>
${window.CARDIEL_LOGO ? '<drawing r:id="rId1"/>' : ""}
</worksheet>`;

    const archivos = [];
    const L = window.CARDIEL_LOGO;
    archivos.push(["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${L ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}</Types>`]);
    archivos.push(["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`]);
    archivos.push(["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc((spec.hoja || "Datos").slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${esc((spec.hoja || "Datos").slice(0, 31))}'!$A$${F0}:$${letra(cols.length - 1)}$${Math.max(ultima, F0 + 1)}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'${esc((spec.hoja || "Datos").slice(0, 31))}'!$${F0}:$${F0}</definedName></definedNames></workbook>`]);
    archivos.push(["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
    archivos.push(["xl/styles.xml", ESTILOS]);
    archivos.push(["xl/worksheets/sheet1.xml", hoja]);
    if (L) {
      const alto = 52, ancho = Math.round(alto * L.w / L.h), EMU = 9525;
      archivos.push(["xl/worksheets/_rels/sheet1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`]);
      archivos.push(["xl/drawings/drawing1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>76200</xdr:rowOff></xdr:from><xdr:ext cx="${ancho * EMU}" cy="${alto * EMU}"/>
<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo CARDIEL"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${ancho * EMU}" cy="${alto * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`]);
      archivos.push(["xl/drawings/_rels/drawing1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>`]);
      const b64 = L.src.split(",")[1], bin = atob(b64), png = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) png[i] = bin.charCodeAt(i);
      archivos.push(["xl/media/logo.png", png]);
    }
    return zip(archivos);
  }

  CRM.excel = (spec) => {
    const blob = libro(spec);
    u.entregar(spec.archivo, blob, `${spec.titulo} descargado en Excel.`);
    return blob;
  };
})(window.CRM);
