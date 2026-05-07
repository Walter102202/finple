import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local', override: false })
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fetchPdfBuffer, extractPdfText, cleanPdfText } from '../lib/pdf-text'
import { extractNcgChunks } from '../lib/ncg-chunker'
import { embedDocuments } from '../lib/embeddings'
import { getSupabaseAdmin } from '../lib/supabase'

type Entry = { skill: string; ncgId: string; alias: string; url: string }

const BATCH_SIZE = 32
const MAX_INPUT_CHARS = 4_000

async function ingestEntry(entry: Entry): Promise<{ ingested: number; chunks: number }> {
  console.log(`\n[INGEST NCG] ${entry.alias}`)
  console.log(`  URL: ${entry.url}`)
  const buf = await fetchPdfBuffer(entry.url)
  console.log(`  PDF descargado: ${(buf.byteLength / 1024).toFixed(1)} KB`)
  const { text, pages } = await extractPdfText(buf)
  console.log(`  Texto extraído: ${text.length} chars en ${pages} páginas`)
  const cleaned = cleanPdfText(text)
  const chunks = extractNcgChunks(cleaned)
  if (chunks.length === 0) {
    console.warn('  ⚠ 0 chunks generados — revisa el chunker o el PDF')
    return { ingested: 0, chunks: 0 }
  }
  console.log(`  ${chunks.length} chunks (numerales o bloques)`)

  const supabase = getSupabaseAdmin()
  let ingested = 0
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const slice = chunks.slice(i, i + BATCH_SIZE)
    const inputs = slice.map((c) => c.contenido.slice(0, MAX_INPUT_CHARS))
    const embeddings = await embedDocuments(inputs)
    const rows = slice.map((c, j) => ({
      source_type: 'ncg',
      id_norma: entry.ncgId,
      ley_alias: entry.alias,
      articulo_num: null as string | null,
      documento_id: c.documento_id,
      documento_label: c.documento_label,
      contenido: c.contenido,
      url_oficial: entry.url,
      area_skill: entry.skill,
      tokens_aprox: Math.ceil(c.contenido.length / 4),
      embedding: embeddings[j],
    }))
    const { error } = await supabase
      .from('ley_chunks')
      .upsert(rows, { onConflict: 'source_type,id_norma,documento_id' })
    if (error) throw new Error(`Supabase upsert: ${error.message}`)
    ingested += rows.length
    process.stdout.write('.')
  }
  console.log(`\n  ✓ NCG ${entry.ncgId}: ${ingested} chunks upserteados`)
  return { ingested, chunks: chunks.length }
}

async function main() {
  const manifestPath = path.resolve(process.cwd(), 'scripts/ncg-corpus.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as Entry[]

  let total = 0
  const failures: Array<{ alias: string; error: string }> = []
  for (const entry of manifest) {
    try {
      const { ingested } = await ingestEntry(entry)
      total += ingested
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`  ✗ ${entry.alias}: ${msg}`)
      failures.push({ alias: entry.alias, error: msg })
    }
  }
  console.log(`\n========================================`)
  console.log(`Total chunks NCG ingestados: ${total}`)
  if (failures.length > 0) {
    console.log(`\nFailures (${failures.length}):`)
    for (const f of failures) console.log(`  - ${f.alias}: ${f.error}`)
    process.exit(1)
  }
  console.log('Todo OK.')
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
