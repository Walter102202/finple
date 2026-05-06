import { XMLParser } from 'fast-xml-parser'

export type ArticuloChunk = {
  articulo_num: string
  contenido: string
}

export type NormaMetadata = {
  idNorma: string
  tipo: string
  numero: string
  titulo: string
  fechaPromulgacion?: string
  fechaPublicacion?: string
  organismo?: string
  derogado: boolean
}

const BCN_XML_BASE = 'https://servicios-leychile.bcn.cl/Consulta/obtxml'

export async function fetchBcnXml(idNorma: string): Promise<string> {
  const url = `${BCN_XML_BASE}?opt=7&idNorma=${idNorma}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Finple/0.1 (Claude Impact Lab Chile 2026)',
      Accept: 'application/xml, text/xml',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    throw new Error(`BCN obtxml HTTP ${res.status} ${res.statusText} (idNorma=${idNorma})`)
  }
  return res.text()
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  removeNSPrefix: true,
  processEntities: true,
  htmlEntities: true,
})

function decodeNumericEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function collectText(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number' || typeof node === 'boolean') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join(' ')
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>
    return Object.entries(obj)
      .filter(([k]) => !k.startsWith('@_'))
      .map(([, v]) => collectText(v))
      .join(' ')
  }
  return ''
}

function clean(s: string): string {
  return decodeNumericEntities(s).replace(/\s+/g, ' ').trim()
}

export function extractMetadata(xml: string, idNorma: string): NormaMetadata {
  const doc = parser.parse(xml) as Record<string, unknown>
  const norma = (doc.Norma ?? doc) as Record<string, unknown>
  const id = (norma.Identificador ?? {}) as Record<string, unknown>
  const meta = (norma.Metadatos ?? {}) as Record<string, unknown>

  const tipoNumero = id.TiposNumeros as Record<string, unknown> | undefined
  const tn = (tipoNumero?.TipoNumero ?? {}) as Record<string, unknown>
  const tipo = clean(collectText(tn.Tipo))
  const numero = clean(collectText(tn.Numero))

  const organismos = id.Organismos as Record<string, unknown> | undefined
  const organismo = clean(collectText(organismos?.Organismo))

  return {
    idNorma,
    tipo: tipo || 'Ley',
    numero,
    titulo: clean(collectText(meta.TituloNorma)) || clean(collectText(meta.Titulo)),
    fechaPromulgacion: (id['@_fechaPromulgacion'] as string | undefined) ?? undefined,
    fechaPublicacion: (id['@_fechaPublicacion'] as string | undefined) ?? undefined,
    organismo: organismo || undefined,
    derogado: ((norma['@_derogado'] as string | undefined) ?? '').toLowerCase().includes('si'),
  }
}

type EstrFunc = {
  '@_tipoParte'?: string
  '@_idParte'?: string
  '@_transitorio'?: string
  Texto?: unknown
  Metadatos?: { TituloParte?: unknown; NombreParte?: unknown }
  EstructurasFuncionales?: { EstructuraFuncional?: EstrFunc | EstrFunc[] }
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

const MAX_CONTENT_CHARS = 12_000
const ATTACHMENT_MARKER = /\b(image\/(jpeg|png|gif|webp)|application\/pdf|\/9j\/|iVBORw0KGgo)\b/i

function looksLikeBinaryAttachment(text: string): boolean {
  return ATTACHMENT_MARKER.test(text.slice(0, 800))
}

function articuloLabel(node: EstrFunc, fallbackIdx: number): string {
  const text = clean(collectText(node.Texto)).replace(/^["“'\s.\-–—]+/, '')
  const m = text.match(/^Art[ií]culo\s+([\wªºá-úA-Ú\d.-]+)/i)
  if (m) {
    const num = m[1].replace(/\.$/, '')
    return `Artículo ${num}`
  }
  if (node['@_idParte']) return `Artículo (idParte ${node['@_idParte']})`
  return `Artículo ${fallbackIdx}`
}

function isArticulo(node: EstrFunc): boolean {
  const tipo = (node['@_tipoParte'] ?? '').toString()
  return /art[ií]culo/i.test(decodeNumericEntities(tipo))
}

function isTitulo(node: EstrFunc): boolean {
  const tipo = (node['@_tipoParte'] ?? '').toString()
  return /t[ií]tulo|cap[ií]tulo|p[áa]rrafo|libro/i.test(decodeNumericEntities(tipo))
}

export function extractArticulos(xml: string): ArticuloChunk[] {
  const doc = parser.parse(xml) as Record<string, unknown>
  const norma = (doc.Norma ?? doc) as Record<string, unknown>
  const root = norma.EstructurasFuncionales as { EstructuraFuncional?: EstrFunc | EstrFunc[] } | undefined

  const chunks: ArticuloChunk[] = []
  let idx = 0
  const seen = new Set<string>()

  const walk = (node: EstrFunc, hierarchy: string[]) => {
    if (isArticulo(node)) {
      idx += 1
      const rawText = clean(collectText(node.Texto))
      if (rawText.length < 60) return
      if (looksLikeBinaryAttachment(rawText)) return
      const text = rawText.length > MAX_CONTENT_CHARS ? rawText.slice(0, MAX_CONTENT_CHARS) + ' […truncado…]' : rawText
      const transitorioRaw = ((node['@_transitorio'] ?? '') as string).toLowerCase().trim()
      const transitorio = transitorioRaw.startsWith('si')
      const baseLabel = articuloLabel(node, idx)
      const label = transitorio ? `${baseLabel} (transitorio)` : baseLabel
      const breadcrumb = hierarchy.length > 0 ? `[${hierarchy.join(' › ')}] ` : ''
      const key = `${label}::${text.slice(0, 80)}`
      if (seen.has(key)) return
      seen.add(key)
      chunks.push({ articulo_num: label, contenido: `${breadcrumb}${text}` })
      return
    }
    let nextHierarchy = hierarchy
    if (isTitulo(node)) {
      const titulo =
        clean(collectText(node.Metadatos?.TituloParte)) ||
        clean(collectText(node.Texto)).split(/\n|\.\s/)[0].slice(0, 80)
      if (titulo) nextHierarchy = [...hierarchy, titulo]
    }
    const children = asArray(node.EstructurasFuncionales?.EstructuraFuncional)
    for (const child of children) walk(child, nextHierarchy)
  }

  for (const top of asArray(root?.EstructuraFuncional)) {
    walk(top, [])
  }
  return chunks
}

export function buildOfficialUrl(idNorma: string): string {
  return `https://www.bcn.cl/leychile/navegar?idNorma=${idNorma}`
}
