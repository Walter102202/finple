import * as cheerio from 'cheerio'
import { fetchPdfBuffer, extractPdfText, cleanPdfText } from './pdf-text'

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const FETCH_TIMEOUT_MS = 30_000
const MAX_CONTENT_CHARS = 12_000
const MIN_CHUNK_CHARS = 80
const TARGET_CHUNK = 1200
const OVERLAP = 100

export type DictamenChunk = {
  documento_id: string
  documento_label: string
  contenido: string
}

export async function fetchDictamenText(url: string): Promise<string> {
  if (url.toLowerCase().endsWith('.pdf')) {
    const buf = await fetchPdfBuffer(url)
    const { text } = await extractPdfText(buf)
    return cleanPdfText(text)
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/pdf,*/*' },
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    if (res.status >= 500) {
      await sleep(1500)
      const retry = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } })
      if (!retry.ok) throw new Error(`HTTP ${retry.status} (retry) fetching ${url}`)
      return await retry.text().then(extractFromHtml)
    }
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  const ct = (res.headers.get('content-type') ?? '').toLowerCase()
  if (ct.includes('application/pdf')) {
    const buf = new Uint8Array(await res.arrayBuffer())
    const { text } = await extractPdfText(buf)
    return cleanPdfText(text)
  }
  const html = await res.text()
  return extractFromHtml(html)
}

function extractFromHtml(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, noscript, iframe').remove()
  let root = $('main').first()
  if (root.length === 0) root = $('article').first()
  if (root.length === 0) root = $('.contenido').first()
  if (root.length === 0) root = $('#contenido').first()
  if (root.length === 0) root = $('body').first()
  const text = root.text() ?? ''
  return text
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function chunkDictamen(text: string, dictamenId: string): DictamenChunk[] {
  const cleaned = text.trim()
  if (cleaned.length === 0) return []
  if (cleaned.length <= TARGET_CHUNK) {
    return [
      {
        documento_id: `dictamen_${dictamenId}_p1`,
        documento_label: `Dictamen ${dictamenId} — sección 1`,
        contenido: cleaned.slice(0, MAX_CONTENT_CHARS),
      },
    ]
  }
  const paragraphs = cleaned.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const chunks: DictamenChunk[] = []
  let buffer = ''
  let idx = 1
  const push = () => {
    const body = buffer.trim()
    if (body.length < MIN_CHUNK_CHARS) return
    chunks.push({
      documento_id: `dictamen_${dictamenId}_p${idx}`,
      documento_label: `Dictamen ${dictamenId} — sección ${idx}`,
      contenido: body.slice(0, MAX_CONTENT_CHARS),
    })
    idx++
  }
  for (const p of paragraphs) {
    if (buffer && buffer.length + p.length > TARGET_CHUNK) {
      push()
      buffer = buffer.length > OVERLAP ? buffer.slice(-OVERLAP) + '\n\n' + p : p
    } else {
      buffer = buffer ? buffer + '\n\n' + p : p
    }
  }
  if (buffer.trim()) push()
  return chunks
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
