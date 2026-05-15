import { query, type SDKMessage, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { finpleMcpServer, FINPLE_TOOL_NAMES } from './tools-mcp'
import { buildSystemPrompt } from './system-prompt'
import { classifyAgentError, FRIENDLY_COPY, type ErrorCode } from './api-errors'

export type FinpleEvent =
  | { type: 'text'; text: string }
  | { type: 'citation'; citation: unknown }
  | { type: 'tool_call'; name: string; id: string }
  | { type: 'tool_executing'; name: string; input: Record<string, unknown> }
  | { type: 'tool_done'; name: string; ok: boolean }
  | { type: 'skill_loaded'; name: string }
  | { type: 'done' }
  | { type: 'error'; message: string; code: ErrorCode }

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
  mcp__finple_corpus__read_ncg: 'read_ncg',
  'mcp__finple-corpus__read_ncg': 'read_ncg',
  mcp__finple_corpus__read_dictamen: 'read_dictamen',
  'mcp__finple-corpus__read_dictamen': 'read_dictamen',
  mcp__finple_corpus__fetch_official_source: 'fetch_official_source',
  'mcp__finple-corpus__fetch_official_source': 'fetch_official_source',
}

function shortName(raw: string): string {
  return SHORT_TOOL_NAMES[raw] ?? raw
}

export async function* runFinpleAgent(
  message: string,
  history: ChatTurn[],
  attachmentBlocks: ContentBlockParam[] = [],
): AsyncGenerator<FinpleEvent> {
  const promptText = composePrompt(message, history)
  const prompt: string | AsyncIterable<SDKUserMessage> =
    attachmentBlocks.length === 0
      ? promptText
      : (async function* () {
          const content: ContentBlockParam[] = [
            ...attachmentBlocks,
            { type: 'text', text: promptText },
          ]
          const userMessage: MessageParam = { role: 'user', content }
          yield {
            type: 'user',
            message: userMessage,
            parent_tool_use_id: null,
          } satisfies SDKUserMessage
        })()
  const inflightTools = new Map<string, string>()
  const inflightInputs = new Map<number, { id: string; name: string; buffer: string }>()
  console.log(
    '[agent] start, cwd=' +
      process.cwd() +
      ', prompt.len=' +
      promptText.length +
      ', attachments=' +
      attachmentBlocks.length,
  )

  try {
    let messageCount = 0
    for await (const msg of query({
      prompt,
      options: {
        cwd: process.cwd(),
        model: 'claude-sonnet-4-6',
        systemPrompt: buildSystemPrompt(),
        mcpServers: { 'finple-corpus': finpleMcpServer },
        allowedTools: [...FINPLE_TOOL_NAMES, 'Skill'],
        settingSources: ['project'],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        skills: 'all',
        maxTurns: 8,
        includePartialMessages: true,
        persistSession: false,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
          HOME: '/tmp',
          CLAUDE_CONFIG_DIR: '/tmp/.claude',
        } as Record<string, string>,
        stderr: (data) => console.error('[claude-stderr]', data),
      },
    }) as AsyncGenerator<SDKMessage>) {
      messageCount += 1
      if (messageCount <= 3) console.log('[agent] msg #' + messageCount + ' type=' + (msg as any).type)
      if (msg.type === 'stream_event') {
        const ev = (msg as { event?: unknown }).event as
          | {
              type: string
              index?: number
              content_block?: { type: string; id?: string; name?: string; text?: string }
              delta?: {
                type: string
                text?: string
                partial_json?: string
                citation?: unknown
              }
            }
          | undefined
        if (!ev) continue

        if (ev.type === 'content_block_start' && ev.content_block) {
          const block = ev.content_block
          if (block.type === 'tool_use' && block.id && block.name) {
            const visible = shortName(block.name)
            inflightTools.set(block.id, visible)
            yield { type: 'tool_call', name: visible, id: block.id }
            if (typeof ev.index === 'number') {
              inflightInputs.set(ev.index, { id: block.id, name: visible, buffer: '' })
            }
          }
        } else if (ev.type === 'content_block_delta' && ev.delta) {
          if (ev.delta.type === 'text_delta' && typeof ev.delta.text === 'string') {
            yield { type: 'text', text: ev.delta.text }
          } else if (ev.delta.type === 'citations_delta' && ev.delta.citation) {
            yield { type: 'citation', citation: ev.delta.citation }
          } else if (
            ev.delta.type === 'input_json_delta' &&
            typeof ev.delta.partial_json === 'string' &&
            typeof ev.index === 'number'
          ) {
            const slot = inflightInputs.get(ev.index)
            if (slot) slot.buffer += ev.delta.partial_json
          }
        } else if (ev.type === 'content_block_stop' && typeof ev.index === 'number') {
          const slot = inflightInputs.get(ev.index)
          if (slot) {
            inflightInputs.delete(ev.index)
            let parsed: Record<string, unknown> = {}
            if (slot.buffer.length > 0) {
              try {
                parsed = JSON.parse(slot.buffer) as Record<string, unknown>
              } catch {
                parsed = {}
              }
            }
            yield { type: 'tool_executing', name: slot.name, input: parsed }
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
    console.log('[agent] loop done, total msgs=' + messageCount)
  } catch (e) {
    const { code, message: raw } = classifyAgentError(e)
    console.error('[agent] caught error:', code, raw, e)
    yield { type: 'error', code, message: FRIENDLY_COPY[code] }
  }
}
