/* Configuración: datos de la empresa para el PDF, usuarios y respaldo de datos. */
(function (CRM) {
  "use strict";
  const u = CRM.u, db = CRM.db, I = CRM.icono;
  CRM.vistas = CRM.vistas || {};

  /* Listas que crecen con el uso. donde: campos de registros que guardan ese texto (se corrigen al renombrar). */
  const LISTAS = [
    { id: "motivo_perdida", t: "Motivos de pérdida", donde: [["cotizaciones", "motivo_perdida"]] },
    { id: "tiempo_entrega", t: "Tiempos de entrega", donde: [["cotizaciones", "tiempo_entrega"]] },
    { id: "condiciones_pago", t: "Condiciones de pago", donde: [["cotizaciones", "condiciones_pago"], ["clientes", "condiciones_pago"]] },
    { id: "forma_pago", t: "Formas de pago", donde: [["cotizaciones", "forma_pago"]] },
    { id: "vigencia", t: "Vigencias", donde: [["cotizaciones", "vigencia"]] },
    { id: "tipo_cliente", t: "Tipos de cliente", donde: [["clientes", "tipo_cliente"]] },
    { id: "segmentos", t: "Segmentos del catálogo", donde: [["productos", "segmento_origen"]],
      fijos: ["Caja seca / refrigerada", "Dolly H", "Plataforma encortinada / paletizada", "Refacciones para tracto"] },
  ];
  let listaActual = "motivo_perdida";

  function usos(def, valor) {
    return u.suma(def.donde, ([t, campo]) => (db.t[t] || []).filter((r) => r[campo] === valor).length);
  }

  function pintarListas() {
    const zona = u.$("#listas"); if (!zona) return;
    const def = LISTAS.find((l) => l.id === listaActual);
    const valores = db.cat(def.id);
    zona.innerHTML = `<div class="listas-nav" role="tablist" aria-label="Listas">${LISTAS.map((l) => `<button type="button" role="tab" class="${l.id === def.id ? "activo" : ""}" aria-selected="${l.id === def.id}" data-lista="${l.id}">${u.esc(l.t)}<span>${db.cat(l.id).length}</span></button>`).join("")}</div>
      <div class="listas-panel">
        <ul class="valores">${valores.map((v, i) => {
          const n = usos(def, v), fijo = (def.fijos || []).includes(v);
          return `<li data-i="${i}"><span class="valor">${u.esc(v)}</span><small>${n ? `${n} ${n === 1 ? "registro" : "registros"}` : "sin usar"}</small>
            ${fijo ? `<span class="fijo" title="Lo usa el Cerebro para relacionar piezas con el tipo de unidad">${I("candado", 14)}</span>` : `<button type="button" class="btn-icono" data-editar="${i}" aria-label="Corregir «${u.esc(v)}»" title="Corregir">${I("editar", 15)}</button>
            <button type="button" class="btn-icono" data-quitar="${i}" aria-label="Quitar «${u.esc(v)}»" title="Quitar de la lista">${I("x", 15)}</button>`}</li>`;
        }).join("") || `<li class="tenue">Lista vacía.</li>`}</ul>
        <form class="valores-agregar" id="form-valor"><input class="entrada" id="nuevo-valor" placeholder="Agregar a «${u.esc(def.t.toLowerCase())}»…" aria-label="Nuevo valor"><button class="btn btn-sec btn-s" type="submit">${I("mas", 15)}Agregar</button></form>
        <p class="tenue valores-ayuda">Corregir un valor también lo cambia en los registros que lo usan. Si lo corriges a uno que ya existe, se juntan. Quitar solo lo saca de las sugerencias; los registros conservan su texto.</p>
      </div>`;
    u.$$("[data-lista]", zona).forEach((b) => b.addEventListener("click", () => { listaActual = b.dataset.lista; pintarListas(); }));
    u.$("#form-valor").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = u.$("#nuevo-valor").value.trim(); if (!v) return;
      if (db.aprender(def.id, v)) { u.aviso(`«${v}» agregado`); pintarListas(); u.$("#nuevo-valor").focus(); }
      else u.aviso("Ese valor ya está en la lista.", "info");
    });
    zona.querySelectorAll("[data-quitar]").forEach((b) => b.addEventListener("click", () => {
      const lista = db.t.config.catalogos[def.id], i = Number(b.dataset.quitar), [v] = lista.splice(i, 1);
      db.guardar("config"); pintarListas();
      u.aviso(`«${v}» quitado de la lista`, "ok", { texto: "Deshacer", fn: () => { lista.splice(i, 0, v); db.guardar("config"); pintarListas(); } });
    }));
    zona.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.editar), li = b.closest("li"), viejo = valores[i];
      li.classList.add("editando");
      li.innerHTML = `<input class="entrada" value="${u.esc(viejo)}" aria-label="Corregir valor"><button type="button" class="btn btn-pri btn-s" data-ok>Guardar</button><button type="button" class="btn btn-texto btn-s" data-cancelar>Cancelar</button>`;
      const inp = u.$("input", li); inp.focus(); inp.select();
      const ok = () => corregir(def, i, viejo, inp.value.trim());
      u.$("[data-ok]", li).addEventListener("click", ok);
      u.$("[data-cancelar]", li).addEventListener("click", pintarListas);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); ok(); } else if (e.key === "Escape") { e.stopPropagation(); pintarListas(); } });
    }));
  }

  function corregir(def, i, viejo, nuevo) {
    if (!nuevo || nuevo === viejo) return pintarListas();
    const lista = db.t.config.catalogos[def.id], copia = [...lista];
    const existente = lista.findIndex((x, k) => k !== i && u.norm(x) === u.norm(nuevo));
    if (existente >= 0) { nuevo = lista[existente]; lista.splice(i, 1); } else lista[i] = nuevo;
    const cambiados = [];
    def.donde.forEach(([t, campo]) => (db.t[t] || []).forEach((r) => { if (r[campo] === viejo) { r[campo] = nuevo; cambiados.push([r, campo]); } }));
    const tablas = [...new Set(def.donde.map(([t]) => t))];
    db.guardar("config", ...tablas); db.cambio && db.cambio(); pintarListas();
    u.aviso(`${existente >= 0 ? "Se juntó con" : "Corregido a"} «${nuevo}»${cambiados.length ? ` · ${cambiados.length} ${cambiados.length === 1 ? "registro actualizado" : "registros actualizados"}` : ""}`, "ok", { texto: "Deshacer", fn: () => {
      db.t.config.catalogos[def.id] = copia; cambiados.forEach(([r, campo]) => (r[campo] = viejo));
      db.guardar("config", ...tablas); db.cambio && db.cambio(); pintarListas();
    } });
  }

  CRM.vistas.configuracion = {
    render(cont) {
      const c = db.config();
      const conteos = ["productos", "clientes", "cotizaciones", "detalle_cotizacion", "proveedores", "compras", "documentos", "consultas"].map((t) => [t, (db.t[t] || []).length]);
      cont.innerHTML = `
        <div class="encabezado"><div class="titulos"><h1>Configuración</h1><p>Datos que salen en la cotización, usuarios y respaldo.</p></div></div>
        <div class="rejilla r-2-1">
          <div class="tarjeta"><div class="tarjeta-cab"><h3>Datos de la empresa (PDF)</h3></div>
            <div class="seccion-form"><div class="campos" id="form-empresa">
              <div class="campo c-12"><label>Razón social</label><input name="razon_social" value="${u.esc(c.razon_social || "")}"></div>
              <div class="campo c-12"><label>Dirección (línea 1)</label><input name="direccion_1" value="${u.esc(c.direccion_1 || "")}"></div>
              <div class="campo"><label>Dirección (línea 2)</label><input name="direccion_2" value="${u.esc(c.direccion_2 || "")}"></div>
              <div class="campo c-3"><label>RFC</label><input name="rfc" value="${u.esc(c.rfc || "")}"></div>
              <div class="campo c-3"><label>Teléfono</label><input name="telefono" value="${u.esc(c.telefono || "")}"></div>
              <div class="campo"><label>Lugar de emisión</label><input name="lugar_emision" value="${u.esc(c.lugar_emision || "")}"></div>
              <div class="campo"><label>Lema</label><input name="lema" value="${u.esc(c.lema || "")}"></div>
              <div class="campo c-12"><label>Texto de apertura</label><textarea name="texto_apertura" rows="2">${u.esc(c.texto_apertura || "")}</textarea></div>
              <div class="campo c-12"><label>Leyenda IMSS</label><textarea name="leyenda_imss" rows="2">${u.esc(c.leyenda_imss || "")}</textarea></div>
              <div class="campo"><label>Leyenda de precios</label><input name="leyenda_precios" value="${u.esc(c.leyenda_precios || "")}"></div>
              <div class="campo"><label>Leyenda de IVA</label><input name="leyenda_iva" value="${u.esc(c.leyenda_iva || "")}"></div>
              <div class="campo c-12"><label>Cierre</label><input name="cierre" value="${u.esc(c.cierre || "")}"></div>
              <div class="campo"><label>Área de firma</label><input name="firma_area" value="${u.esc(c.firma_area || "")}"></div>
              <div class="campo"><label>Teléfonos de firma (separados por coma)</label><input name="firma_telefonos" value="${u.esc((c.firma_telefonos || []).join(", "))}"></div>
              <div class="campo c-3"><label>IVA</label><input type="number" step="0.01" name="iva" value="${c.iva ?? 0.16}"></div>
              <div class="campo c-3"><label>Días para alerta de seguimiento</label><input type="number" min="1" name="dias_alerta_seguimiento" value="${c.dias_alerta_seguimiento ?? 3}"></div>
            </div><div class="acciones mt-16"><button class="btn btn-pri" id="btn-guardar-emp">${I("guardar", 16)}Guardar</button></div></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="tarjeta"><div class="tarjeta-cab"><h3>Datos y respaldo</h3></div><div class="tarjeta-cuerpo">
              <div class="advertencia ${db.modo === "carpeta" ? "azul" : ""}" style="margin:0 0 14px">${I(db.modo === "carpeta" ? "base" : "info", 16)}<span>${db.modo === "carpeta" ? `Carpeta <b>${u.esc(db.carpeta.name)}</b> conectada: cada cambio se escribe en su archivo JSON (uno por tabla).` : db.soportaCarpeta ? "Los cambios están en este navegador. Conecta la carpeta <b>data</b> (junto a index.html) para guardarlos en los JSON." : "Este navegador no permite escribir en carpetas. Ábrelo en Chrome o Edge para guardar en los JSON."}</span></div>
              <ul class="fuentes-lista">${conteos.map(([t, n]) => `<li><span>${t.replace(/_/g, " ")}</span><b>${n}</b></li>`).join("")}</ul>
              <div class="acciones mt-16" style="flex-direction:column;align-items:stretch">
                ${db.modo !== "carpeta" && db.soportaCarpeta ? `<button class="btn btn-pri" id="btn-conectar">${I("documentos", 16)}Conectar carpeta data</button>` : ""}
                <button class="btn btn-sec" id="btn-exportar">${I("descargar", 16)}Exportar respaldo (JSON)</button>
                <button class="btn btn-sec" id="btn-importar">${I("subir", 16)}Importar respaldo</button><input type="file" id="in-importar" accept=".json" hidden>
                <button class="btn btn-texto" id="btn-reiniciar" style="color:var(--rojo)">${I("refrescar", 16)}Reiniciar datos de demostración</button>
              </div></div></div>
            <div class="tarjeta"><div class="tarjeta-cab"><h3>Usuarios</h3><button class="btn btn-sec btn-s" id="btn-usuario">${I("mas", 15)}Agregar</button></div>
              <ul class="lista-seg">${db.t.usuarios.map((x) => `<li><span class="avatar s">${u.iniciales(x.nombre)}</span><div class="info"><b>${u.esc(x.nombre)}</b><span>${u.esc(x.puesto || "")} · ${u.esc(x.rol || "")}</span></div></li>`).join("")}</ul></div>
          </div>
        </div>
        <div class="tarjeta mt-16" id="tarjeta-listas"><div class="tarjeta-cab"><h3>Listas de opciones</h3><span class="sub">Lo que el CRM sugiere al escribir. Crecen solas; aquí las corriges.</span></div>
          <div class="tarjeta-cuerpo" id="listas"></div></div>`;
      pintarListas();

      u.$("#btn-guardar-emp").addEventListener("click", () => {
        const f = u.leerForm(u.$("#form-empresa"));
        f.firma_telefonos = String(f.firma_telefonos || "").split(",").map((x) => x.trim()).filter(Boolean);
        f.iva = Number(f.iva) || 0; f.dias_alerta_seguimiento = Number(f.dias_alerta_seguimiento) || 3;
        Object.assign(db.t.config, f); db.guardar("config"); u.aviso("Configuración guardada");
      });
      u.$("#btn-exportar").addEventListener("click", () => db.exportar());
      const bcon = u.$("#btn-conectar"); if (bcon) bcon.addEventListener("click", () => u.$("#btn-carpeta").click());
      u.$("#btn-importar").addEventListener("click", () => u.$("#in-importar").click());
      u.$("#in-importar").addEventListener("change", async (e) => {
        const a = e.target.files[0]; if (!a) return;
        if (!(await u.confirmar("Importar respaldo", "Se reemplazarán todos los datos actuales por los del archivo.", "Importar", true))) return;
        try { await db.importar(a); u.aviso("Respaldo importado"); this.render(cont); CRM.refrescarMenu(); } catch (err) { u.aviso(err.message, "error"); }
      });
      u.$("#btn-reiniciar").addEventListener("click", async () => {
        if (!(await u.confirmar("Reiniciar datos", "Se borran todos los cambios y se vuelve a los datos de ejemplo. Exporta un respaldo antes si lo necesitas.", "Reiniciar", true))) return;
        db.reiniciar(); u.aviso("Datos de demostración restaurados"); this.render(cont); CRM.refrescarMenu();
      });
      u.$("#btn-usuario").addEventListener("click", () => u.modal({ titulo: "Agregar usuario", ancho: 480,
        cuerpo: `<div class="campos"><div class="campo c-12"><label>Nombre</label><input name="nombre"></div><div class="campo"><label>Rol</label><select name="rol">${u.opciones(["Ventas", "Dirección", "Compras", "Almacén"])}</select></div><div class="campo"><label>Puesto</label><input name="puesto"></div></div>`,
        acciones: [{ texto: "Cancelar" }, { texto: "Agregar", clase: "btn-pri", fn: (m) => {
          const f = u.leerForm(m); if (!f.nombre) { u.aviso("Escribe el nombre", "error"); return false; }
          db.t.usuarios.push({ id_usuario: u.siguienteId(db.t.usuarios, "id_usuario", "US", 2), ...f }); db.guardar("usuarios"); u.aviso("Usuario agregado"); this.render(cont);
        } }] }));
    },
  };
})(window.CRM);
