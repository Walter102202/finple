# Status narrativo dinámico del agente

**Fecha:** 2026-05-07
**Componentes afectados:** `components/chat.tsx`, `lib/agent.ts`

## Problema

Mientras el agente trabaja, el chat muestra dos indicadores distintos:

1. `ThinkingDots` con la frase fija **"Revisando normativa…"** cuando el modelo aún no ha emitido nada (`chat.tsx:249-260`).
2. Una píldora separada con `toolStatus` dinámico (`"Consultando bcn.cl…"`, `"Usando search_corpus…"`) cuando ejecuta una herramienta (`chat.tsx:233-238`, mapeo en `summarizeToolInput`, `chat.tsx:37-47`).

La frase fija no refleja qué está haciendo el agente realmente. Y los dos componentes coexistiendo dan ruido visual cuando aparece un texto nuevo entre tools.

## Objetivo

Una sola línea de estado, **siempre presente** mientras el agente trabaja, que cambie de copy según el evento más reciente — usando lenguaje narrativo alineado con los 5 pasos de la sección **"Cómo funciona"** de la landing.

## Mapeo: evento → frase

| Señal del backend | Frase mostrada |
|---|---|
| Turno recién enviado, sin eventos aún | **"Analizando tu caso…"** |
| `tool_executing` · `Skill` con `skill` parseable en input | **"Revisando casos de {área}…"** |
| `tool_executing` · `Skill` sin input parseable | **"Identificando el área…"** |
| `tool_executing` · `search_corpus` | **"Buscando la ley aplicable…"** |
| `tool_executing` · `read_bcn_law` | **"Trayendo el texto desde la BCN…"** |
| `tool_done` → antes del primer `text_delta` siguiente | **"Preparando la respuesta…"** |
| Llega primer `text_delta` con contenido | (status se oculta) |
| Cualquier otra tool no listada | **"Consultando fuente…"** (fallback) |

### Mapeo de nombre de skill → área legible

```
cobros_indebidos          → "cobros indebidos"
creditos_consumo          → "créditos"
fraude_suplantacion       → "fraude y suplantación"
datos_personales          → "datos personales"
criptoactivos_tributacion → "criptoactivos"
fintech_inversiones       → "fintech e inversiones"
regulacion_autoridades    → "autoridades regulatorias"
```

Si el modelo invoca un skill no listado, el frontend cae al fallback "Identificando el área…".

## Cambios en backend (`lib/agent.ts`)

Hoy `tool_executing` se emite en el evento `content_block_start` con `input: {}` vacío (`agent.ts:120-121`). Para conocer el `skill` que se está cargando, hay que esperar el input completo.

**Cambio:** acumular los `input_json_delta` por `content_block.id` y emitir `tool_executing` cuando llegue `content_block_stop` con el input ya parseado (JSON.parse del string acumulado, con try/catch que cae a `input: {}` si falla).

Sigue emitiéndose `tool_call` inmediato en `content_block_start` para que el frontend pueda registrar el inicio si lo necesita en el futuro. Hoy el frontend no lo usa, pero queda disponible.

**Trade-off aceptado:** el status visible ("Revisando casos de…") aparece ~50–200 ms más tarde que el primer indicio de tool. Inperceptible en práctica. Mientras tanto se sigue mostrando "Analizando tu caso…", lo cual es coherente.

## Cambios en frontend (`components/chat.tsx`)

### Estado del mensaje

Reemplazar `toolStatus: string | null` en `DisplayMessage` por:

```ts
type Status =
  | { key: 'analyzing' }
  | { key: 'searching_corpus' }
  | { key: 'reading_bcn' }
  | { key: 'loading_skill'; area?: string }
  | { key: 'preparing' }
  | { key: 'consulting_other' }

type DisplayMessage = {
  role: 'user' | 'assistant'
  text: string
  attachments?: Attachment[]
  streaming?: boolean
  status: Status | null
}
```

### Función pura

```ts
function narrativeFor(s: Status): string {
  switch (s.key) {
    case 'analyzing':         return 'Analizando tu caso…'
    case 'searching_corpus':  return 'Buscando la ley aplicable…'
    case 'reading_bcn':       return 'Trayendo el texto desde la BCN…'
    case 'loading_skill':     return s.area
                                    ? `Revisando casos de ${s.area}…`
                                    : 'Identificando el área…'
    case 'preparing':         return 'Preparando la respuesta…'
    case 'consulting_other':  return 'Consultando fuente…'
  }
}
```

`summarizeToolInput` se elimina — esta función toma su lugar.

### Transiciones de estado

```
send() llamado
  → status = { key: 'analyzing' }

evento tool_executing recibido
  → status derivado del nombre + input:
      Skill con skill="cobros_indebidos" → loading_skill { area: 'cobros indebidos' }
      Skill sin input parseable          → loading_skill { area: undefined }
      search_corpus                      → searching_corpus
      read_bcn_law                       → reading_bcn
      otro nombre                        → consulting_other

evento tool_done recibido
  → status = { key: 'preparing' }

evento text con contenido no vacío
  → status = null
  (deltas posteriores de texto no tocan status: ya es null)

evento tool_executing posterior (mid-respuesta)
  → status se reactiva con el valor derivado
  (cuando vuelva a llegar text, se vuelve a poner en null)

evento error
  → status = null

evento done / fin del stream / unmount
  → status = null
```

### UI

Un único `StatusIndicator` reemplaza tanto a `ThinkingDots` como a la píldora actual de `toolStatus`. Reusa la estética de la píldora existente:

- Cápsula `rounded-full` con `bg-cream-deep/70`
- Tres dots coral animados (los mismos que hoy en `ThinkingDots`)
- Texto pequeño `text-xs text-ink-soft`
- Posicionamiento: dentro de la burbuja del assistant, antes del cuerpo (igual que `toolStatus` hoy)

El componente `Spinner` deja de usarse (lo sustituyen los dots, ya consistentes con el "pensando" actual). Si en el futuro queremos diferenciar visualmente "tool activa" de "pensando", podemos volver a introducirlo.

## Lo que **no** cambia

- El system prompt no se toca.
- El comportamiento del agente es idéntico.
- Los eventos del stream backend siguen siendo `text` / `tool_call` / `tool_executing` / `tool_done` / `citation` / `done` / `error` — solo `tool_executing` lleva ahora el input completo.
- Las citaciones (`citation`) y la lógica de adjuntos siguen igual.

## Plan de testing manual

1. Pregunta sin tools (ej. saludo): debe verse **"Analizando tu caso…"** brevemente y luego el texto.
2. Pregunta de cobros (ej. "me cobraron un seguro raro"): secuencia esperada **Analizando → Revisando casos de cobros indebidos → Buscando la ley aplicable → Preparando la respuesta → texto**.
3. Pregunta que dispara `read_bcn_law` (ley no indexada): debe aparecer **"Trayendo el texto desde la BCN…"**.
4. Cuando el agente hace dos `search_corpus` seguidos: el status vuelve a "Buscando la ley aplicable…" entre ambos, no se queda en "Preparando la respuesta…".
5. Si el backend lanza error: el status desaparece y aparece el banner de error.

## YAGNI explícito

- **No** introducimos un evento explícito tipo `<status>` desde el modelo. Es una capa adicional que requiere tocar el system prompt y agregar parsing — la heurística por tool es suficiente para esta versión.
- **No** intentamos cubrir los pasos "Clasificar" y "Recomendar" de los 5 pasos del landing — no tenemos señales determinísticas. "Preparando la respuesta…" cubre ese gap sin alucinar.
- **No** mostramos "Consultando bcn.cl…" con el dominio dinámico (lo que hace hoy `summarizeToolInput`) — la frase narrativa "Trayendo el texto desde la BCN…" comunica lo mismo de forma más cálida y consistente con los 5 pasos.
