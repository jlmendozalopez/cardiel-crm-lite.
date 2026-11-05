# CARDIEL · CRM-lite y Cerebro Digital (prototipo funcional, Fase 1)

Portal web local para CARDIEL Trailers de México. Junta el CRM-lite (clientes, cotizaciones, catálogo, proveedores y documentos) con el **Cerebro Digital**, que ayuda al vendedor a identificar la pieza y cotizar con evidencia.

## Cómo abrirlo

1. Descomprime y abre `index.html` con doble clic en **Chrome o Edge**.
2. En el menú lateral, abajo, da clic en **Conectar carpeta data** y elige la carpeta `data` que está junto a `index.html`. Acepta el permiso de edición.
3. Listo: cada cambio se escribe en `data/<tabla>.json` y los archivos que subas quedan en `data/documentos/`.

El navegador recuerda la carpeta. Si al volver a abrir aparece **Reconectar carpeta data**, es un clic para renovar el permiso.
Mientras no conectes la carpeta, el portal funciona igual y guarda en el navegador.

## Qué trae

| Módulo | Para qué |
|---|---|
| Inicio | Lo que pide atención hoy: cotizaciones sin seguimiento, embudo, motivos de pérdida, salud del catálogo. |
| Cerebro Digital | El vendedor describe la pieza (y puede adjuntar la foto). Responde con candidatos, número CARDIEL y de fabricante, equivalencias, datos técnicos, **evidencia** (fuente y página), antecedentes comerciales (último precio, proveedor, costo) y **se abstiene** cuando no hay evidencia suficiente. Desde ahí se crea la pre-cotización. |
| Cotizaciones | Tablero por etapas (arrastrar y soltar), lista, editor completo con cliente, unidad, partidas, aspectos comerciales, seguimiento y bitácora. **Genera el PDF** con el formato de CARDIEL. |
| Clientes | Ficha 360°: cotizaciones, lo que pide, unidades (flota), contactos y bitácora. |
| Catálogo | Productos, números de parte y equivalencias, datos técnicos, fotos, historial y qué le falta a cada ficha. |
| Proveedores y compras | Registro de quién surte cada pieza y a qué costo (no es inventario). |
| Documentos | La **ingesta**: subir → ligar a productos → validar → el Cerebro lo usa como evidencia. |
| Configuración | Datos que salen en el PDF, usuarios, respaldo e importación, reinicio de la demo. |

## El ciclo que demuestra

1. Llega una solicitud → el vendedor pregunta al Cerebro.
2. El Cerebro propone la pieza con evidencia → se crea la pre-cotización → se genera el PDF.
3. Lo que se captura (cotización, unidad, contacto, costo del proveedor, documento validado, número de parte nuevo) **entra al conocimiento** y la siguiente consulta ya lo usa.

## Qué es simulado

- **El Cerebro** busca con reglas y similitud de texto sobre los datos del CRM; no usa un LLM ni el RAG real. La respuesta tiene la misma forma que tendrá el MVP (candidatos, evidencia, confianza, antecedentes, abstención).
- **La foto** se guarda con la consulta, pero no se analiza (eso es del MVP multimodal).
- **Extracción de documentos:** los "datos clave" se capturan a mano y alguien los valida. En el MVP se extraen con OCR y visión.
- **Datos de ejemplo:** salen de `DATOS_ESTRUCTURADOS_CARDIEL_COMPLETO.xlsx` (99 productos del catálogo; el histórico comercial es de escenario para la demo).
- **Imágenes de productos:** son enlaces de internet; si no cargan, sube la foto real desde la ficha del producto.

## Estructura

```
index.html                 el portal
css/estilos.css            identidad CARDIEL (azul marino, azul, rojo, gris; Montserrat)
js/                        lógica: datos.js (almacén), cerebro.js (motor simulado), pdf.js (cotización), vistas/
data/*.json                una tabla por archivo (aquí se guardan los cambios)
data/semilla.js            datos de ejemplo (se usan para reiniciar la demo)
data/documentos/           archivos subidos
assets/                    logos e isotipo
fonts/                     Montserrat (licencia OFL)
vendor/jspdf.umd.min.js    generador de PDF (licencia MIT)
```

Para volver a los datos de ejemplo: **Configuración → Reiniciar datos de demostración**.
