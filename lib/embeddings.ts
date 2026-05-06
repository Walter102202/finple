const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'
const MODEL = 'voyage-3-lite'
export const EMBEDDING_DIM = 512

type VoyageInputType = 'document' | 'query'

type VoyageResponse = {
  data: Array<{ embedding: number[]; index: number }>
  model: string
  usage: { total_tokens: number }
}

async function callVoyage(input: string[], inputType: VoyageInputType): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY
  if (!key) throw new Error('Falta VOYAGE_API_KEY en el entorno.')
  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      input,
      model: MODEL,
      input_type: inputType,
      output_dimension: EMBEDDING_DIM,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Voyage HTTP ${res.status}: ${body.slice(0, 400)}`)
  }
  const json = (await res.json()) as VoyageResponse
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  return callVoyage(texts, 'document')
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await callVoyage([text], 'query')
  return v
}
