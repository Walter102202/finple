import { NextResponse } from 'next/server'
import { runFinpleAgent, type ChatTurn } from '@/lib/agent'

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
    return NextResponse.json(
      { error: 'Falta ANTHROPIC_API_KEY en el servidor.' },
      { status: 500 },
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

  const filePreface =
    files.length > 0
      ? `[El usuario adjuntó ${files.length} archivo(s): ${files.map((f) => f.name).join(', ')}. Si necesitas el contenido para diagnosticar, pídele que pegue el texto relevante o lo describa en sus palabras — la lectura nativa de PDF e imagen llegará en una versión posterior.]\n\n`
      : ''
  const userInput = (filePreface + message).trim() || '(usuario adjuntó archivos sin texto)'

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      try {
        for await (const evt of runFinpleAgent(userInput, history)) {
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
