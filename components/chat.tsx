'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChatComposer } from './chat-composer'

type Attachment = { name: string; kind: 'pdf' | 'image' | 'other'; size: number }

type DisplayMessage = {
  role: 'user' | 'assistant'
  text: string
  attachments?: Attachment[]
  streaming?: boolean
  toolStatus?: string | null
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
  | { type: 'error'; message: string }

function classify(file: File): Attachment['kind'] {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  if (file.type.startsWith('image/')) return 'image'
  return 'other'
}

function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  if (name === 'fetch_official_source' && typeof input.url === 'string') {
    try {
      const u = new URL(input.url)
      return `Consultando ${u.hostname}…`
    } catch {
      return 'Consultando fuente oficial…'
    }
  }
  return `Usando ${name}…`
}

export function Chat({ onAsk }: { onAsk?: () => void } = {}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    }
    const placeholder: DisplayMessage = {
      role: 'assistant',
      text: '',
      streaming: true,
      toolStatus: null,
    }
    const apiHistory: ApiHistoryMessage[] = messages.map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: m.text }],
    }))

    setMessages((prev) => [...prev, userMsg, placeholder])
    setStreaming(true)
    setError(null)

    const formData = new FormData()
    formData.append('message', message)
    formData.append('history', JSON.stringify(apiHistory))
    for (const f of files) formData.append('files', f)

    try {
      const res = await fetch('/api/chat', { method: 'POST', body: formData })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Error ${res.status}`)
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error('El servidor no envió un stream válido.')

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
      setError(msg)
      patchLastAssistant({ streaming: false, toolStatus: null })
    } finally {
      setStreaming(false)
      patchLastAssistant({ streaming: false, toolStatus: null })
    }

    function handleEvent(evt: ServerEvent) {
      switch (evt.type) {
        case 'text':
          patchLastAssistant((m) => ({ ...m, text: m.text + evt.text, toolStatus: null }))
          break
        case 'tool_executing':
          patchLastAssistant({ toolStatus: summarizeToolInput(evt.name, evt.input) })
          break
        case 'tool_done':
          patchLastAssistant({ toolStatus: null })
          break
        case 'tool_call':
        case 'citation':
          // Aún no renderizamos citaciones inline; v2.
          break
        case 'error':
          throw new Error(evt.message)
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

      <ChatComposer onSend={send} disabled={streaming} />

      {error && (
        <p role="alert" className="px-2 text-sm text-sienna">
          Algo no funcionó: {error}
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

  const isPending = message.streaming && message.text.length === 0
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-ink/10 bg-white/85 px-4 py-3 text-ink shadow-soft">
        {message.toolStatus && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cream-deep/70 px-2.5 py-0.5 text-xs text-ink-soft">
            <Spinner small />
            <span>{message.toolStatus}</span>
          </div>
        )}
        {isPending && !message.toolStatus ? (
          <ThinkingDots />
        ) : (
          <AssistantMarkdown text={message.text} />
        )}
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
      <span className="inline-flex gap-1">
        <Dot delay="0ms" />
        <Dot delay="160ms" />
        <Dot delay="320ms" />
      </span>
      <span>Revisando normativa…</span>
    </span>
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

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={`${small ? 'h-3 w-3' : 'h-4 w-4'} animate-spin text-coral`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" fill="none" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
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
