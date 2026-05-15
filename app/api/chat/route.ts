import { NextResponse } from 'next/server'
import { runFinpleAgent, type ChatTurn } from '@/lib/agent'
import { attachmentsToContentBlocks, AttachmentError } from '@/lib/attachments'
import { FRIENDLY_COPY } from '@/lib/api-errors'

export const runtime = 'nodejs'
export const maxDuration = 120

type IncomingHistoryEntry = {
  role: 'user' | 'assistant'
  content: Array<{ type: 'text'; text: string }>
}

function parseHistory(raw: string | null): ChatTurn[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as IncomingHistoryEntry[])
      .map((m) => {
        const text = Array.isArray(m.content)
          ? m.content
              .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
              .map((b) => b.text)
              .join('\n')
          : ''
        return { role: m.role, content: text }
      })
      .filter((t) => (t.role === 'user' || t.role === 'assistant') && t.content.trim().length > 0)
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[chat] ANTHROPIC_API_KEY ausente — respondiendo con no_tokens')
    return NextResponse.json(
      { error: FRIENDLY_COPY.no_tokens, code: 'no_tokens' },
      { status: 503 },
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: 'Formato inválido — usa multipart/form-data.' },
      { status: 400 },
    )
  }

  const message = ((formData.get('message') as string | null) ?? '').trim()
  const history = parseHistory(formData.get('history') as string | null)
  const files = formData.getAll('files').filter((f): f is File => f instanceof File)

  if (!message && files.length === 0) {
    return NextResponse.json({ error: 'Mensaje vacío.' }, { status: 400 })
  }

  let attachmentBlocks: Awaited<ReturnType<typeof attachmentsToContentBlocks>>
  try {
    attachmentBlocks = await attachmentsToContentBlocks(files)
  } catch (e) {
    if (e instanceof AttachmentError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const userInput = message.trim() || '(usuario adjuntó archivos sin texto adicional)'
  const summary =
    attachmentBlocks.summaries.length === 0
      ? 'none'
      : attachmentBlocks.summaries.map((s) => `${s.kind}:${s.bytes}b`).join(',')
  console.log(`[chat] turn — text.len=${userInput.length} attachments=${summary}`)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      try {
        for await (const evt of runFinpleAgent(userInput, history, attachmentBlocks.blocks)) {
          send(evt)
        }
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : String(e) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
