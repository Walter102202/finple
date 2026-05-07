import { fetchDictamenText, chunkDictamen } from '../lib/sernac-html'

async function main() {
  const url = 'https://www.sernac.cl/portal/618/articles-88180_archivo_01.pdf'
  console.log('Fetching dictamen:', url)
  const text = await fetchDictamenText(url)
  console.log('Texto length:', text.length, 'chars')
  console.log('Newlines:', (text.match(/\n/g) || []).length)
  console.log('--- first 800 chars ---')
  console.log(text.slice(0, 800))
  console.log('--- end preview ---')
  const chunks = chunkDictamen(text, 'art-88180')
  console.log('Total chunks:', chunks.length)
  for (const c of chunks) {
    console.log(`- ${c.documento_id} | ${c.documento_label} (${c.contenido.length} chars)`)
    console.log(`  preview: ${c.contenido.slice(0, 200).replace(/\n/g, ' ')}`)
  }
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
