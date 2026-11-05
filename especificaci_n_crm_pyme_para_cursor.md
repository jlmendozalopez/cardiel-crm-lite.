# Especificación de Producto y Arquitectura: CRM Ligero para PyME (Zero-Capture & Voice-First)

> **Propósito de este documento para Cursor AI:**  
> Este archivo define las reglas de negocio, módulos principales, experiencia de usuario (UX), experiencia del cliente (CX), esquema de datos y contratos de IA para construir o modificar el CRM. Prioriza siempre **eliminar la captura manual con teclado** y centrar el flujo en **Cotizaciones + Proveedores + Seguimiento rápido por WhatsApp**.

---

## 1. Contexto y Filosofía de Diseño (Reglas de Oro)

1. **El Problema a Resolver:** La empresa viene de usar Excel, libretas de papel y WhatsApp personal. Los CRMs tradicionales fracasan porque los vendedores sienten que les da trabajo extra ("flojera de capturar").
2. **Principio "Cero Captura" (Zero Data Entry):** Ningún flujo principal debe obligar al usuario a llenar formularios largos. La entrada principal de datos debe ser **Dictado por Voz** o **Pegar texto crudo / imagen de WhatsApp**.
3. **La Recompensa Inmediata:** El usuario usa el sistema porque le **arma la cotización en PDF/Imagen en segundos** y le recuerda qué proveedor no le ha dado precio, no por "llenar una base de datos".
4. **Cero Campos Burocráticos Obligatorios:** Para crear una cotización basta con el `nombre/apodo del cliente` y `qué solicita`. Datos fiscales (RFC, dirección, correo formal) solo se piden cuando la cotización pasa a estado `GANADA`.
5. **Sin API de WhatsApp por ahora (Puente Semiautomático):** Como aún no hay integración oficial con WhatsApp Business API, el sistema debe facilitar **pegar mensajes entrantes** de WhatsApp y **copiar/descargar resúmenes o PDFs** listos para enviarse manualmente al chat del cliente o proveedor.

---

## 2. Módulos Principales y Requerimientos de UX

### Módulo 1: Entrada Inteligente Multimodal (Voice & Smart Paste)
* **Botón Flotante / Central de Micrófono (`Voice-to-Action`):**
  * Disponible en cualquier pantalla del sistema.
  * El usuario dicta en lenguaje natural: *"Cotizar a Roberto del Taller El Águila dos bombas de agua y un filtro, urge para mañana, pedir costo a Refaccionaria del Norte"*.
  * El sistema transcribe el audio y extrae las entidades estructuradas mediante un LLM.
* **Caja de Pegado Rápido de WhatsApp / Foto de Libreta (`Smart Paste`):**
  * Un área de texto libre donde el vendedor pega tal cual la lista de productos que le mandó el cliente o los costos que le respondió el proveedor por WhatsApp, o sube una foto de una nota escrita a mano.
  * El sistema convierte ese texto desordenado en filas estructuradas de la cotización.
* **Tarjeta de Confirmación en 1 Toque (`Review & Commit`):**
  * Antes de guardar en base de datos, muestra una vista previa limpia con los datos detectados (Cliente, Partidas, Cantidades, Proveedor sugerido, Estado) y un botón grande de **"Confirmar y Aplicar"**.

### Módulo 2: Cotizador Espejo (Cliente vs. Proveedor)
En esta PyME, cotizar al cliente requiere muchas veces consultar costos y tiempos con proveedores.
* **Vista Dual en la misma pantalla de Cotización:**
  * **Lado Interno (Costeo con Proveedores):** Por cada partida (`QuoteItem`), permite asignar uno o varios proveedores, registrar su `costo_unitario`, `tiempo_entrega` y `disponibilidad`.
  * **Generador de Mensaje para Proveedor:** Un botón que copia al portapapeles el texto listo para pegar en el WhatsApp del proveedor: *"Hola [Proveedor], ¿me apoyas con costo y tiempo de entrega para: - 2x Bomba de agua..."*.
  * **Lado Externo (Precio al Cliente):** Calculadora en vivo con un deslizador o input rápido de **Margen de Utilidad (%)** general o por partida. Calcula automáticamente el precio de venta y la utilidad bruta en dinero ($).
  * **Memoria de Precios:** Si una partida ya se cotizó antes, muestra en un badge el último costo registrado y qué proveedor lo dio.

### Módulo 3: Tablero Visual de Avance (Kanban de 4 Etapas + Semáforo)
Reemplaza la libreta con un tablero Kanban limpio donde cada tarjeta muestra un **semáforo de tiempo estancado** (Verde: $< 4\text{h}$, Amarillo: $4\text{h}-24\text{h}$, Rojo: $> 24\text{h}$):
1. **`EN_COSTEO` (Esperando Proveedor):** Solicitudes recibidas donde faltan costos de uno o más proveedores. Muestra claramente qué proveedor falta por responder.
2. **`COTIZACION_ENVIADA` (Esperando Cliente):** Ya se generó el PDF/Imagen y se mandó al cliente. Si pasan 24h sin movimiento, resalta la tarjeta y habilita un botón para copiar un mensaje de seguimiento amigable para WhatsApp.
3. **`EN_NEGOCIACION` (Ajustes / Descuentos):** El cliente pidió ajuste de precio, cambio de marca o modificación de cantidades.
4. **`CERRADA` (`GANADA` / `PERDIDA`):**
   * Si se marca `PERDIDA`, pide elegir el motivo con **un solo toque** (chips/botones grandes, sin escribir): `Precio Alto`, `Tiempo de Entrega`, `Sin Stock`, `Cliente no respondió`.

### Módulo 4: Generador Instantáneo de Salida (CX - Experiencia del Cliente)
* **PDF Membretado en 1 Clic:** Genera un PDF limpio con logo, folio automático, partidas, precios, vigencia y condiciones de entrega.
* **Tarjeta / Resumen para WhatsApp:** Botón de *"Copiar para WhatsApp"* que genera un texto formateado con negritas y viñetas o una imagen resumen lista para pegar directamente en la conversación con el cliente.

### Módulo 5: Directorio Autoconstruible (Clientes y Proveedores)
* **Creación Invisible (`Auto-Upsert`):** Si al dictar o crear una cotización el usuario menciona un cliente o proveedor que no existe, el sistema lo crea automáticamente con su nombre/apodo sin interrumpir el flujo.
* **Ficha de Cliente:** Historial de cotizaciones, porcentaje de cierre (cuántas pide vs. cuántas compra), ticket promedio y teléfono de WhatsApp.
* **Ficha de Proveedor:** Categorías/marcas que maneja, historial de precios dados, rapidez de respuesta y teléfono de WhatsApp.

---

## 3. Modelo de Datos Sugerido (Schema Reference)

Usa esta estructura como base para crear o actualizar las tablas/modelos del proyecto:

```typescript
// Estados principales de la cotización
type QuoteStatus = 'EN_COSTEO' | 'COTIZACION_ENVIADA' | 'EN_NEGOCIACION' | 'GANADA' | 'PERDIDA';
type LostReason = 'PRECIO_ALTO' | 'TIEMPO_ENTREGA' | 'SIN_STOCK' | 'SIN_RESPUESTA' | 'OTRO';

interface Client {
  id: string;
  name: string;           // Nombre o apodo (único campo obligatorio al inicio)
  companyName?: string;
  whatsappPhone?: string;
  taxId?: string;         // RFC - Solo se pide al ganar venta si requiere factura
  notes?: string;
  createdAt: Date;
}

interface Supplier {
  id: string;
  name: string;           // Nombre o apodo del proveedor
  whatsappPhone?: string;
  categories: string[];   // Ej: ["Bombas", "Filtros", "Eléctrico"]
  avgResponseTimeHours?: number;
  createdAt: Date;
}

interface Quote {
  id: string;
  folio: string;          // Ej: COT-0042
  clientId: string;
  status: QuoteStatus;
  lostReason?: LostReason;
  urgency?: 'BAJA' | 'MEDIA' | 'URGENTE';
  defaultMarginPercent: number; // Ej: 30%
  subtotalCost: number;
  subtotalSale: number;
  totalProfit: number;
  lastActivityAt: Date;   // Para calcular el semáforo de estancamiento
  createdAt: Date;
  items: QuoteItem[];
}

interface QuoteItem {
  id: string;
  quoteId: string;
  description: string;    // Descripción del producto/servicio solicitado
  quantity: number;
  unit?: string;          // Pza, Juego, Servicio, etc.
  supplierId?: string;    // Proveedor asignado/seleccionado
  unitCost?: number;      // Costo que dio el proveedor (null si sigue en costeo)
  marginPercent: number;  // Margen aplicado a esta partida
  unitPrice: number;      // Precio final al cliente
  deliveryTime?: string;  // Ej: "Inmediato", "2 días hábiles"
  isCostReady: boolean;   // Semáforo interno de si ya tenemos costo de esta partida
}

interface VoiceOrTextIngestLog {
  id: string;
  rawInput: string;       // Transcripción de voz o texto pegado de WhatsApp
  extractedJson: string;  // Respuesta estructurada del LLM
  appliedToQuoteId?: string;
  createdAt: Date;
}
```

---

## 4. Contrato JSON para el Parser de Voz / Texto de WhatsApp (IA)

Cuando el usuario dicte por voz o pegue un mensaje de WhatsApp, el backend o servicio de IA debe devolver exactamente este esquema JSON para poblar la pantalla de confirmación (`Review & Commit`):

```json
{
  "intent": "CREATE_QUOTE | UPDATE_SUPPLIER_COSTS | UPDATE_STATUS | ADD_NOTE",
  "client": {
    "name": "Roberto - Taller El Águila",
    "whatsappPhone": null
  },
  "urgency": "URGENTE",
  "statusSuggestion": "EN_COSTEO",
  "items": [
    {
      "description": "Bomba de agua",
      "quantity": 2,
      "unit": "Pza",
      "suggestedSupplierName": "Refaccionaria del Norte",
      "unitCost": null,
      "deliveryTime": "Mañana"
    },
    {
      "description": "Filtro de aceite",
      "quantity": 1,
      "unit": "Pza",
      "suggestedSupplierName": "Refaccionaria del Norte",
      "unitCost": null,
      "deliveryTime": "Mañana"
    }
  ],
  "summaryNote": "Solicita cotización urgente para mañana. Pendiente pedir costo a Refaccionaria del Norte."
}
```

---

## 5. Plan de Implementación Paso a Paso para Cursor

Cuando te pida implementar o modificar el proyecto, sigue este orden de prioridades:

1. **Fase 1 (Base de Datos y Estado):** Implementar o ajustar los modelos de `Client`, `Supplier`, `Quote` y `QuoteItem` asegurando que los campos burocráticos sean opcionales (`nullable`).
2. **Fase 2 (Tablero Kanban PyME):** Construir la vista principal con las 4 columnas (`EN_COSTEO`, `COTIZACION_ENVIADA`, `EN_NEGOCIACION`, `CERRADA`), indicadores visuales de tiempo sin respuesta (semáforo) y cierre en 1 clic.
3. **Fase 3 (Cotizador Espejo Cliente/Proveedor):** Crear el editor ágil de cotización donde se ven partidas, se asignan proveedores, se capturan costos rápido, se desliza el margen de ganancia y se genera el texto para WhatsApp o PDF.
4. **Fase 4 (Módulo Anticaputra - Voz y Pegado Inteligente):** Crear el componente global de micrófono (Web Speech API / Whisper) + caja de pegado de WhatsApp conectado al parser estructurado con tarjeta de confirmación en 1 toque.
5. **Fase 5 (Directorio Autoconstruible):** Hacer que cualquier nombre de cliente o proveedor nuevo confirmado en una cotización se guarde automáticamente en el catálogo y acumule sus métricas.