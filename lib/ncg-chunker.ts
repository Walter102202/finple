const MAX_CONTENT_CHARS = 12_000
const MIN_CHUNK_CHARS = 80
const MIN_HEADER_BODY_CHARS = 60
const SUBDIVIDE_THRESHOLD = 2_400
const FALLBACK_TARGET = 1_200

export type NcgChunk = {
  documento_id: string
  documento_label: string
  contenido: string
}

const TOC_LINE_RE = /\.{3,}\s*\d+\s*$/

const HEADER_PATTERNS: Array<{ level: number; re: RegExp; norm: (m: RegExpMatchArray) => string }> = [
  { level: 1, re: /^\s*([IVXLCDM]+)\.\s+([A-ZÁÉÍÓÚÑ].{2,})$/, norm: (m) => m[1].toUpperCase() },
  { level: 2, re: /^\s*([A-Z])\.\s+([A-ZÁÉÍÓÚÑ].{2,})$/, norm: (m) => m[1].toUpperCase() },
  { level: 3, re: /^\s*([A-Z])\.(\d+(?:\.\d+){0,2})\.?\s+(.{2,})$/, norm: (m) => `${m[1].toUpperCase()}.${m[2]}` },
  { level: 4, re: /^\s*(\d+(?:\.\d+){1,3})\.?\s+([A-ZÁÉÍÓÚÑ].{2,})$/, norm: (m) => m[1] },
  { level: 5, re: /^\s*(\d+)\.\s+([A-ZÁÉÍÓÚÑ].{2,})$/, norm: (m) => m[1] },
]

type HeaderHit = { level: number; key: string; title: string }

function detectHeader(line: string): HeaderHit | null {
  const trimmed = line.trim()
  if (trimmed.length < 4 || trimmed.length > 240) return null
  if (TOC_LINE_RE.test(trimmed)) return null
  for (const { level, re, norm } of HEADER_PATTERNS) {
    const m = trimmed.match(re)
    if (m) {
      const title = (m[3] ?? m[2] ?? '').trim().replace(/\s{2,}/g, ' ')
      if (!title || /^\d+$/.test(title)) continue
      return { level, key: norm(m), title }
    }
  }
  return null
}

export function extractNcgChunks(text: string): NcgChunk[] {
  const lines = text.split(/\r?\n/)
  const chunks: NcgChunk[] = []
  const path: { key: string; title: string; level: number }[] = []
  let curId: string | null = null
  let curLabel: string | null = null
  let curBody: string[] = []
  const seen = new Set<string>()

  const flush = () => {
    if (!curId || !curLabel) return
    const body = curBody.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    if (body.length < MIN_HEADER_BODY_CHARS) {
      curId = null
      curLabel = null
      curBody = []
      return
    }
    const idKey = curId
    if (seen.has(idKey)) {
      curId = null
      curLabel = null
      curBody = []
      return
    }
    const finalId = idKey
    seen.add(finalId)
    const breadcrumb = path.length > 0 ? `[${path.map((p) => `${p.key} ${p.title}`).join(' › ')}] ` : ''
    if (body.length > SUBDIVIDE_THRESHOLD) {
      const subs = subdivide(body)
      subs.forEach((s, i) => {
        const sid = subs.length > 1 ? `${finalId}_p${i + 1}` : finalId
        const slabel = subs.length > 1 ? `${curLabel} (parte ${i + 1})` : curLabel!
        chunks.push({
          documento_id: sid,
          documento_label: slabel,
          contenido: (breadcrumb + s).slice(0, MAX_CONTENT_CHARS),
        })
      })
    } else {
      chunks.push({
        documento_id: finalId,
        documento_label: curLabel!,
        contenido: (breadcrumb + body).slice(0, MAX_CONTENT_CHARS),
      })
    }
    curId = null
    curLabel = null
    curBody = []
  }

  for (const rawLine of lines) {
    const line = rawLine
    const trimmed = line.trim()
    if (!trimmed) {
      if (curId) curBody.push('')
      continue
    }
    if (TOC_LINE_RE.test(trimmed)) continue
    const hit = detectHeader(trimmed)
    if (hit) {
      flush()
      while (path.length > 0 && path[path.length - 1].level >= hit.level) path.pop()
      path.push({ key: hit.key, title: hit.title, level: hit.level })
      const idPath = path.map((p) => p.key).join('.')
      curId = idPath
      curLabel = `${idPath} ${hit.title}`
      curBody = []
      continue
    }
    if (curId) curBody.push(line)
  }
  flush()

  if (chunks.length < 3) {
    console.warn(
      `[ncg-chunker] solo ${chunks.length} secciones detectadas — usando fallback por bloques de ~${FALLBACK_TARGET} chars`,
    )
    return fallbackChunks(text)
  }
  return chunks.filter((c) => c.contenido.trim().length >= MIN_CHUNK_CHARS)
}

function subdivide(body: string): string[] {
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim())
  const out: string[] = []
  let buf = ''
  for (const p of paragraphs) {
    if (buf && buf.length + p.length > SUBDIVIDE_THRESHOLD / 2) {
      out.push(buf.trim())
      buf = p
    } else {
      buf = buf ? buf + '\n\n' + p : p
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out.length > 0 ? out : [body]
}

function fallbackChunks(text: string): NcgChunk[] {
  const cleaned = text.trim()
  const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const chunks: NcgChunk[] = []
  let buffer = ''
  let idx = 1
  const push = () => {
    const body = buffer.trim()
    if (body.length < MIN_CHUNK_CHARS) return
    chunks.push({
      documento_id: `bloque_${idx}`,
      documento_label: `Bloque ${idx}`,
      contenido: body.slice(0, MAX_CONTENT_CHARS),
    })
    idx++
  }
  for (const p of paragraphs) {
    if (buffer && buffer.length + p.length > FALLBACK_TARGET) {
      push()
      buffer = p
    } else {
      buffer = buffer ? buffer + '\n\n' + p : p
    }
  }
  if (buffer.trim()) push()
  return chunks
}
