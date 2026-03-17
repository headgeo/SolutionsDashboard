/**
 * Embedding utility using Voyage AI (Anthropic's recommended embedding provider).
 *
 * Voyage AI produces high-quality embeddings optimized for retrieval.
 * Model: voyage-3-lite (512 dimensions) — fast, cost-effective
 *
 * API docs: https://docs.voyageai.com/reference/embeddings-api
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3-lite'

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not set')
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text.slice(0, 8000)],
      input_type: 'document',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Voyage API error: ${err.detail || res.statusText}`)
  }

  const data = await res.json()
  return data.data?.[0]?.embedding || []
}

export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: [query.slice(0, 1000)],
        input_type: 'query',
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.data?.[0]?.embedding || null
  } catch {
    return null
  }
}
