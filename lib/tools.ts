const ALLOWED_DOMAINS = [
  'bcn.cl',
  'cmfchile.cl',
  'sernac.cl',
  'sii.cl',
  'anci.gob.cl',
  'suseso.cl',
  'spensiones.cl',
  'csirt.gob.cl',
  'bcentral.cl',
  'gob.cl',
] as const

const FETCH_TIMEOUT_MS = 15_000
const MAX_CHARS = 8_000

function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase()
  return ALLOWED_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`))
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function runFetchOfficialSource(input: { url: string; reason: string }): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(input.url)
  } catch {
    return `Error: URL inválida: ${input.url}`
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Error: solo se permiten URLs http/https.`
  }

  if (!isAllowedHost(parsed.hostname)) {
    return `Error: dominio no permitido (${parsed.hostname}). Solo dominios oficiales chilenos: ${ALLOWED_DOMAINS.join(', ')}.`
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Finple/0.1 (Claude Impact Lab Chile 2026)',
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json,text/plain;q=0.9,*/*;q=0.5',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })

    if (!res.ok) {
      return `Error HTTP ${res.status} ${res.statusText} al consultar ${parsed.toString()}`
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase()

    if (contentType.includes('application/pdf')) {
      return `[PDF detectado en ${parsed.toString()} — esta tool no extrae texto desde PDFs por URL. Si necesitas el contenido, pídele al usuario que adjunte el PDF como documento, o cita la URL directamente como fuente.]`
    }

    const raw = await res.text()
    const text = contentType.includes('json') ? raw : htmlToText(raw)

    if (text.length === 0) {
      return `[Sin contenido legible en ${parsed.toString()}]`
    }

    if (text.length > MAX_CHARS) {
      return text.slice(0, MAX_CHARS) + `\n\n[…contenido truncado a ${MAX_CHARS} caracteres de un total de ${text.length}. Si necesitas otra parte del documento, navega directamente a la URL o ajusta tu búsqueda.]`
    }
    return text
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return `Error al consultar ${parsed.toString()}: ${msg}`
  }
}

