'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChatComposer } from './chat-composer'

type ErrorCode = 'no_tokens' | 'auth' | 'unknown'

type Attachment = { name: string; kind: 'pdf' | 'image' | 'other'; size: number }

type Status =
  | { key: 'analyzing' }
  | { key: 'searching_corpus' }
  | { key: 'reading_bcn' }
  | { key: 'loading_skill'; area?: string }
  | { key: 'preparing' }
  | { key: 'consulting_other' }

type DisplayMessage = {
  role: 'user' | 'assistant'
  text: string
  attachments?: Attachment[]
  streaming?: boolean
  status: Status | null
  kind?: 'normal' | 'no_tokens'
}

const SKILL_AREA: Record<string, string> = {
  cobros_indebidos: 'cobros indebidos',
  creditos_consumo: 'créditos',
  fraude_suplantacion: 'fraude y suplantación',
  datos_personales: 'datos personales',
  criptoactivos_tributacion: 'criptoactivos',
  fintech_inversiones: 'fintech e inversiones',
  regulacion_autoridades: 'autoridades regulatorias',
}

function deriveStatus(name: string, input: Record<string, unknown>): Status {
  if (name === 'Skill') {
    const raw = typeof input.skill === 'string' ? input.skill : undefined
    if (raw) {
      const bare = raw.includes(':') ? raw.split(':').pop()! : raw
      const area = SKILL_AREA[bare]
      return { key: 'loading_skill', area }
    }
    return { key: 'loading_skill' }
  }
  if (name === 'search_corpus') return { key: 'searching_corpus' }
  if (name === 'read_bcn_law') return { key: 'reading_bcn' }
  return { key: 'consulting_other' }
}

function narrativeFor(s: Status): string {
  switch (s.key) {
    case 'analyzing':
      return 'Analizando tu caso…'
    case 'searching_corpus':
      return 'Buscando la ley aplicable…'
    case 'reading_bcn':
      return 'Trayendo el texto desde la BCN…'
    case 'loading_skill':
      return s.area ? `Revisando casos de ${s.area}…` : 'Identificando el área…'
    case 'preparing':
      return 'Preparando la respuesta…'
    case 'consulting_other':
      return 'Consultando fuente…'
  }
}

type ApiHistoryMessage = {
  role: 'user' | 'assistant'
  content: { type: 'text'; text: string }[]
}

type ServerEvent =
  | { type: 'text'; text: string }
  | { type: 'citation'; citation: unknown }
  | { type: 'tool_call'; name: string; id: string }
  | { type: 'tool_executing'; name: string; input: Record<string, unknown> }
  | { type: 'tool_done'; name: string; ok: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string; code?: ErrorCode }

function classify(file: File): Attachment['kind'] {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  if (file.type.startsWith('image/')) return 'image'
  return 'other'
}

export function Chat({ onAsk }: { onAsk?: () => void } = {}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [errorState, setErrorState] = useState<{ code: ErrorCode; message: string } | null>(null)
  const scrollAnchor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  function patchLastAssistant(patch: Partial<DisplayMessage> | ((m: DisplayMessage) => DisplayMessage)) {
    setMessages((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = typeof patch === 'function' ? patch(next[i]) : { ...next[i], ...patch }
          break
        }
      }
      return next
    })
  }

  async function send(message: string, files: File[]) {
    onAsk?.()

    const attachments: Attachment[] = files.map((f) => ({
      name: f.name,
      kind: classify(f),
      size: f.size,
    }))

    const userMsg: DisplayMessage = {
      role: 'user',
      text: message,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: null,
    }
    const placeholder: DisplayMessage = {
      role: 'assistant',
      text: '',
      streaming: true,
      status: { key: 'analyzing' },
    }
    const apiHistory: ApiHistoryMessage[] = messages.map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: m.text }],
    }))

    setMessages((prev) => [...prev, userMsg, placeholder])
    setStreaming(true)
    setErrorState(null)

    const formData = new FormData()
    formData.append('message', message)
    formData.append('history', JSON.stringify(apiHistory))
    for (const f of files) formData.append('files', f)

    try {
      const res = await fetch('/api/chat', { method: 'POST', body: formData })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string; code?: ErrorCode }
        const err = new Error(errBody.error || `Error ${res.status}`) as Error & { code?: ErrorCode }
        err.code = errBody.code ?? 'unknown'
        throw err
      }
      const reader = res.body?.getReader()
      if (!reader) {
        const err = new Error('El servidor no envió un stream válido.') as Error & { code?: ErrorCode }
        err.code = 'unknown'
        throw err
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Eventos SSE separados por \n\n
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const raw of parts) {
          const line = raw.trim()
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue

          let evt: ServerEvent
          try {
            evt = JSON.parse(json) as ServerEvent
          } catch {
            continue
          }

          handleEvent(evt)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const code = ((e as { code?: ErrorCode }).code ?? 'unknown') as ErrorCode
      setErrorState({ code, message: msg })
      if (code === 'no_tokens') {
        patchLastAssistant({ streaming: false, status: null, kind: 'no_tokens', text: '' })
      } else {
        patchLastAssistant({ streaming: false, status: null })
      }
    } finally {
      setStreaming(false)
      patchLastAssistant((m) => {
        const next = { ...m, streaming: false, status: null }
        if (next.kind !== 'no_tokens' && next.text.length === 0) {
          next.kind = 'no_tokens'
        }
        return next
      })
    }

    function handleEvent(evt: ServerEvent) {
      switch (evt.type) {
        case 'text':
          patchLastAssistant((m) => ({
            ...m,
            text: m.text + evt.text,
            status: evt.text.length > 0 ? null : m.status,
          }))
          break
        case 'tool_executing':
          patchLastAssistant({ status: deriveStatus(evt.name, evt.input) })
          break
        case 'tool_done':
          patchLastAssistant({ status: { key: 'preparing' } })
          break
        case 'tool_call':
        case 'citation':
          // Aún no renderizamos citaciones inline; v2.
          break
        case 'error': {
          const err = new Error(evt.message) as Error & { code?: ErrorCode }
          err.code = evt.code ?? 'unknown'
          throw err
        }
        case 'done':
          // Cierre suave; el loop terminará cuando llegue el done del reader.
          break
      }
    }
  }

  return (
    <div className="space-y-5">
      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          <div ref={scrollAnchor} />
        </div>
      )}

      <ChatComposer
        onSend={send}
        disabled={streaming}
        placeholder={messages.length > 0 ? '' : undefined}
      />

      {errorState && errorState.code !== 'no_tokens' && (
        <p role="alert" className="px-2 text-sm text-sienna">
          Algo no funcionó: {errorState.message}
        </p>
      )}

      <p className="px-1 text-xs text-ink-soft/70">
        Acepta PDF, PDF escaneado e imágenes (JPG, PNG, WebP). Hasta 25 MB por archivo.
      </p>
    </div>
  )
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-coral/10 px-4 py-3 text-ink">
          {message.attachments && message.attachments.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {message.attachments.map((a, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-xs text-ink-soft"
                >
                  <KindIcon kind={a.kind} />
                  <span className="max-w-[160px] truncate">{a.name}</span>
                </li>
              ))}
            </ul>
          )}
          {message.text && (
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{message.text}</p>
          )}
        </div>
      </div>
    )
  }

  if (message.kind === 'no_tokens') {
    return <NoTokensBubble />
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-ink/10 bg-white/85 px-4 py-3 text-ink shadow-soft">
        {message.status && <StatusIndicator status={message.status} />}
        {message.text.length > 0 && <AssistantMarkdown text={message.text} />}
      </div>
    </div>
  )
}

function NoTokensBubble() {
  return (
    <div className="flex justify-start">
      <div
        role="alert"
        className="max-w-[90%] rounded-2xl rounded-bl-md border border-coral/30 bg-cream-deep/50 px-4 py-3 text-ink shadow-soft"
      >
        <div className="flex items-start gap-2.5">
          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-hidden>
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <path d="M10 6v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="10" cy="13.5" r="0.9" fill="currentColor" />
          </svg>
          <div>
            <p className="font-semibold text-ink">No quedan tokens</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Finple se quedó sin saldo o no logró conectarse al modelo. Intenta de nuevo en unos minutos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusIndicator({ status }: { status: Status }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-2 inline-flex items-center gap-2 rounded-full bg-cream-deep/70 px-2.5 py-0.5 text-xs text-ink-soft"
    >
      <span className="inline-flex gap-1">
        <Dot delay="0ms" />
        <Dot delay="160ms" />
        <Dot delay="320ms" />
      </span>
      <span>{narrativeFor(status)}</span>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-coral"
      style={{ animationDelay: delay }}
    />
  )
}

function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="text-[0.95rem] leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h3 className="mt-3 mb-1 text-base font-semibold text-ink">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-3 mb-1 text-base font-semibold text-ink">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-2 mb-1 font-semibold text-ink">{children}</h4>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral underline decoration-coral/40 underline-offset-2 hover:text-sienna"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-cream-deep/70 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-coral/40 pl-3 italic text-ink-soft">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-ink/10" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

function KindIcon({ kind }: { kind: Attachment['kind'] }) {
  if (kind === 'image') {
    return (
      <svg viewBox="0 0 20 20" className="h-3 w-3 text-clay" aria-hidden>
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" />
        <path d="M3 15l4-4 4 3 3-2 3 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'pdf') {
    return (
      <svg viewBox="0 0 20 20" className="h-3 w-3 text-clay" aria-hidden>
        <path d="M5 2.5h7l3 3V17a.5.5 0 01-.5.5h-9.5A.5.5 0 014.5 17V3a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M12 2.5V6h3" stroke="currentColor" strokeWidth="1.4" fill="none" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3 text-clay" aria-hidden>
      <path d="M5 2.5h7l3 3V17a.5.5 0 01-.5.5h-9.5A.5.5 0 014.5 17V3a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  )
}
