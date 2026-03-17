import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SEARCH_RESULT_COUNT, SIMILARITY_THRESHOLD } from '@/lib/constants'
import { getQueryEmbedding } from '@/lib/embeddings'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  if (!query?.trim()) return NextResponse.json({ results: [] })

  const status = searchParams.get('status') || null
  const type = searchParams.get('type') || null
  const client_id = searchParams.get('client_id') || null

  // Get query embedding via Google Gemini
  const embedding = await getQueryEmbedding(query)

  let results: any[] = []

  if (embedding) {
    // Vector similarity search via pgvector RPC
    const { data, error } = await supabase.rpc('search_chunks', {
      query_embedding: embedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: SEARCH_RESULT_COUNT,
      filter_status: status,
      filter_doc_type: type,
      filter_client_id: client_id,
    })

    if (!error && data) {
      results = data.map((row: any) => ({
        chunk: {
          id: row.chunk_id,
          document_id: row.document_id,
          chunk_type: row.chunk_type,
          content_text: row.content_text,
          slide_number: row.slide_number,
          page_number: row.page_number,
        },
        document: {
          id: row.document_id,
          filename: row.filename,
          type: row.doc_type,
          client_type: row.client_type,
          content_type: row.content_type,
          status: row.status,
          upload_date: row.upload_date,
          storage_url: row.storage_url,
          thumbnail_url: row.thumbnail_url,
          client_name: row.client_name || null,
        },
        similarity: row.similarity,
        slide_image: null,
      }))
    }
  } else {
    // Fallback: ilike search if no Gemini API key or embedding failed
    const words = query.trim().split(/\s+/).filter(Boolean)
    let q = supabase
      .from('chunks')
      .select('*, documents!inner(*, clients:client_id(name))')
      .limit(SEARCH_RESULT_COUNT)

    // Filter by each word using ilike
    for (const word of words.slice(0, 3)) {
      q = q.ilike('content_text', `%${word}%`)
    }

    if (status) q = q.eq('documents.status', status)
    if (type) q = q.eq('documents.type', type)
    if (client_id) q = q.eq('documents.client_id', client_id)

    const { data } = await q
    if (data) {
      results = data.map((chunk: any) => ({
        chunk: {
          id: chunk.id,
          document_id: chunk.document_id,
          chunk_type: chunk.chunk_type,
          content_text: chunk.content_text,
          slide_number: chunk.slide_number,
          page_number: chunk.page_number,
        },
        document: {
          ...chunk.documents,
          client_name: chunk.documents?.clients?.name || null,
        },
        similarity: 0.5,
        slide_image: null,
      }))
    }
  }

  // Fetch slide images for slide chunks
  for (const result of results) {
    if (result.chunk.chunk_type === 'slide') {
      const { data: img } = await supabase
        .from('slide_images')
        .select('*')
        .eq('chunk_id', result.chunk.id)
        .single()
      if (img) result.slide_image = img
    }
  }

  return NextResponse.json({ results })
}
