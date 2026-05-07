import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

const USER_AGENT = 'Finple/0.1 (Claude Impact Lab Chile 2026)'
const FETCH_TIMEOUT_MS = 45_000

export async function fetchPdfBuffer(url: string): Promise<Uint8Array> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf,*/*' },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } finally {
    clearTimeout(timer)
  }
}

export async function extractPdfText(
  buffer: Uint8Array,
): Promise<{ text: string; pages: number }> {
  const data = new Uint8Array(buffer)
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  })
  const doc = await loadingTask.promise
  const allPages: string[] = []
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      allPages.push(reconstructPage(content.items as TextItemLike[]))
      page.cleanup()
    }
  } finally {
    await doc.destroy()
  }
  return { text: allPages.join('\n\n'), pages: doc.numPages }
}

type TextItemLike = {
  str: string
  transform?: number[]
  hasEOL?: boolean
  width?: number
  height?: number
}

function reconstructPage(items: TextItemLike[]): string {
  if (items.length === 0) return ''
  type Pos = { y: number; x: number; str: string; width: number; height: number }
  const positions: Pos[] = []
  for (const it of items) {
    if (typeof it.str !== 'string') continue
    const tr = it.transform ?? [1, 0, 0, 1, 0, 0]
    const x = tr[4] ?? 0
    const y = tr[5] ?? 0
    const height = (it.height ?? 0) || Math.abs(tr[3] ?? 10)
    const width = it.width ?? 0
    positions.push({ y, x, str: it.str, width, height })
  }
  if (positions.length === 0) return ''
  positions.sort((a, b) => (b.y - a.y) || (a.x - b.x))
  const lines: { y: number; parts: Pos[] }[] = []
  const tolerance = 2
  for (const p of positions) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - p.y) <= tolerance) {
      last.parts.push(p)
    } else {
      lines.push({ y: p.y, parts: [p] })
    }
  }
  const lineStrings: string[] = []
  let prevY: number | null = null
  let prevHeight = 12
  for (const line of lines) {
    line.parts.sort((a, b) => a.x - b.x)
    let text = ''
    let prevEndX: number | null = null
    let prevCharHeight = prevHeight
    for (const p of line.parts) {
      if (text.length > 0 && prevEndX !== null) {
        const gap = p.x - prevEndX
        const last = text[text.length - 1]
        const first = p.str[0] ?? ''
        const needsSpace =
          last !== ' ' &&
          first !== ' ' &&
          last !== '' &&
          first !== '' &&
          gap > prevCharHeight * 0.18
        if (needsSpace) text += ' '
      }
      text += p.str
      prevEndX = p.x + (p.width || estimateWidth(p.str, p.height))
      prevCharHeight = p.height || prevCharHeight
    }
    text = text.replace(/[ \t]{2,}/g, ' ').trim()
    if (!text) continue
    if (prevY !== null) {
      const gap = prevY - line.y
      if (gap > prevHeight * 1.6) lineStrings.push('')
    }
    lineStrings.push(text)
    prevY = line.y
    prevHeight = line.parts[0].height || prevHeight
  }
  return lineStrings.join('\n')
}

function estimateWidth(s: string, h: number): number {
  return s.length * h * 0.5
}

export function cleanPdfText(s: string): string {
  return s
    .normalize('NFC')
    .replace(/ /g, ' ')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/(\w+)-\n(\w+)/g, '$1$2')
    .replace(/^\s*P[áa]gina\s+\d+\s+de\s+\d+\s*$/gim, '')
    .replace(/^\s*\d+\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
