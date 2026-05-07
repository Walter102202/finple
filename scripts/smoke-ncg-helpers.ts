import { fetchPdfBuffer, extractPdfText, cleanPdfText } from '../lib/pdf-text'
import { extractNcgChunks } from '../lib/ncg-chunker'

async function main() {
  const url = 'https://www.cmfchile.cl/normativa/ncg_502_2024.pdf'
  console.log('Fetching:', url)
  const buf = await fetchPdfBuffer(url)
  console.log('PDF size:', (buf.byteLength / 1024).toFixed(1), 'KB')
  const { text, pages } = await extractPdfText(buf)
  console.log('Raw text length:', text.length, 'chars,', pages, 'pages')
  console.log('Raw newlines:', (text.match(/\n/g) || []).length)
  const cleaned = cleanPdfText(text)
  console.log('Cleaned length:', cleaned.length)
  console.log('Cleaned newlines:', (cleaned.match(/\n/g) || []).length)
  console.log('--- first 1200 chars cleaned ---')
  console.log(cleaned.slice(0, 1200))
  console.log('--- end preview ---')
  const chunks = extractNcgChunks(cleaned)
  console.log('Total chunks:', chunks.length)
  for (const c of chunks.slice(0, 6)) {
    console.log(`- ${c.documento_id} | ${c.documento_label} (${c.contenido.length} chars)`)
    console.log(`  preview: ${c.contenido.slice(0, 200).replace(/\n/g, ' ')}`)
  }
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
