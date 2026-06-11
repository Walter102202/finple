import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local', override: false })
import { runFinpleAgent } from '../lib/agent'

async function main() {
  const message =
    'una fintech me promete 30% mensual de rentabilidad sin riesgo, ¿está autorizada por la CMF?'
  console.log('--- Agent run ---')
  console.log('User message:', message)
  console.log('---')
  const summary = {
    text_chunks: 0,
    tool_calls: [] as { name: string; input?: unknown }[],
    tool_dones: [] as { name: string; ok: boolean }[],
    skills_loaded: [] as string[],
    errors: [] as string[],
    done: false,
  }
  for await (const ev of runFinpleAgent(message, [])) {
    if (ev.type === 'tool_call') {
      console.log(`[tool_call] ${ev.name} (id=${ev.id})`)
      summary.tool_calls.push({ name: ev.name })
    } else if (ev.type === 'tool_executing') {
      console.log(`[tool_executing] ${ev.name} input=${JSON.stringify(ev.input)}`)
      const last = summary.tool_calls.find((t) => t.name === ev.name && !t.input)
      if (last) last.input = ev.input
    } else if (ev.type === 'tool_done') {
      console.log(`[tool_done] ${ev.name} ok=${ev.ok}`)
      summary.tool_dones.push({ name: ev.name, ok: ev.ok })
    } else if (ev.type === 'skill_loaded') {
      console.log(`[skill_loaded] ${ev.name}`)
      summary.skills_loaded.push(ev.name)
    } else if (ev.type === 'text') {
      summary.text_chunks++
      process.stdout.write(ev.text)
    } else if (ev.type === 'done') {
      summary.done = true
      console.log('\n[done]')
    } else if (ev.type === 'error') {
      summary.errors.push(ev.message)
      console.log(`[error] ${ev.message}`)
    }
  }
  console.log('\n\n--- summary ---')
  console.log(JSON.stringify(summary, null, 2))
  if (summary.errors.length > 0) process.exit(1)
  const calledSearch = summary.tool_calls.some((t) => t.name === 'search_corpus')
  const allOk = summary.tool_dones.every((t) => t.ok)
  if (!calledSearch) {
    console.error('FAIL: agent did not call search_corpus')
    process.exit(1)
  }
  if (!allOk) {
    console.error('FAIL: some tool calls returned errors')
    process.exit(1)
  }
  console.log('OK: MCP integration end-to-end working.')
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
