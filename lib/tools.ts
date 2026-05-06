import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

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

export const fetchOfficialSourceTool = betaZodTool({
  name: 'fetch_official_source',
  description:
    'Descarga el contenido de una URL oficial chilena para verificar normativa, plazos, registros públicos o información gubernamental antes de citarla al usuario. ' +
    'Dominios permitidos: bcn.cl, cmfchile.cl, sernac.cl, sii.cl, anci.gob.cl, suseso.cl, spensiones.cl, csirt.gob.cl, bcentral.cl, gob.cl. ' +
    'Devuelve hasta 8000 caracteres de texto plano. Para PDFs por URL devuelve un aviso (pídele al usuario que los adjunte). ' +
    'Úsalo cuando: (a) no estés seguro del articulado de una ley/NCG/circular antes de citarla, (b) necesites confirmar plazos o requisitos exactos, (c) necesites revisar el RPSF para verificar si una fintech está registrada, (d) necesites revisar alertas CMF sobre estafas o entidades no autorizadas. ' +
    'NO uses esta herramienta para sitios no oficiales (bancos privados, foros, redes sociales).',
  inputSchema: z.object({
    url: z.string().url().describe('URL completa del documento o página oficial chilena (debe estar en la lista de dominios permitidos)'),
    reason: z.string().describe('Por qué necesitas verificar esta fuente — qué afirmación o dato específico vas a confirmar'),
  }),
  run: runFetchOfficialSource,
})

export const TOOL_HANDLERS: Record<string, (input: any) => Promise<string>> = {
  fetch_official_source: runFetchOfficialSource,
}
