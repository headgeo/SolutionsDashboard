/**
 * Embedding utility using Google Gemini.
 *
 * Free tier available — get an API key at: https://aistudio.google.com/app/apikey
 * Model: gemini-embedding-001 (768 dimensions with outputDimensionality)
 */

const GEMINI_MODEL = 'gemini-embedding-001'
const OUTPUT_DIMENSIONS = 768

function getGeminiUrl(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent?key=${key}`
}

export async function getEmbedding(text: string): Promise<number[]> {
  const url = getGeminiUrl()

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_MODEL}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: OUTPUT_DIMENSIONS,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini embedding error: ${err?.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return data.embedding?.values || []
}

export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  if (!process.env.GEMINI_API_KEY) return null

  try {
    const url = getGeminiUrl()

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${GEMINI_MODEL}`,
        content: { parts: [{ text: query.slice(0, 1000) }] },
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: OUTPUT_DIMENSIONS,
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.embedding?.values || null
  } catch {
    return null
  }
}
