import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // truncate to token limit
    }),
  })
  const data = await res.json()
  return data.data?.[0]?.embedding || []
}

async function parseAndChunk(
  file: ArrayBuffer,
  filename: string,
  type: string
): Promise<{ content: string; slide_number?: number; page_number?: number }[]> {
  // In production, use python-pptx / PyMuPDF via a Python microservice or Supabase Edge Function.
  // This is a simplified text extraction placeholder.
  // For MVP, we extract raw text as single chunk per file.
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const raw = decoder.decode(file)

  // Basic chunking: split on double newlines, filter empties
  const chunks = raw
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 40)
    .slice(0, 200) // safety limit

  if (chunks.length === 0) {
    return [{ content: `Document: ${filename}` }]
  }

  return chunks.map((content, i) => ({
    content,
    page_number: i + 1,
  }))
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  try {
    // Download the file from storage
    const filePath = doc.storage_url.split('/documents/')[1]
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    const buffer = await fileData.arrayBuffer()
    const chunks = await parseAndChunk(buffer, doc.filename, doc.type)

    // Generate embeddings and insert chunks
    let insertedCount = 0
    for (const chunk of chunks) {
      if (!process.env.OPENAI_API_KEY) break // skip embedding if no key
      const embedding = await getEmbedding(chunk.content)
      const chunkType = doc.type === 'pptx' ? 'slide' : doc.type === 'xlsx' ? 'section' : 'paragraph'

      await supabase.from('chunks').insert({
        document_id: doc.id,
        chunk_type: chunkType,
        content_text: chunk.content,
        slide_number: chunkType === 'slide' ? chunk.page_number : null,
        page_number: chunkType !== 'slide' ? chunk.page_number : null,
        embedding,
      })
      insertedCount++
    }

    // Update chunk count on document
    await supabase
      .from('documents')
      .update({ chunk_count: insertedCount, updated_at: new Date().toISOString() })
      .eq('id', doc.id)

    return NextResponse.json({ success: true, chunks: insertedCount })
  } catch (err: any) {
    console.error('Indexing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
