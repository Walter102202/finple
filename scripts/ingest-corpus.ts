import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  fetchBcnXml,
  extractArticulos,
  extractMetadata,
  buildOfficialUrl,
} from '../lib/bcn-xml'
import { embedDocuments } from '../lib/embeddings'
import { getSupabaseAdmin } from '../lib/supabase'

type Entry = { skill: string; idNorma: string; alias: string }

const BATCH_SIZE = 32
const MAX_INPUT_CHARS = 4_000

async function ingestEntry(entry: Entry): Promise<{ ingested: number; skipped: number }> {
  console.log(`\n[INGEST] ${entry.alias} (idNorma=${entry.idNorma}) → skill=${entry.skill}`)
  const xml = await fetchBcnXml(entry.idNorma)
  const meta = extractMetadata(xml, entry.idNorma)
  console.log(`  ${meta.tipo} N° ${meta.numero} — ${meta.titulo.slice(0, 80)}`)
  const chunks = extractArticulos(xml)
  if (chunks.length === 0) {
    console.warn('  ⚠ 0 artículos extraídos — revisa el parser')
    return { ingested: 0, skipped: 0 }
  }
  console.log(`  ${chunks.length} artículos`)

  const supabase = getSupabaseAdmin()
  const url = buildOfficialUrl(entry.idNorma)
  let ingested = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const slice = chunks.slice(i, i + BATCH_SIZE)
    const inputs = slice.map((c) => c.contenido.slice(0, MAX_INPUT_CHARS))
    const embeddings = await embedDocuments(inputs)
    const rows = slice.map((c, j) => ({
      id_norma: entry.idNorma,
      ley_alias: entry.alias,
      articulo_num: c.articulo_num,
      contenido: c.contenido,
      url_oficial: url,
      area_skill: entry.skill,
      tokens_aprox: Math.ceil(c.contenido.length / 4),
      embedding: embeddings[j],
    }))
    const { error } = await supabase
      .from('ley_chunks')
      .upsert(rows, { onConflict: 'id_norma,articulo_num' })
    if (error) throw new Error(`Supabase upsert: ${error.message}`)
    ingested += rows.length
    process.stdout.write('.')
  }
  console.log(`\n  ✓ ${entry.alias}: ${ingested} chunks upserteados`)
  return { ingested, skipped: 0 }
}

async function main() {
  const manifestPath = path.resolve(process.cwd(), 'scripts/corpus.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as Entry[]

  let totalIngested = 0
  const failures: Array<{ alias: string; error: string }> = []

  for (const entry of manifest) {
    try {
      const { ingested } = await ingestEntry(entry)
      totalIngested += ingested
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`  ✗ ${entry.alias}: ${msg}`)
      failures.push({ alias: entry.alias, error: msg })
    }
  }

  console.log(`\n========================================`)
  console.log(`Total chunks ingested: ${totalIngested}`)
  if (failures.length > 0) {
    console.log(`\nFailures (${failures.length}):`)
    for (const f of failures) console.log(`  - ${f.alias}: ${f.error}`)
    process.exit(1)
  }
  console.log(`Todo OK.`)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
