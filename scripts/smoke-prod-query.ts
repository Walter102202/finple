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

async function search(label: string, query: string, opts: { sourceType?: string; area?: string } = {}) {
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
  console.log(`\n=== ${label} ===`)
  console.log(`Query: "${query}"  filters=${JSON.stringify(opts)}`)
  rows.forEach((r, i) => {
    const label = r.documento_label || r.documento_id
    console.log(`  [${i + 1}] [${r.source_type}] ${r.ley_alias} — ${label} (sim=${r.similarity.toFixed(2)}, area=${r.area_skill})`)
  })
}

async function main() {
  const userQuery = 'una fintech me promete 30% mensual de rentabilidad sin riesgo, ¿está autorizada por la CMF?'
  await search('A. Query del usuario tal cual, sin filtros', userQuery)
  await search('B. Query del usuario, filtrado a fintech_inversiones', userQuery, { area: 'fintech_inversiones' })
  await search('C. Query del usuario, filtrado a NCG', userQuery, { sourceType: 'ncg' })
  await search('D. Query reformulada: "registro RPSF fintech CMF inscripción obligaciones"', 'registro RPSF fintech CMF inscripción obligaciones', { sourceType: 'ncg' })
  await search('E. Query del agente típico: "autorización CMF prestador servicios financieros"', 'autorización CMF prestador servicios financieros', { area: 'fintech_inversiones' })
  await search('F. Query frontal: "rentabilidad garantizada estafa fraude inversión"', 'rentabilidad garantizada estafa fraude inversión')
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
