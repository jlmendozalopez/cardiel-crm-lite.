---
name: CARDIEL CRM-lite · Cerebro Digital
description: Portal comercial de CARDIEL Trailers de México para identificar refacciones con evidencia y cotizar.
colors:
  marino: "#0F2747"
  marino-900: "#0A1A31"
  marino-800: "#12305A"
  marino-700: "#1B3B68"
  azul: "#2D7FF9"
  azul-600: "#1E6AE0"
  azul-50: "#EDF4FF"
  azul-100: "#DCE9FE"
  rojo: "#C31B1B"
  rojo-50: "#FDEEEE"
  gris: "#6B7280"
  gris-400: "#9AA1AD"
  verde: "#1B7F55"
  verde-50: "#E8F5EE"
  ambar: "#935700"
  ambar-50: "#FFF4E0"
  fondo: "#F3F5F9"
  superficie: "#FFFFFF"
  superficie-2: "#F8FAFC"
  borde: "#E2E7EF"
  borde-fuerte: "#CDD5E1"
  texto: "#0F1B2D"
  texto-2: "#4A5568"
typography:
  display:
    fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14.5px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  s: "7px"
  md: "10px"
  lg: "12px"
  pill: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "18px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.azul-600}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.s}"
    padding: "0 16px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "#1857BF"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.marino}"
    rounded: "{rounded.s}"
    padding: "0 16px"
    height: "38px"
  button-marino:
    backgroundColor: "{colors.marino}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.s}"
    height: "38px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.s}"
    padding: "0 12px"
    height: "38px"
  card:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.md}"
    padding: "16px 18px"
  chip:
    backgroundColor: "{colors.azul-50}"
    textColor: "{colors.azul-600}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  nav-item-active:
    backgroundColor: "{colors.marino-700}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.s}"
    padding: "9px 12px"
---

# Design System: CARDIEL CRM-lite · Cerebro Digital

## Overview

**Creative North Star: "El taller de precisión"**

El portal se siente como un buen taller: ordenado, técnico y confiable, con cada pieza en su lugar y nada sobrando sobre el banco de trabajo. El vendedor llega con una solicitud vaga y sale con una pieza identificada, su evidencia y una cotización; la interfaz acompaña ese trabajo sin hacer ruido.

La precisión no es frialdad. El tono es cercano y cálido: aire generoso entre bloques, esquinas suaves, mensajes en español de tú y detalles amables en los momentos de alivio (una cotización ganada, una pieza encontrada). La marca vive en el azul marino estructural del menú y los títulos, en el azul de la acción principal y en el rojo reservado para lo que de verdad pide atención.

La regla que manda sobre todas: **nada saturado**. Los usuarios odian las pantallas llenas. Cada pantalla tiene un foco, la información secundaria se revela cuando hace falta y el color se usa con mesura.

**Key Characteristics:**
- Menú lateral azul marino profundo; lienzo gris azulado muy claro; tarjetas blancas con borde fino.
- Una sola acción primaria azul por zona de la pantalla.
- Rojo solo para urgencia, pérdida o error; nunca como decoración.
- Montserrat en todo, con números tabulares para montos y cantidades.
- Densidad media con aire generoso; la información técnica se muestra por capas.

## Colors

Paleta institucional de CARDIEL: azul marino como estructura, azul como acción, rojo como alerta, sobre neutros fríos y limpios.

### Primary
- **Azul Marino CARDIEL** (marino): color estructural de la marca. Menú lateral (en su variante más profunda, marino-900), títulos, montos importantes, burbujas del usuario en el Cerebro y avatares.
- **Azul Acción** (azul): indicador de la sección activa, progreso y acentos. Para fondos con texto blanco (botón primario: Consultar, Crear pre-cotización, Guardar) y para enlaces se usa azul-600, porque el blanco sobre el azul de marca no alcanza 4.5:1.

### Secondary
- **Rojo Alerta CARDIEL** (rojo): seguimientos vencidos hoy, contadores de pendientes y errores. Su fondo rojo-50 acompaña insignias. La abstención del Cerebro no es un error: va en neutro, con la pregunta que falta y la acción de copiar el mensaje al cliente.

### Tertiary
- **Verde Ganada** (verde) y **Ámbar Seguimiento** (ambar): estados del ciclo comercial y niveles de confianza. Siempre en pareja con su fondo claro (verde-50, ambar-50) y nunca como color de marca.

### Etapas del ciclo comercial
Cada etapa tiene un color fijo (tokens `--e-<etapa>` y `--e-<etapa>-50` en `estilos.css`) que se repite igual en el tablero, las insignias y el embudo: Solicitud violeta `#5B47B8`, Cotizada azul `#1E6AE0`, En seguimiento ámbar `#935700`, Ganada verde `#176B48`, Perdida rojo `#C31B1B` y Sin respuesta gris `#5B6270`. En el tablero el color va en el filete superior de la columna, su título y el borde izquierdo de cada tarjeta, sobre un fondo apenas teñido; nunca como bloque saturado.

### Neutral
- **Lienzo Taller** (fondo): fondo general de la aplicación.
- **Superficie** (superficie) y **Superficie Suave** (superficie-2): tarjetas, y luego encabezados de tabla, pies de tarjeta y campos de solo lectura.
- **Borde** (borde) y **Borde Firme** (borde-fuerte): separación de tarjetas y filas, y contorno de campos y botones secundarios.
- **Tinta** (texto) y **Tinta Suave** (texto-2): texto principal y secundario.
- **Gris CARDIEL** (gris) y **Gris Tenue** (gris-400): metadatos, etiquetas e íconos inactivos. El gris tenue no se usa para texto que haya que leer.

### Named Rules
**The Rojo Escaso Rule.** El rojo marca lo que pide atención hoy. Si una pantalla tiene más de tres manchas rojas, se pierde la urgencia.

**The Un Solo Azul Rule.** Cada zona de trabajo tiene una sola acción primaria en azul sólido; las demás son secundarias o de texto.

**The Sin Saturación Rule.** Ningún color de estado se usa a saturación plena como fondo de bloques grandes; los estados se expresan con fondos claros y texto oscuro.

## Typography

**Display Font:** Montserrat (con system-ui, Segoe UI)
**Body Font:** Montserrat (con system-ui, Segoe UI)

**Character:** Una sola familia geométrica, la de la identidad CARDIEL, trabajando en pesos 400 a 800. La jerarquía sale de peso, tamaño y color, no de mezclar familias.

### Hierarchy
- **Display** (700, 30px, 1.15): solo la bienvenida de la pantalla de acceso.
- **Headline** (700, 22px, 1.25): título de cada pantalla y cifras de KPI.
- **Title** (700, 14.5–16px, 1.4): títulos de tarjeta, de modal y de candidato.
- **Body** (400–500, 13.5px, 1.5): texto de trabajo, tablas y formularios. Números tabulares siempre activos.
- **Label** (700, 10.5–11px, 0.06–0.12em, mayúsculas): encabezados de tabla, grupos del menú y secciones de formulario.

### Named Rules
**The Mayúsculas Mínimas Rule.** Las etiquetas en mayúsculas son ayudas de escaneo, no títulos; no más de un nivel de etiqueta en mayúsculas por tarjeta.

## Layout

Aplicación de dos columnas: menú lateral fijo de 252px y área principal con barra superior adhesiva de 64px y contenido hasta 1480px con márgenes de 28px. El contenido se organiza en rejillas de tarjetas (4, 3, 2+1 columnas) con separación de 16px. El editor de cotización y el Cerebro usan una columna principal y un panel lateral adhesivo de 300–340px.

Responsivo: a 1100px las rejillas pasan a una o dos columnas y los paneles laterales bajan; a 860px el menú se vuelve cajón con velo, el contenido usa márgenes de 16px y todo control táctil mide al menos 44px (campos a 16px de letra para que el teléfono no haga zoom); a 520px todo queda a una columna. En celular, Cotizaciones abre en lista y el editor fija abajo una barra con total, PDF y Guardar; los bloques secundarios del editor (Unidad, Aspectos comerciales) se pliegan con un resumen de una línea.

**The Aire Primero Rule.** Ante la duda entre añadir un bloque o dejar espacio, se deja espacio. La información secundaria se revela al pedirla.

## Elevation & Depth

Sistema plano con elevación sutil. Las tarjetas descansan con un borde fino y una sombra mínima; la elevación crece solo con el estado (hover, menús desplegables, modales, avisos).

### Shadow Vocabulary
- **Reposo** (`0 1px 2px rgba(15,39,71,.06), 0 1px 3px rgba(15,39,71,.05)`): tarjetas y segmentado activo.
- **Flotante** (`0 4px 16px rgba(15,39,71,.08), 0 1px 3px rgba(15,39,71,.06)`): resultados de búsqueda, sugerencias y hover de tarjetas del tablero.
- **Modal** (`0 18px 50px rgba(10,26,49,.22)`): modales, avisos y cajón del menú en celular.

## Shapes

Esquinas suaves y consistentes: 7–8px en botones y campos, 10px en tarjetas, 12px en modales, candidatos y bloques destacados, píldora en insignias y sugerencias. Los íconos van en contenedores cuadrados redondeados. Sin esquinas rectas ni recortes angulosos.

## Components

### Buttons
- **Shape:** esquinas suaves (8px), alto 38px; compacto 32px.
- **Primary:** azul acción con texto blanco, peso 600.
- **Hover / Focus:** oscurece un tono; foco de teclado con contorno sólido azul-600 de 2px y separación de 2px.
- **Secondary:** blanco con borde firme y texto marino. **Marino:** para acciones institucionales (PDF). **Peligro:** rojo, solo para acciones destructivas. **Texto:** sin fondo, azul-600.

### Chips
- **Style:** píldora con fondo claro del color y texto en su tono oscuro (azul, marino, verde, rojo, ámbar) o blanco con borde.
- **State:** las etapas del ciclo comercial tienen su propio par de colores fijo.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** superficie blanca sobre el lienzo.
- **Shadow Strategy:** Reposo.
- **Border:** borde fino.
- **Internal Padding:** 16–18px; cabecera con título y acción de texto a la derecha.

### Inputs / Fields
- **Style:** borde firme, fondo blanco, 8px, alto 38px; etiqueta arriba en 12px peso 600.
- **Focus:** borde azul con halo azul translúcido de 3px.
- **Error / Disabled:** borde rojo; solo lectura en superficie suave.

### Navigation
- Menú lateral azul marino profundo con grupos en etiqueta mayúscula, ítems con ícono y texto, contador rojo para pendientes. El activo lleva fondo marino-700 y una barra azul a la izquierda. En celular se abre como cajón con velo.

### Candidato del Cerebro
- Tarjeta de 12px con cabecera (imagen, rango, nombre con coincidencias resaltadas, insignias de número CARDIEL y de fabricante, medidor de confianza), cuerpo en columnas (datos técnicos, evidencia, antecedentes comerciales) y pie con el motivo de coincidencia y las acciones. El candidato principal lleva borde y halo azul suave.

## Do's and Don'ts

### Do:
- **Do** usar azul marino, azul, rojo y gris de la identidad CARDIEL y Montserrat en todo.
- **Do** dejar un solo foco por pantalla y revelar el detalle técnico por capas.
- **Do** expresar estados con fondo claro y texto oscuro del mismo tono.
- **Do** mostrar siempre fuente y confianza junto a cualquier sugerencia del Cerebro.
- **Do** escribir en español de México, de tú, con frases cortas y amables.

### Don't:
- **Don't** saturar: nada de pantallas con todos los bloques compitiendo, muros de insignias ni colores de estado a plena saturación en áreas grandes.
- **Don't** usar el rojo como decoración ni para más de lo que pide atención hoy.
- **Don't** introducir otras familias tipográficas ni colores fuera de la identidad.
- **Don't** usar gris tenue para texto que el usuario tenga que leer.
