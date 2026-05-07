'use client'

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

const ACCEPTED = '.pdf,application/pdf,image/png,image/jpeg,image/jpg,image/webp'
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])
const MAX_BYTES = 25 * 1024 * 1024

type PendingFile = {
  id: string
  file: File
  kind: 'pdf' | 'image' | 'other'
}

export type ChatComposerProps = {
  onSend: (message: string, files: File[]) => void | Promise<void>
  disabled?: boolean
}

export function ChatComposer({ onSend, disabled = false }: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [pending, setPending] = useState<PendingFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragCounter = useRef(0)

  function handleAdjust() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(112, Math.min(ta.scrollHeight, 340))}px`
  }

  function classify(file: File): PendingFile['kind'] {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
    if (file.type.startsWith('image/')) return 'image'
    return 'other'
  }

  function isAcceptedFile(file: File): boolean {
    if (ACCEPTED_MIME.has(file.type.toLowerCase())) return true
    return file.name.toLowerCase().endsWith('.pdf')
  }

  function addFiles(list: File[] | FileList) {
    const incoming = Array.from(list)
    if (incoming.length === 0) return
    const next: PendingFile[] = []
    let rejected: string | null = null
    for (const file of incoming) {
      if (!isAcceptedFile(file)) {
        rejected = `${file.name} no es un tipo soportado (usa PDF, JPG, PNG o WebP).`
        continue
      }
      if (file.size > MAX_BYTES) {
        rejected = `${file.name} supera 25 MB`
        continue
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        kind: classify(file),
      })
    }
    if (next.length > 0) setPending((prev) => [...prev, ...next])
    setError(rejected)
  }

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  function hasFilesPayload(e: DragEvent<HTMLFormElement>): boolean {
    const dt = e.dataTransfer
    if (!dt) return false
    if (dt.types && Array.from(dt.types).includes('Files')) return true
    return false
  }

  function onDragEnter(e: DragEvent<HTMLFormElement>) {
    if (disabled || !hasFilesPayload(e)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setDragActive(true)
  }

  function onDragOver(e: DragEvent<HTMLFormElement>) {
    if (disabled || !hasFilesPayload(e)) return
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(e: DragEvent<HTMLFormElement>) {
    if (!hasFilesPayload(e)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setDragActive(false)
  }

  function onDrop(e: DragEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setDragActive(false)
    if (disabled) return
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  function removeAttachment(id: string) {
    setPending((prev) => prev.filter((a) => a.id !== id))
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function submit() {
    if (disabled) return
    const trimmed = value.trim()
    if (!trimmed && pending.length === 0) return
    const files = pending.map((p) => p.file)
    onSend(trimmed, files)
    setValue('')
    setPending([])
    setError(null)
    handleAdjust()
  }

  const canSend = !disabled && (value.trim().length > 0 || pending.length > 0)

  return (
    <form
      onSubmit={onSubmit}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-3xl border bg-white/85 p-3 shadow-soft backdrop-blur transition focus-within:shadow-focus focus-within:ring-1 focus-within:ring-coral/40 ${
        dragActive
          ? 'border-coral border-dashed bg-coral/[0.04] ring-2 ring-coral/30'
          : 'border-ink/10'
      }`}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-cream-deep/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <DropIcon />
            <p className="text-sm font-medium text-ink">Soltá tus archivos para adjuntarlos</p>
            <p className="text-xs text-ink-soft">PDF · JPG · PNG · WebP — hasta 25 MB</p>
          </div>
        </div>
      )}
      {pending.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2 px-2 pt-1">
          {pending.map((a) => (
            <li
              key={a.id}
              className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-cream-deep/70 py-1 pl-2 pr-1 text-xs text-ink-soft"
            >
              <KindIcon kind={a.kind} />
              <span className="max-w-[180px] truncate font-medium text-ink">{a.file.name}</span>
              <span className="text-ink-soft/70">{prettyBytes(a.file.size)}</span>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                aria-label={`Quitar ${a.file.name}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full text-ink-soft hover:bg-ink/10 hover:text-ink"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          handleAdjust()
        }}
        onKeyDown={onKeyDown}
        rows={4}
        disabled={disabled}
        placeholder="Cuéntame qué te tiene dudando. Ej: 'me cobraron un seguro raro' o 'mi crédito hipotecario subió y no entiendo por qué'…"
        className="block min-h-[7rem] w-full resize-none border-0 bg-transparent px-3 pt-2 text-base leading-relaxed text-ink placeholder:text-ink-soft/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 md:text-[1.05rem]"
        aria-label="Pregunta a Finple"
      />

      <div className="mt-1 flex items-end justify-between gap-2 px-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-cream-deep/80 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Adjuntar PDF, PDF escaneado o imagen"
            title="Adjuntar PDF, PDF escaneado o imagen"
          >
            <PaperclipIcon />
            <span className="hidden sm:inline">Adjuntar</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={onFiles}
          />
          <span className="hidden text-xs text-ink-soft/70 sm:inline">
            PDF · escaneados · imágenes
          </span>
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label={disabled ? 'Esperando respuesta' : 'Enviar'}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-coral px-4 text-sm font-medium text-white shadow-sm transition enabled:hover:bg-sienna disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft/60"
        >
          <span>{disabled ? 'Pensando…' : 'Preguntar'}</span>
          {disabled ? (
            <Spinner />
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path
                d="M3 10h13M11 5l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 px-2 text-xs text-sienna">
          {error}
        </p>
      )}
    </form>
  )
}

function KindIcon({ kind }: { kind: PendingFile['kind'] }) {
  if (kind === 'image') {
    return (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-clay" aria-hidden>
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" />
        <path d="M3 15l4-4 4 3 3-2 3 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'pdf') {
    return (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-clay" aria-hidden>
        <path d="M5 2.5h7l3 3V17a.5.5 0 01-.5.5h-9.5A.5.5 0 014.5 17V3a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M12 2.5V6h3" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <text x="10" y="14.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="currentColor">
          PDF
        </text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-clay" aria-hidden>
      <path d="M5 2.5h7l3 3V17a.5.5 0 01-.5.5h-9.5A.5.5 0 014.5 17V3a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  )
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-coral" aria-hidden>
      <path
        d="M12 4v11m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        d="M14.5 9.5l-5.4 5.4a3 3 0 11-4.2-4.2l6-6a2 2 0 112.8 2.8l-6 6a1 1 0 11-1.4-1.4l5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" fill="none" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
