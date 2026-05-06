import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { embedQuery } from './embeddings'
import { getSupabaseAdmin } from './supabase'
import { fetchBcnXml, extractArticulos, extractMetadata, buildOfficialUrl } from './bcn-xml'

const SKILL_AREAS = [
  'creditos_consumo',
  'cobros_indebidos',
  'fraude_suplantacion',
  'fintech_inversiones',
  'datos_personales',
  'criptoactivos_tributacion',
  'regulacion_autoridades',
] as const

type MatchedChunk = {
  ley_alias: string
  articulo_num: string
  contenido: string
  url_oficial: string
  area_skill: string
  similarity: number
}

const searchCorpusTool = tool(
  'search_corpus',
  [
    'Busca artículos de leyes chilenas (BCN) semánticamente relevantes para una pregunta concreta.',
    'Devuelve los 6 mejores chunks con cita exacta, número de artículo, alias de la ley y URL oficial.',
    'Úsalo SIEMPRE antes de afirmar qué dice una ley específica. Si los resultados no responden, llama read_bcn_law.',
  ].join(' '),
  {
    query: z
      .string()
      .min(4)
      .describe('Pregunta o afirmación normativa a verificar, en español natural.'),
    area: z
      .enum(SKILL_AREAS)
      .optional()
      .describe('Filtra por área temática si tienes certeza. Omite para buscar en todo el corpus.'),
  },
  async ({ query, area }) => {
    try {
      const embedding = await embedQuery(query)
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase.rpc('match_ley_chunks', {
        query_embedding: embedding,
        match_count: 6,
        filter_area: area ?? null,
      })
      if (error) {
        return {
          content: [{ type: 'text' as const, text: `Error en search_corpus: ${error.message}` }],
          isError: true,
        }
      }
      const rows = (data ?? []) as MatchedChunk[]
      if (rows.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Sin coincidencias en el corpus. Considera afinar la consulta o llamar read_bcn_law con una idNorma específica.',
            },
          ],
        }
      }
      const formatted = rows
        .map(
          (r, i) =>
            `[${i + 1}] ${r.ley_alias} — ${r.articulo_num} (sim=${r.similarity.toFixed(2)}, area=${r.area_skill})\n${r.contenido.slice(0, 1200)}\nFuente: ${r.url_oficial}`,
        )
        .join('\n\n---\n\n')
      return { content: [{ type: 'text' as const, text: formatted }] }
    } catch (e) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Excepción en search_corpus: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      }
    }
  },
)

const readBcnLawTool = tool(
  'read_bcn_law',
  [
    'Descarga y parsea el XML oficial de una ley chilena desde servicios-leychile.bcn.cl.',
    'Devuelve metadatos y el listado de artículos con texto íntegro.',
    'Úsalo cuando search_corpus no encuentre el artículo o necesites el texto completo de la ley.',
  ].join(' '),
  {
    idNorma: z
      .string()
      .regex(/^\d+$/, 'idNorma debe ser numérico')
      .describe('ID numérico de la norma en BCN (ej: "1187323" para Ley 21.521 Fintec).'),
    articulo: z
      .string()
      .optional()
      .describe('Si quieres un artículo puntual: "1", "primero transitorio", etc. Omitir para listar todos.'),
  },
  async ({ idNorma, articulo }) => {
    try {
      const xml = await fetchBcnXml(idNorma)
      const meta = extractMetadata(xml, idNorma)
      const url = buildOfficialUrl(idNorma)
      const chunks = extractArticulos(xml)
      if (chunks.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `${meta.tipo} N° ${meta.numero} (${meta.titulo}) — sin artículos parseables. Fuente: ${url}`,
            },
          ],
        }
      }
      let selected = chunks
      if (articulo) {
        const needle = articulo.toLowerCase().trim()
        selected = chunks.filter(
          (c) =>
            c.articulo_num.toLowerCase().includes(needle) ||
            c.articulo_num.toLowerCase().replace(/[^\wíáéóú]/g, '').includes(needle.replace(/[^\wíáéóú]/g, '')),
        )
        if (selected.length === 0) selected = chunks.slice(0, 3)
      }
      const limited = selected.slice(0, 8)
      const header = `${meta.tipo} N° ${meta.numero} — ${meta.titulo}\nPromulgación: ${meta.fechaPromulgacion ?? 'N/D'} · Publicación: ${meta.fechaPublicacion ?? 'N/D'} · Organismo: ${meta.organismo ?? 'N/D'}\nFuente oficial: ${url}\nTotal artículos disponibles: ${chunks.length}\n`
      const body = limited
        .map((c) => `\n--- ${c.articulo_num} ---\n${c.contenido.slice(0, 2000)}`)
        .join('\n')
      const footer =
        chunks.length > limited.length
          ? `\n\n[Mostrando ${limited.length} de ${chunks.length} artículos. Pídele al asistente que pase a search_corpus para buscar pasajes específicos.]`
          : ''
      return {
        content: [
          {
            type: 'text' as const,
            text: `${header}${body}${footer}`,
          },
        ],
      }
    } catch (e) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error leyendo idNorma=${idNorma}: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      }
    }
  },
)

export const finpleMcpServer = createSdkMcpServer({
  name: 'finple-corpus',
  version: '0.1.0',
  tools: [searchCorpusTool, readBcnLawTool],
})

export const FINPLE_TOOL_NAMES = [
  'mcp__finple-corpus__search_corpus',
  'mcp__finple-corpus__read_bcn_law',
] as const
