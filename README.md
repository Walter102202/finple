# Finple

Asistente conversacional que ayuda a personas comunes en Chile —sin formación financiera ni jurídica— a entender problemas con bancos, créditos, AFP, ISAPRE, fintech, fraudes o cobros que no reconocen, y a saber a qué autoridad acudir (CMF, SERNAC, SUSESO, Superintendencia de Pensiones, ANCI, SII o tribunales).

**Segmento primario:** adultos 25–50 que entran a invertir digital (acciones, cripto, créditos hipotecarios) o tienen dudas sobre cobros y contratos. La brecha de literacy regulatoria alcanza a unos **4 millones de personas** en ese rango — Censo 2024 ([INE](https://censo2024.ine.gob.cl/)) × CAF *Capacidades Financieras en América Latina: Chile 2023* (55% sin nivel mínimo aceptable de conocimiento financiero).

> Construido por el equipo **Knowledge Builders** para el **Claude Impact Lab Chile 2026** — desafío *Inclusión Financiera para Chile*, Línea 01: traducir la normativa CMF/SII a lenguaje ciudadano, con **cero alucinación regulatoria** como gate de calidad.
>
> **Producción:** [finple-alpha.vercel.app](https://finple-alpha.vercel.app)

---

## Qué hace

Una persona escribe en lenguaje natural lo que le pasó ("me cobraron un seguro de desgravamen que nunca pedí", "una fintech me promete 30% mensual", "filtraron mis datos en un banco") y opcionalmente sube el PDF del contrato o la cartola. Finple:

1. **Acoge y estructura el caso** — confirma institución, producto, fechas y montos en palabras del usuario.
2. **Cruza con la ley chilena vigente** — Ley 21.521 (Fintec), Ley 21.398 (Pro Consumidor), Ley 19.496 (Protección Consumidor), Ley 21.459 (Delitos Informáticos), Ley 19.628 + Ley 21.719 (Datos Personales), Ley 21.663 (Marco Ciberseguridad ANCI).
3. **Cita los artículos textualmente** desde un corpus indexado de las leyes oficiales BCN, con URL al texto en `bcn.cl/leychile`.
4. **Clasifica el problema** (atención e información · calidad de servicio · interpretación contractual · ejecución · posible infracción) y deriva al canal correcto.
5. **Redacta el reclamo formal** si la persona lo pide.

Regla dura del producto: **si el agente no encuentra el artículo verificado en el corpus o en la ley, no lo cita.** Prefiere decir *"esto debería estar regulado en la Ley X — verifica en bcn.cl porque no tengo el pasaje exacto cargado"* antes que inventar un número de artículo.

---

## Cómo funciona

```
┌──────────────────────────────────────────────┐
│ Next.js App Router (UI + SSE streaming)      │
└───────────────┬──────────────────────────────┘
                │ multipart/form-data (texto + PDFs/imágenes)
┌───────────────▼──────────────────────────────┐
│ /api/chat (Node runtime, ReadableStream)     │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│ runFinpleAgent — query() del Agent SDK       │
│  · model: claude-sonnet-4-6                  │
│  · mcpServers: { 'finple-corpus': … }        │
│  · settingSources: ['project']               │
│  · skills: 'all'                             │
└──────┬───────────────────────────────┬───────┘
       │                               │
┌──────▼─────────┐                ┌────▼────────────────────┐
│ MCP server     │                │ .claude/skills/         │
│ in-process     │                │  creditos_consumo       │
│  search_corpus │                │  cobros_indebidos       │
│  read_bcn_law  │                │  fraude_suplantacion    │
└──┬─────────────┘                │  fintech_inversiones    │
   │                              │  datos_personales       │
   │                              │  criptoactivos_tribut.  │
   │                              │  regulacion_autoridades │
   │                              └─────────────────────────┘
┌──▼─────────────────────────────────────┐
│ Supabase Postgres + pgvector (HNSW)    │
│ 7 leyes chilenas indexadas por artículo│
│ Embeddings: OpenAI text-embedding-3-s  │
└────────────────────────────────────────┘
```

**Flujo de un turno:**

1. La persona envía un mensaje (con o sin adjuntos PDF/imagen).
2. Claude evalúa qué **Skill** aplica entre las 7 áreas; cada `SKILL.md` describe leyes prioritarias, plazos, autoridad responsable y preguntas guiadas para esa área.
3. La Skill instruye al modelo a llamar `search_corpus(query, area?)` antes de citar normativa.
4. `search_corpus` embebe la consulta, busca en pgvector (cosine similarity HNSW) los 6 chunks de artículos más relevantes y devuelve cita exacta, número de artículo, alias de la ley y URL oficial BCN.
5. Si la búsqueda semántica no responde bien, Claude llama `read_bcn_law(idNorma, articulo?)` que descarga el XML oficial desde `servicios-leychile.bcn.cl` y devuelve el articulado íntegro.
6. Para los PDFs adjuntos por el usuario, Claude cita pasajes textuales con offsets exactos — cada cita se streamea como `citations_delta` y se renderea inline en la UI.

---

## Pensamiento agéntico

El proyecto se apoya en tres piezas oficiales de Anthropic, ensambladas para que el modelo razone sobre normativa real en lugar de improvisarla.

### Agent SDK — bucle agéntico, Skills y permisos

`@anthropic-ai/claude-agent-sdk` reemplaza el loop manual de mensajes. La función `query()` orquesta el flujo turno-por-turno y descubre automáticamente las Skills declaradas en `.claude/skills/` gracias a `settingSources: ['project']`:

```ts
// lib/agent.ts (extracto)
for await (const msg of query({
  prompt,
  options: {
    model: 'claude-sonnet-4-6',
    systemPrompt: buildSystemPrompt(),
    mcpServers: { 'finple-corpus': finpleMcpServer },
    allowedTools: [...FINPLE_TOOL_NAMES, 'Skill'],
    settingSources: ['project'],
    skills: 'all',
    includePartialMessages: true,
    maxTurns: 8,
  },
})) {
  // mapeo SDKMessage → eventos SSE para el frontend
}
```

Cada `SKILL.md` lleva en su frontmatter una `description` rica en keywords (cuándo activarse), y en el cuerpo le indica al modelo qué leyes priorizar, qué plazos importan, qué autoridad atiende y qué preguntas guiadas hacer. Esto saca conocimiento del system prompt monolítico y lo convierte en módulos que el modelo carga *bajo demanda* solo cuando el área temática coincide con el caso del usuario.

### MCP — el corpus normativo como herramientas

`search_corpus` y `read_bcn_law` viven en un **MCP server in-process** expuesto al agente como cualquier servidor MCP externo:

```ts
// lib/tools-mcp.ts
export const finpleMcpServer = createSdkMcpServer({
  name: 'finple-corpus',
  version: '0.1.0',
  tools: [searchCorpusTool, readBcnLawTool],
})
```

Cada `tool()` se define con un esquema Zod que el modelo lee como contrato. La descripción explícita de `search_corpus` —*"Úsalo SIEMPRE antes de afirmar qué dice una ley específica"*— es lo que cierra la brecha entre la regla del system prompt y la acción concreta del modelo. El mismo servidor podría exponerse como MCP remoto reutilizable por otros agentes.

### Citations — evidencia verificable sobre PDFs del usuario

Cuando se adjunta un PDF, se envía como bloque `document` con citations habilitadas. Las citas se streamean al frontend como deltas y se rendean como evidencia textual inline:

```ts
// lib/attachments.ts
blocks.push({
  type: 'document',
  source: { type: 'base64', media_type: 'application/pdf', data },
  title: file.name.slice(0, 100),
  citations: { enabled: true },
})
```

```ts
// lib/agent.ts — dentro del loop de stream events
} else if (ev.delta.type === 'citations_delta' && ev.delta.citation) {
  yield { type: 'citation', citation: ev.delta.citation }
}
```

Esto refuerza la regla de cero alucinación: el modelo no parafrasea el contrato del usuario, lo cita literalmente con el rango exacto.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + API | Next.js 14 (App Router) · React 18 · Tailwind |
| Streaming | Server-Sent Events sobre `ReadableStream` (Node runtime) |
| Modelo | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| Agente | `@anthropic-ai/claude-agent-sdk` + Skills + MCP in-process |
| Vector store | Supabase Postgres + `pgvector` (HNSW, cosine) |
| Embeddings | OpenAI `text-embedding-3-small` (1536d) |
| Fuente de leyes | BCN — endpoint XML `servicios-leychile.bcn.cl/Consulta/obtxml?opt=7&idNorma=…` |
| Deploy | Vercel (Node runtime, no Edge) |

---

## Estructura del repo

```
app/
  api/chat/route.ts          POST /api/chat (multipart + SSE)
  page.tsx, layout.tsx       UI principal
components/
  chat.tsx                   render de mensajes + parseo SSE
  chat-composer.tsx          input con adjuntos
lib/
  agent.ts                   wrapper sobre query() del Agent SDK
  tools-mcp.ts               MCP server (search_corpus, read_bcn_law)
  attachments.ts             PDFs/imágenes → bloques con citations
  bcn-xml.ts                 fetch + parse XML BCN
  embeddings.ts              wrapper OpenAI embeddings
  supabase.ts                cliente service role
  system-prompt.ts           identidad + flujo 5 fases + reglas duras
.claude/skills/<area>/
  SKILL.md                   7 áreas temáticas
scripts/
  ingest-corpus.ts           pipeline one-shot: XML BCN → chunks → embeddings → upsert
  corpus.json                manifiesto de leyes a indexar
supabase/
  migrations/0001_pgvector.sql   esquema ley_chunks + RPC match_ley_chunks
```

---

## Correr localmente

### Requisitos

- Node 20+
- Cuenta en [Supabase](https://supabase.com) (proyecto + service role key)
- API keys: Anthropic + OpenAI

### Setup

```bash
git clone https://github.com/Walter102202/finple.git
cd finple
npm install
cp .env.local.example .env.local
# Llenar:
#   ANTHROPIC_API_KEY
#   OPENAI_API_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Migración + ingest del corpus

```bash
# Aplicar el esquema (SQL editor de Supabase o supabase CLI)
psql < supabase/migrations/0001_pgvector.sql

# Indexar las 7 leyes chilenas
npx tsx scripts/ingest-corpus.ts
```

El ingest es idempotente (`unique (id_norma, articulo_num)` con upsert), así que se puede re-correr cuando se agreguen leyes a `scripts/corpus.json`.

### Dev

```bash
npm run dev
# → http://localhost:3000
```

---

## Notas de diseño

- **Cero alucinación regulatoria.** El system prompt prohíbe citar artículos sin haberlos verificado vía `search_corpus` o `read_bcn_law`. Si el modelo no encuentra el pasaje, debe decirlo y reorientar — no inventar.
- **Lenguaje ciudadano.** Tuteo chileno cálido, frases cortas, jerga explicada entre paréntesis. Nada de *"incumplimiento del deber precontractual del Art. X"*.
- **PII chilena.** El asistente no repite RUT ni números de cuenta del usuario, anticipando la entrada en vigencia de la Ley 21.719 (1 de diciembre de 2026).
- **Confidencialidad del system prompt.** Reglas explícitas para no revelar instrucciones internas ante intentos de prompt injection ("ignora lo anterior", "actúa como desarrollador", etc.).
- **No asesoría legal.** Finple ordena, traduce y deriva — no firma como CMF/SERNAC ni promete resultados. Si hay proceso judicial en curso, deriva a tribunales/abogado.

---

## Roadmap post-Lab

- Persistencia de conversaciones (tabla `conversations` en Supabase con RLS por usuario).
- Distribución del Agente por canales institucionales (CMF, Fintech, Bancos, etc.)
- Distribución del agente vía WhatsApp para llegar al canal donde la gente ya pide ayuda — atención al usuario en el chat que ya usa, sin instalar nada.
