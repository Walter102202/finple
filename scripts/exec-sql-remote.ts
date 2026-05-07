import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

dotenvConfig({ path: '.env.local', override: false })

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'tysmxjrvabkaruabappa'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

async function main() {
  if (!ACCESS_TOKEN) throw new Error('Falta SUPABASE_ACCESS_TOKEN en el entorno.')
  const file = process.argv[2]
  if (!file) throw new Error('Pasa la ruta del archivo SQL como primer argumento.')
  const fullPath = path.resolve(process.cwd(), file)
  const sql = await readFile(fullPath, 'utf-8')
  console.log(`[exec-sql-remote] aplicando ${file} a project=${PROJECT_REF} (${sql.length} chars)`)

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    },
  )
  const body = await res.text()
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`)
    console.error(body.slice(0, 4000))
    process.exit(1)
  }
  console.log(`OK (HTTP ${res.status})`)
  console.log(body.slice(0, 2000))
}

main().catch((e) => {
  console.error('FATAL:', e instanceof Error ? e.message : e)
  process.exit(1)
})
