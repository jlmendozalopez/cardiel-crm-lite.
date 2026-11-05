# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Ventas (uso diario):** ejecutiva de ventas de refacciones de CARDIEL Trailers de México. Recibe solicitudes de transportistas y operadores logísticos por teléfono y WhatsApp (a veces solo con una foto o una descripción vaga), identifica la pieza, cotiza y da seguimiento hasta cerrar. Trabaja sobre todo en escritorio en oficina, y a veces desde el celular.
- **Dirección:** Gerencia de Comercialización y Servicio. Revisa el embudo, las cotizaciones sin seguimiento, los motivos de pérdida y la salud del catálogo; también valida conocimiento y cotiza.

## Product Purpose

Portal local que junta un CRM-lite (clientes, cotizaciones, catálogo, proveedores y compras, documentos) con el **Cerebro Digital**, un copiloto que ayuda a identificar la pieza correcta y a cotizar con evidencia. Éxito: cotizar más rápido y sin errores de pieza, no dejar cotizaciones sin seguimiento, y que cada cosa capturada se convierta en conocimiento que mejora la siguiente consulta.

Se usará como **piloto real dentro de CARDIEL** (prototipo funcional, Fase 1).

## Positioning

No es un CRM genérico: el Cerebro responde con candidatos, número CARDIEL y de fabricante, equivalencias, datos técnicos, **evidencia con fuente y página**, antecedentes comerciales (último precio, proveedor, costo) y **se abstiene** cuando no hay evidencia suficiente. El ciclo solicitud → identificación con evidencia → pre-cotización → PDF con formato CARDIEL → conocimiento acumulado es el núcleo.

## Operating Context

- Se abre `index.html` con doble clic en Chrome o Edge (sin servidor). Los datos se guardan en `data/<tabla>.json` mediante File System Access, o en el navegador si no se conecta la carpeta.
- Ciclo comercial: solicitud → cotizada → seguimiento → ganada / perdida / sin respuesta. Alerta de seguimiento a los 3 días sin movimiento.
- Unidades: remolque, tracto, dolly; segmentos: caja seca/refrigerada, Dolly H, plataforma, refacciones para tracto.
- La cotización sale en PDF con el formato oficial de CARDIEL (razón social, leyendas de IVA e IMSS, condiciones, firma de Gerencia).

## Capabilities and Constraints

- Módulos: Inicio, Cerebro Digital, Cotizaciones (tablero por etapas con arrastrar y soltar, lista, editor, PDF), Clientes (ficha 360°), Catálogo, Proveedores y compras (registro de costos, no inventario), Documentos (ingesta y validación), Configuración.
- Stack: HTML, CSS y JavaScript sin framework ni build; jsPDF como única dependencia. Debe seguir funcionando abierto desde `file://`.
- El Cerebro es simulado (reglas y similitud de texto); la foto se guarda pero no se analiza; la extracción de documentos es manual. La interfaz debe ser honesta sobre esto.
- Precio y proveedor mostrados son históricos; siempre se pide confirmar precio vigente y disponibilidad.
- Uso mixto: escritorio primero, pero cada flujo debe funcionar en celular.

## Brand Commitments

- Identidad visual **obligatoria**: azul marino `#0F2747`, azul `#2D7FF9`, rojo `#C31B1B`, gris `#6B7280`, tipografía Montserrat, logos en `assets/` y guía en `IDENTIDAD VISUAL.pdf`.
- Lema: «Fortaleciendo el transporte que mueve a México».
- Voz: español de México, directo y cercano, de tú al vendedor; formal en el PDF al cliente.

## Evidence on Hand

- 99 productos reales del catálogo (de `DATOS_ESTRUCTURADOS_CARDIEL_COMPLETO.xlsx`), números de parte, equivalencias, observaciones técnicas y fuentes.
- El histórico comercial (cotizaciones, compras, actividades) es de escenario para la demo; no presentarlo como cifras reales.
- Imágenes de producto son enlaces externos que pueden fallar; portada de marca en `assets/portada-cardiel.png`.

## Product Principles

1. **Evidencia antes que adivinanza.** Toda sugerencia muestra su fuente y su nivel de confianza; abstenerse es una respuesta válida.
2. **Lo urgente primero.** La interfaz pone al frente lo que pide atención hoy (seguimientos, documentos por validar).
3. **Capturar es enseñar.** Cada dato que se registra debe sentirse como conocimiento que vuelve útil al Cerebro.
4. **Rápido para quien está al teléfono.** Menos clics entre la solicitud del cliente y la cotización enviada.
5. **Honestidad del prototipo.** Lo simulado se dice con claridad, sin esconderlo ni exagerarlo.

## Accessibility & Inclusion

Sin requisito formal establecido. Mínimo esperado: contraste WCAG AA, navegación por teclado y textos legibles en celular.
