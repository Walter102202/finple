const OPENAI_URL = 'https://api.openai.com/v1/embeddings'
const MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIM = 1536

type OpenaiResponse = {
  data: Array<{ embedding: number[]; index: number }>
  model: string
  usage: { prompt_tokens: number; total_tokens: number }
}

async function callOpenai(input: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Falta OPENAI_API_KEY en el entorno.')
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      input,
      model: MODEL,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI embeddings HTTP ${res.status}: ${body.slice(0, 400)}`)
  }
  const json = (await res.json()) as OpenaiResponse
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  return callOpenai(texts)
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await callOpenai([text])
  return v
}
