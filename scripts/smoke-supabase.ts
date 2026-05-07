import 'dotenv/config'
import { getSupabaseAdmin } from '../lib/supabase'

async function main() {
  const supabase = getSupabaseAdmin()
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('SR key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 14))

  console.log('\n[1] SELECT count desde ley_chunks…')
  try {
    const { data, error, status, statusText } = await supabase
      .from('ley_chunks')
      .select('id', { count: 'exact', head: true })
    console.log('  status:', status, statusText)
    if (error) console.log('  error:', error)
    console.log('  data:', data)
  } catch (e) {
    console.log('  EXC:', e)
    if (e instanceof Error && (e as any).cause) console.log('  cause:', (e as any).cause)
  }

  console.log('\n[2] UPSERT 1 row mock…')
  const fakeEmbedding = Array.from({ length: 1536 }, () => 0)
  try {
    const { data, error, status, statusText } = await supabase.from('ley_chunks').upsert(
      [
        {
          id_norma: 'TEST',
          ley_alias: 'Smoke',
          articulo_num: 'Artículo TEST',
          contenido: 'contenido de prueba',
          url_oficial: 'https://example.org',
          area_skill: 'creditos_consumo',
          tokens_aprox: 5,
          embedding: fakeEmbedding,
        },
      ],
      { onConflict: 'id_norma,articulo_num' },
    )
    console.log('  status:', status, statusText)
    if (error) console.log('  error:', error)
    console.log('  data:', data)
  } catch (e) {
    console.log('  EXC:', e)
    if (e instanceof Error && (e as any).cause) console.log('  cause:', (e as any).cause)
  }

  console.log('\n[3] DELETE el row de prueba…')
  await supabase.from('ley_chunks').delete().eq('id_norma', 'TEST')
}
main().catch((e) => {
  console.error('FATAL:', e)
  if (e?.cause) console.error('cause:', e.cause)
})
