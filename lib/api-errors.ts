export type ErrorCode = 'no_tokens' | 'auth' | 'unknown'

export const FRIENDLY_COPY: Record<ErrorCode, string> = {
  no_tokens: 'No quedan tokens',
  auth: 'Falta o es inválida la API key.',
  unknown: 'Algo no funcionó.',
}

export function classifyAgentError(e: unknown): { code: ErrorCode; message: string } {
  const message = e instanceof Error ? e.message : String(e)
  const status = (e as { status?: unknown } | null)?.status
  const lower = message.toLowerCase()

  if (
    status === 401 ||
    lower.includes('invalid_api_key') ||
    lower.includes('invalid api key') ||
    lower.includes('authentication_error')
  ) {
    return { code: 'auth', message }
  }

  if (
    status === 402 ||
    status === 429 ||
    lower.includes('credit balance') ||
    lower.includes('insufficient_quota') ||
    lower.includes('insufficient quota') ||
    lower.includes('quota_exceeded') ||
    lower.includes('rate_limit') ||
    lower.includes('rate limit') ||
    lower.includes('overloaded')
  ) {
    return { code: 'no_tokens', message }
  }

  if (
    lower.includes('fetch failed') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('socket hang up') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    e instanceof TypeError
  ) {
    return { code: 'no_tokens', message }
  }

  return { code: 'unknown', message }
}
