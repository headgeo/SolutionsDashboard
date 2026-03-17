import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getEmbedding } from '@/lib/embeddings'
import { generateSummary } from '@/lib/claude'

async function parseAndChunk(
  file: ArrayBuffer,
  filename: string,
  type: string
): Promise<{ content: string; slide_number?: number; page_number?: number }[]> {
  // For binary formats (pptx, xlsx, docx) we extract text strings from the raw bytes.
  // These are ZIP-based XML formats; readable strings can be pulled out.
  const bytes = new Uint8Array(file)
  let raw = ''

  if (type === 'pdf') {
    // PDF: decode as latin1 to preserve all bytes, then extract text between BT/ET markers
    raw = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
    const textMatches = raw.match(/\(([^)]{2,})\)/g) || []
    raw = textMatches
      .map(m => m.slice(1, -1))
      .filter(s => /[a-zA-Z]{2,}/.test(s))
      .join('\n')
  } else {
    // PPTX/DOCX/XLSX: ZIP-based XML — extract XML text content
    // Decode as UTF-8 (non-fatal), then pull text from XML tags
    const decoder = new TextDecoder('utf-8', { fatal: false })
    const decoded = decoder.decode(file)
    // Extract text content from XML tags like <a:t>text</a:t> or <t>text</t>
    const xmlTextMatches = decoded.match(/<[a-z]:t[^>]*>([^<]+)<\/[a-z]:t>/gi) || []
    const plainMatches = decoded.match(/<t[^>]*>([^<]+)<\/t>/gi) || []
    const allMatches = [...xmlTextMatches, ...plainMatches]
    raw = allMatches
      .map(m => m.replace(/<[^>]+>/g, '').trim())
      .filter(s => s.length > 0)
      .join('\n')
  }

  // Basic chunking: split on double newlines, filter empties
  const chunks = raw
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 20)
    .slice(0, 200) // safety limit

  if (chunks.length === 0) {
    // Fallback: create a single chunk with the filename
    return [{ content: `Document: ${filename} (${type} file)` }]
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
      if (!process.env.GEMINI_API_KEY) break // skip embedding if no key
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

    // Generate AI summary (non-blocking — best effort)
    let summary: string | null = null
    try {
      summary = await generateSummary(
        doc.filename,
        chunks.map((c) => c.content)
      )
    } catch (e) {
      console.warn('Summary generation failed:', e)
    }

    // Update chunk count on document
    const updateData: any = {
      chunk_count: insertedCount,
      updated_at: new Date().toISOString(),
    }
    if (summary) updateData.summary = summary

    await supabase
      .from('documents')
      .update(updateData)
      .eq('id', doc.id)

    return NextResponse.json({ success: true, chunks: insertedCount, summary })
  } catch (err: any) {
    console.error('Indexing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
