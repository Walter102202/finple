import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local', override: false })
import { embedQuery } from '../lib/embeddings'
import { getSupabaseAdmin } from '../lib/supabase'

type Row = {
  source_type: string
  id_norma: string
  ley_alias: string
  documento_id: string
  documento_label: string | null
  contenido: string
  url_oficial: string
  area_skill: string
  similarity: number
}

async function search(query: string, opts: { sourceType?: string; area?: string } = {}) {
  const embedding = await embedQuery(query)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('match_ley_chunks', {
    query_embedding: embedding,
    match_count: 6,
    filter_area: opts.area ?? null,
    filter_source_type: opts.sourceType ?? null,
  })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Row[]
  console.log(`\nQuery: "${query}"  filters=${JSON.stringify(opts)}`)
  rows.forEach((r, i) => {
    const label = r.documento_label || r.documento_id
    console.log(`  [${i + 1}] [${r.source_type}] ${r.ley_alias} — ${label} (sim=${r.similarity.toFixed(2)}, area=${r.area_skill})`)
    console.log(`      ${r.contenido.slice(0, 140).replace(/\n/g, ' ')}…`)
    console.log(`      ${r.url_oficial}`)
  })
}

async function main() {
  await search('obligaciones operacionales del RPSF para fintech', { sourceType: 'ncg' })
  await search('responsabilidad del banco por transferencia que no reconozco')
  await search('seguro de desgravamen obligatorio en cajas de compensación', { area: 'creditos_consumo' })
  await search('descuentos asociados a tarjetas de crédito', { sourceType: 'dictamen' })
  await search('comisión por mantención cuenta corriente sin uso', { area: 'cobros_indebidos' })
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
