# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este repositorio

Proyecto del equipo **Finple** para el **Claude Impact Lab Chile 2026** — desafío único "Inclusión Financiera para Chile", **Línea 01** (traducir normativa CMF/SII a lenguaje simple).

**Concepto actual** (puede iterar, pero sin salirse de Línea 01):
> Un asistente conversacional que ayuda al público *retail* chileno a entender el marco regulatorio aplicable a sus inversiones e instrumentos financieros (incluyendo créditos hipotecarios). Claude analiza la pregunta del usuario, cruza con legislación chilena + documentos adjuntos + páginas oficiales (CMF, bancos, gestores) y responde con contexto normativo.

Alineación con el "tip de regulador" de la CMF (ver `info/Brief_CMF.md`): la CMF quiere ver un agente que oriente consultas y reclamaciones financieras del ciudadano, cruzando hechos con normativa vigente y derivando a la autoridad correcta (CMF, SERNAC, SUSESO, SUPEN, tribunales) cuando aplica. Si el alcance se mueve hacia consultas/reclamos, sigue dentro de Línea 01.

**Estado del repo:** documentos de briefing, sin código aún. La construcción ocurre **6–7 mayo 2026 (UTC-4)**; commits fuera de esa ventana se penalizan con score técnico = 0.

## Cómo navegar este repo (routing por intención)

Toda la documentación de briefing vive en `info/`. Antes de responder, ubica de qué tema se trata y abre el doc correspondiente:

| Si la conversación es sobre… | Abre primero |
|---|---|
| Qué pide la CMF, alcance Línea 01, casos de uso del agente | `info/Brief_CMF.md` |
| Marco legal chileno (Ley Fintec 21.521, 21.719 datos, 21.459 delitos, 21.663 ciber, SII, SERNAC, NCGs, datasets públicos, APIs) | `info/Legal.md` |
| Modelos Claude, Agent SDK, MCP, prompt caching, Files API, stack (Next.js/Supabase), snippets | `info/stack_recomendado.md` |
| Fechas, rúbrica, gates, entregables, premios, jurado, qué traer | `info/info_evento.md` |
| Segmento ciudadano, canal de adopción (B2C/B2B2C/B2G/B2NGO), value prop, viabilidad post-Lab | `info/comercial.md` |

No dupliques contenido entre archivos: si el usuario pregunta por una ley, lee `info/Legal.md` (no inventes desde memoria); si pregunta por un modelo o snippet, lee `info/stack_recomendado.md`.

## Hard constraints — no negociables (fuente: `info/info_evento.md`)

Estas reglas determinan si el proyecto es válido. Respétalas siempre que sugieras código, copy o decisiones de producto:

- **Claude obligatorio como motor principal.** Otros LLMs no pueden ser el cerebro del agente.
- **Cero alucinación regulatoria.** Si el agente cita "Ley X art. Y", debe ser real y con fuente verificable. Esto es un gate descalificador. Cuando escribas prompts/respuestas, ancla siempre con citas a `info/Legal.md` o links oficiales (BCN, CMF, SII, ANCI). Prefiere abstenerse a inventar.
- **Ventana de construcción 6 mayo 00:00 → 7 mayo 23:59 (Chile, UTC-4).** Nada de trabajo preexistente: el jurado verifica commits + consola Claude.
- **PII chilena (RUT, datos bancarios)** — minimización desde el día 1, aunque la Ley 21.719 entre en vigencia recién dic 2026. Diseña pensando en cumplirla en producción.
- **Modelos Claude — IDs sin sufijos de fecha:** `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`. Opus 4.7 usa adaptive thinking: NO enviar `temperature`, `top_p`, `top_k` ni `budget_tokens` (devuelve 400).
- **API key solo en backend.** Nunca expuesta en frontend.

## Rúbrica — pesos a optimizar (fuente: `info/info_evento.md`)

| Criterio | Peso |
|---|---|
| Impacto ciudadano | 25% |
| Datos responsables | 20% |
| Uso de Claude y pensamiento agéntico | 25% |
| Funciona | 15% |
| Pitch y narrativa ciudadana | 15% |
| Bonus agéntico | +5 |

Decisiones de producto deben empujar varios criterios a la vez. "Impacto ciudadano" exige **segmento específico + canal de adopción concreto + viabilidad post-Lab** (ver `info/comercial.md` §1–4). "Datos responsables" se gana citando bien y minimizando PII. "Pensamiento agéntico" se gana usando Agent SDK/MCP/Extended Thinking de forma justificada — no por checkboxes.

## Stack técnico recomendado

Default sugerido en `info/stack_recomendado.md` (úsalo salvo razón fuerte para cambiar):

- **Frontend/fullstack:** Next.js 14+ App Router, deploy en Vercel
- **Backend/DB:** Supabase (Postgres + Auth + Storage + pgvector). RLS desde el día 1; no usar `service_role` en rutas públicas
- **IA:** `@anthropic-ai/sdk` para llamadas directas; `@anthropic-ai/claude-agent-sdk` para agentes; `@modelcontextprotocol/sdk` si expones datos propios como tools
- **Patrones útiles para este proyecto:**
  - **Tool use con Zod** (`betaZodTool` + `toolRunner`) para que Claude consulte registros (RPSF de la CMF, normativa, etc.)
  - **Files API + citations** para subir circulares/contratos PDF y citar pasajes (ver snippet en `info/stack_recomendado.md`)
  - **Prompt caching** para el system prompt grande con normativa estable (mín. 4096 tokens en Opus/Haiku, 2048 en Sonnet; pon lo estable primero)
  - **Extended thinking** (`thinking: { type: 'adaptive' }`, `output_config.effort`) para análisis legal complejo
  - **RAG con pgvector** si se ingesta corpus regulatorio extenso

Cuando se cree código de cero, instala con `npm install @anthropic-ai/sdk @anthropic-ai/claude-agent-sdk` y deploy con `vercel`. Aún no hay `package.json`, build, lint ni tests configurados — al inicializar, propónlos consistentes con Next.js + TypeScript.

## Datos públicos para conectar (sin inventar)

Lista canónica en `info/Legal.md` §"Datasets y APIs públicas". Highlights:

- **BCN API Ley Fácil** (JSON, gratis) — explicar leyes en lenguaje ciudadano
- **API Banco Central (BDE)** — series estadísticas, requiere registro
- **CMF** — sin REST pública; HTML/PDF, scraping respetuoso (rate limit 1 req/s, respetar `robots.txt`, cachear)
- **SII normativa** — HTML/PDF
- **PhishTank** — REST pública, útil para Línea 02 (no nuestra línea, pero referencia)

Si el agente necesita "consultar la CMF en tiempo real", la realidad es scraping + caché local — no prometas API que no existe.

## Foco de producto (de `info/comercial.md`)

El Impact Lab mide **impacto cívico, no modelo de negocio**. Cuando ayudes a redactar value prop, ficha cívica o pitch, usa la plantilla:

> Para [segmento específico] que [problema ciudadano real], [solución] [qué hace con IA] para que [beneficio humano concreto] — llegando vía [canal de adopción].

Los 4 perfiles de la landing (universitaria perdida, jubilado invisible, emprendedora a ciegas, víctima del fraude) son punto de partida. Evita "chilenos en general" — no puntúa.

## Entregables y deadlines (fuente: `info/info_evento.md`)

| Entregable | Deadline | Qué incluye |
|---|---|---|
| Ficha cívica | 7 mayo 10:00 | Línea, problema, segmento, value prop, canal, datos usados |
| Entregable técnico | 7 mayo 17:00 | **Obligatorio:** demo video 3–5 min + screenshot consola Claude + system prompt principal. **Opcional bonus:** repo/ZIP, tools schema, herramientas Anthropic declaradas (MCP, Agent SDK, Extended Thinking, Files API, Computer Use) |
| Pitch en vivo | 7 mayo, demo day | 3 min + 2 min Q&A |

Código no es obligatorio, pero el bonus técnico viene de declarar y demostrar uso real de herramientas Anthropic.

## Tono al colaborar en este repo

- El usuario es Walter (zona Chile, UTC-4). Castellano por defecto.
- Hoy es 2026-05-06 — día 1 del hackathon. Prioriza acción y entregables sobre planificación extensa.
- Antes de proponer normativa, ley, NCG o dataset: verifica en `info/Legal.md`. Si no está ahí, dilo y pide la fuente antes de citarla.
- Antes de proponer un modelo, snippet o feature de la API: verifica en `info/stack_recomendado.md`.
