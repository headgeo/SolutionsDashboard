import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

/**
 * Generate an AI answer to a question using retrieved document chunks (RAG).
 * Returns null if no API key is configured.
 */
export async function generateAnswer(
  query: string,
  chunks: { content: string; filename: string; slide_number?: number }[]
): Promise<string | null> {
  const anthropic = getClient()
  if (!anthropic || chunks.length === 0) return null

  const context = chunks
    .map((c, i) => {
      const source = c.slide_number
        ? `[${c.filename}, Slide ${c.slide_number}]`
        : `[${c.filename}]`
      return `--- Source ${i + 1} ${source} ---\n${c.content}`
    })
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a helpful assistant for an internal knowledge base. Answer the question based ONLY on the provided document excerpts. Be concise and specific. If the sources don't contain enough information, say so.

## Document Excerpts
${context}

## Question
${query}`,
      },
    ],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : null
}

/**
 * Generate a brief summary of a document from its chunks.
 * Returns null if no API key is configured.
 */
export async function generateSummary(
  filename: string,
  chunks: string[]
): Promise<string | null> {
  const anthropic = getClient()
  if (!anthropic || chunks.length === 0) return null

  // Use first ~6000 chars of content for summary
  const content = chunks.join('\n\n').slice(0, 6000)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Summarize this document in 2-3 sentences. Be specific about what it covers.\n\nDocument: ${filename}\n\n${content}`,
      },
    ],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : null
}
