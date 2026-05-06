import { fetchBcnXml, extractArticulos, extractMetadata } from '../lib/bcn-xml'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

async function main() {
  const idNorma = process.argv[2] ?? '1187323'
  console.log(`[inspect-bcn-xml] fetching idNorma=${idNorma}`)
  const xml = await fetchBcnXml(idNorma)
  console.log(`  raw XML length: ${xml.length} chars`)

  const dumpPath = path.resolve(process.cwd(), `scripts/dump-${idNorma}.xml`)
  await writeFile(dumpPath, xml, 'utf-8')
  console.log(`  raw saved to: ${dumpPath}`)

  const metadata = extractMetadata(xml, idNorma)
  console.log(`\n[METADATA]`)
  console.log(JSON.stringify(metadata, null, 2))

  const chunks = extractArticulos(xml)
  console.log(`\n[ARTICULOS] ${chunks.length} extraídos`)
  for (const c of chunks.slice(0, 5)) {
    console.log(`\n--- ${c.articulo_num} (${c.contenido.length} chars) ---`)
    console.log(c.contenido.slice(0, 400))
    if (c.contenido.length > 400) console.log('…')
  }

  console.log(`\nFin. Total chunks: ${chunks.length}`)
}

main().catch((e) => {
  console.error('FALLO:', e)
  process.exit(1)
})
