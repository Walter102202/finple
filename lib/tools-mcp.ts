import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { embedQuery } from './embeddings'
import { getSupabaseAdmin } from './supabase'
import { fetchBcnXml, extractArticulos, extractMetadata, buildOfficialUrl } from './bcn-xml'
import { runFetchOfficialSource } from './tools'

const SKILL_AREAS = [
  'creditos_consumo',
  'cobros_indebidos',
  'fraude_suplantacion',
  'fintech_inversiones',
  'datos_personales',
  'criptoactivos_tributacion',
  'regulacion_autoridades',
] as const

const SOURCE_TYPES = ['ley', 'ncg', 'dictamen'] as const

type MatchedChunk = {
  source_type: string
  id_norma: string
  ley_alias: string
  documento_id: string
  documento_label: string
  contenido: string
  url_oficial: string
  area_skill: string
  similarity: number
}

type CorpusRow = {
  ley_alias: string
  documento_id: string
  documento_label: string | null
  contenido: string
  url_oficial: string
  area_skill: string
}

const searchCorpusTool = tool(
  'search_corpus',
  [
    'Busca pasajes verificables en el corpus normativo Finple.',
    'Cubre tres tipos de fuente: leyes BCN (source=ley), Normas de Carácter General de la CMF (source=ncg) y dictámenes interpretativos del SERNAC (source=dictamen).',
    'Devuelve los 6 mejores chunks con cita exacta, etiqueta del documento (artículo / numeral / sección), alias y URL oficial.',
    'Úsalo SIEMPRE antes de afirmar qué dice una norma específica. Si no devuelve el pasaje, llama read_bcn_law / read_ncg / read_dictamen según el tipo.',
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
    sourceType: z
      .enum(SOURCE_TYPES)
      .optional()
      .describe(
        "Filtra por tipo: 'ley' (BCN), 'ncg' (CMF), 'dictamen' (SERNAC). Omite para buscar en los tres.",
      ),
  },
  async ({ query, area, sourceType }) => {
    try {
      const embedding = await embedQuery(query)
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase.rpc('match_ley_chunks', {
        query_embedding: embedding,
        match_count: 6,
        filter_area: area ?? null,
        filter_source_type: sourceType ?? null,
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
              text: 'Sin coincidencias en el corpus. Considera afinar la consulta o llamar read_bcn_law / read_ncg / read_dictamen.',
            },
          ],
        }
      }
      const formatted = rows
        .map((r, i) => {
          const label = r.documento_label || r.documento_id
          return `[${i + 1}] ${r.ley_alias} — ${label} (source=${r.source_type}, sim=${r.similarity.toFixed(2)}, area=${r.area_skill})\n${r.contenido.slice(0, 1200)}\nFuente: ${r.url_oficial}`
        })
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
            c.articulo_num
              .toLowerCase()
              .replace(/[^\wíáéóú]/g, '')
              .includes(needle.replace(/[^\wíáéóú]/g, '')),
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

async function readCorpusDoc(
  sourceType: 'ncg' | 'dictamen',
  idNorma: string,
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('ley_chunks')
      .select('ley_alias,documento_id,documento_label,contenido,url_oficial,area_skill')
      .eq('source_type', sourceType)
      .eq('id_norma', idNorma)
      .order('documento_id')
      .limit(20)
    if (error) {
      return {
        content: [{ type: 'text' as const, text: `Error leyendo ${sourceType} ${idNorma}: ${error.message}` }],
        isError: true,
      }
    }
    const rows = (data ?? []) as CorpusRow[]
    if (rows.length === 0) {
      const noun = sourceType === 'ncg' ? 'NCG' : 'Dictamen'
      return {
        content: [
          {
            type: 'text' as const,
            text: `${noun} ${idNorma} no está en el corpus indexado. Si crees que debería estar, avisa al equipo Finple para agregarlo al manifest.`,
          },
        ],
      }
    }
    const alias = rows[0].ley_alias
    const url = rows[0].url_oficial
    const area = rows[0].area_skill
    const limited = rows.slice(0, 10)
    const header = `${alias}\nÁrea: ${area}\nFuente oficial: ${url}\nTotal secciones disponibles: ${rows.length}\n`
    const body = limited
      .map((r) => `\n--- ${r.documento_label || r.documento_id} ---\n${r.contenido.slice(0, 2000)}`)
      .join('\n')
    const footer =
      rows.length > limited.length
        ? `\n\n[Mostrando ${limited.length} de ${rows.length} secciones. Usa search_corpus para buscar dentro de este documento.]`
        : ''
    return { content: [{ type: 'text' as const, text: `${header}${body}${footer}` }] }
  } catch (e) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Excepción leyendo ${sourceType} ${idNorma}: ${e instanceof Error ? e.message : String(e)}`,
        },
      ],
      isError: true,
    }
  }
}

const readNcgTool = tool(
  'read_ncg',
  [
    'Devuelve los numerales indexados de una Norma de Carácter General de la CMF.',
    'Lee desde el corpus ya ingestado (no descarga el PDF al runtime), así que solo funciona con NCGs presentes en scripts/ncg-corpus.json.',
    'Úsalo cuando search_corpus apunte a una NCG y necesites el contexto de varios numerales.',
  ].join(' '),
  {
    ncgId: z
      .string()
      .regex(/^\d+$/, 'ncgId debe ser numérico')
      .describe('Número de la NCG (ej: "502" para NCG 502 sobre RPSF).'),
  },
  async ({ ncgId }) => readCorpusDoc('ncg', ncgId),
)

const readDictamenTool = tool(
  'read_dictamen',
  [
    'Devuelve el texto íntegro de un dictamen interpretativo del SERNAC indexado en el corpus.',
    'Lee desde el corpus (no re-fetchea sernac.cl).',
    'Úsalo cuando search_corpus apunte a un dictamen y quieras el detalle completo.',
  ].join(' '),
  {
    dictamenId: z
      .string()
      .min(2)
      .describe('Identificador del dictamen tal como aparece en el manifest (ej: "art-88180").'),
  },
  async ({ dictamenId }) => readCorpusDoc('dictamen', dictamenId),
)

const fetchOfficialSourceTool = tool(
  'fetch_official_source',
  [
    'Descarga texto plano (hasta 8000 chars) desde una URL oficial chilena para verificar información NO-ley:',
    'RPSF de la CMF (registro de fintech autorizadas), alertas CMF al público, dictámenes SERNAC live,',
    'plazos vigentes, comunicados ANCI, info SII actualizada, Ley Fácil de BCN.',
    'NO la uses para citar texto de leyes — para eso usa search_corpus, read_bcn_law, read_ncg o read_dictamen.',
    'Dominios permitidos: bcn.cl, cmfchile.cl, sernac.cl, sii.cl, anci.gob.cl, suseso.cl, spensiones.cl, csirt.gob.cl, bcentral.cl, gob.cl.',
  ].join(' '),
  {
    url: z
      .string()
      .url()
      .describe(
        'URL completa de la página o documento oficial chileno (debe estar en la lista de dominios permitidos).',
      ),
    reason: z
      .string()
      .describe(
        'Qué afirmación o dato concreto vas a verificar — ej. "verificar si TPay aparece en el RPSF".',
      ),
  },
  async (input) => {
    const text = await runFetchOfficialSource(input)
    const isError = text.startsWith('Error')
    return {
      content: [{ type: 'text' as const, text }],
      ...(isError ? { isError: true } : {}),
    }
  },
)

export const finpleMcpServer = createSdkMcpServer({
  name: 'finple-corpus',
  version: '0.3.0',
  tools: [searchCorpusTool, readBcnLawTool, readNcgTool, readDictamenTool, fetchOfficialSourceTool],
})

export const FINPLE_TOOL_NAMES = [
  'mcp__finple-corpus__search_corpus',
  'mcp__finple-corpus__read_bcn_law',
  'mcp__finple-corpus__read_ncg',
  'mcp__finple-corpus__read_dictamen',
  'mcp__finple-corpus__fetch_official_source',
] as const
