import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import { finpleMcpServer, FINPLE_TOOL_NAMES } from './tools-mcp'
import { SYSTEM_PROMPT } from './system-prompt'

export type FinpleEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; id: string }
  | { type: 'tool_executing'; name: string; input: Record<string, unknown> }
  | { type: 'tool_done'; name: string; ok: boolean }
  | { type: 'skill_loaded'; name: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

function composePrompt(message: string, history: ChatTurn[]): string {
  if (history.length === 0) return message
  const lines: string[] = []
  for (const turn of history) {
    const label = turn.role === 'user' ? 'Usuario (turno previo)' : 'Tú (turno previo)'
    lines.push(`${label}: ${turn.content}`)
  }
  lines.push('', `Usuario (turno actual): ${message}`)
  return lines.join('\n\n')
}

const SHORT_TOOL_NAMES: Record<string, string> = {
  mcp__finple_corpus__search_corpus: 'search_corpus',
  'mcp__finple-corpus__search_corpus': 'search_corpus',
  mcp__finple_corpus__read_bcn_law: 'read_bcn_law',
  'mcp__finple-corpus__read_bcn_law': 'read_bcn_law',
}

function shortName(raw: string): string {
  return SHORT_TOOL_NAMES[raw] ?? raw
}

export async function* runFinpleAgent(
  message: string,
  history: ChatTurn[],
): AsyncGenerator<FinpleEvent> {
  const prompt = composePrompt(message, history)
  const inflightTools = new Map<string, string>()

  try {
    for await (const msg of query({
      prompt,
      options: {
        cwd: process.cwd(),
        model: 'claude-sonnet-4-6',
        systemPrompt: SYSTEM_PROMPT,
        mcpServers: { 'finple-corpus': finpleMcpServer },
        allowedTools: [...FINPLE_TOOL_NAMES, 'Skill'],
        settingSources: ['project'],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        skills: 'all',
        maxTurns: 8,
        includePartialMessages: true,
      },
    }) as AsyncGenerator<SDKMessage>) {
      if (msg.type === 'stream_event') {
        const ev = (msg as { event?: unknown }).event as
          | {
              type: string
              index?: number
              content_block?: { type: string; id?: string; name?: string; text?: string }
              delta?: { type: string; text?: string; partial_json?: string }
            }
          | undefined
        if (!ev) continue

        if (ev.type === 'content_block_start' && ev.content_block) {
          const block = ev.content_block
          if (block.type === 'tool_use' && block.id && block.name) {
            const visible = shortName(block.name)
            inflightTools.set(block.id, visible)
            yield { type: 'tool_call', name: visible, id: block.id }
            yield { type: 'tool_executing', name: visible, input: {} }
          }
        } else if (ev.type === 'content_block_delta' && ev.delta) {
          if (ev.delta.type === 'text_delta' && typeof ev.delta.text === 'string') {
            yield { type: 'text', text: ev.delta.text }
          }
        }
        continue
      }

      if (msg.type === 'user') {
        const content = (msg as unknown as { message?: { content?: unknown } }).message?.content
        if (Array.isArray(content)) {
          for (const block of content as Array<{ type?: string; tool_use_id?: string; is_error?: boolean }>) {
            if (block?.type === 'tool_result') {
              const id = block.tool_use_id ?? ''
              const name = inflightTools.get(id) ?? 'tool'
              inflightTools.delete(id)
              yield { type: 'tool_done', name, ok: !block.is_error }
            }
          }
        }
        continue
      }

      if (msg.type === 'result') {
        yield { type: 'done' }
        return
      }
    }
  } catch (e) {
    yield { type: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}
