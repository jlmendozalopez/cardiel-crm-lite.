/* Gráficas SVG sencillas (sin librerías). */
(function (CRM) {
  "use strict";
  const u = CRM.u;
  const g = {};

  /* Columnas verticales con eje Y y etiquetas. datos: [{t, v, v2?}] */
  g.columnas = ({ datos, alto = 220, formato = u.mxnCorto, color = "#0F2747", color2 = "#2D7FF9", leyenda }) => {
    const W = 640, H = alto, ml = 52, mr = 10, mt = 14, mb = 28;
    const max = Math.max(1, ...datos.map((d) => Math.max(d.v || 0, d.v2 || 0)));
    const paso = escala(max);
    const tope = Math.ceil(max / paso) * paso;
    const ancho = (W - ml - mr) / datos.length;
    const y = (v) => mt + (H - mt - mb) * (1 - v / tope);
    let s = `<svg class="grafica-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" preserveAspectRatio="xMidYMid meet">`;
    for (let v = 0; v <= tope + 0.001; v += paso) {
      s += `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" stroke="#E6EAF0"/><text x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${formato(v)}</text>`;
    }
    const doble = datos.some((d) => d.v2 !== undefined);
    datos.forEach((d, i) => {
      const x0 = ml + i * ancho;
      const bw = Math.min(30, ancho * (doble ? 0.32 : 0.56));
      const cx = x0 + ancho / 2;
      const barra = (v, x, c) => v > 0 ? `<rect x="${x}" y="${y(v)}" width="${bw}" height="${Math.max(1, y(0) - y(v))}" rx="3" fill="${c}"><title>${u.esc(d.t)}: ${formato(v)}</title></rect>` : "";
      if (doble) { s += barra(d.v, cx - bw - 1, color) + barra(d.v2, cx + 1, color2); }
      else s += barra(d.v, cx - bw / 2, color);
      s += `<text x="${cx}" y="${H - 9}" text-anchor="middle">${u.esc(d.t)}</text>`;
    });
    s += "</svg>";
    if (leyenda) s += `<div style="display:flex;gap:16px;font-size:12px;color:var(--gris);margin-top:6px">${leyenda.map((l, i) => `<span style="display:flex;gap:6px;align-items:center"><i style="width:10px;height:10px;border-radius:3px;background:${i ? color2 : color}"></i>${u.esc(l)}</span>`).join("")}</div>`;
    return s;
  };

  function escala(max) {
    const crudo = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(crudo)));
    const n = crudo / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }

  /* Dona con porcentaje al centro. */
  g.dona = (pct, color = "#2D7FF9", tam = 120, texto) => {
    const r = 46, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, pct || 0));
    return `<svg viewBox="0 0 120 120" width="${tam}" height="${tam}" role="img"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#EDF0F5" stroke-width="12"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c * v} ${c}" transform="rotate(-90 60 60)"/>
      <text x="60" y="66" text-anchor="middle" font-size="20" font-weight="700" fill="#0F2747" font-family="Montserrat, sans-serif">${texto ?? Math.round(v * 100) + "%"}</text></svg>`;
  };

  CRM.graf = g;
})(window.CRM);
