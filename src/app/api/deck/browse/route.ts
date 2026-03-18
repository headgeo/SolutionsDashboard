import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/deck/browse?document_id=xxx&search=keyword
 * Returns all slide chunks from uploaded PPTX documents for browsing in Deck Builder.
 * Supports keyword search across slide content.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('document_id')
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('chunks')
    .select('*, documents!inner(id, filename, type, status, client_id, content_type), slide_images(*)')
    .eq('chunk_type', 'slide')
    .order('slide_number', { ascending: true })

  if (documentId) {
    query = query.eq('document_id', documentId)
  }

  // Server-side text search using ilike
  if (search) {
    query = query.ilike('content_text', `%${search}%`)
  }

  const { data: chunks, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by document
  const byDocument: Record<string, {
    document_id: string
    document_name: string
    document_type: string
    content_type: string
    status: string
    slides: {
      chunk_id: string
      slide_number: number
      content_text: string
      thumbnail_url: string | null
    }[]
  }> = {}

  for (const chunk of (chunks || [])) {
    const docId = chunk.document_id
    if (!byDocument[docId]) {
      byDocument[docId] = {
        document_id: docId,
        document_name: chunk.documents?.filename || 'Unknown',
        document_type: chunk.documents?.type || 'pptx',
        content_type: chunk.documents?.content_type || '',
        status: chunk.documents?.status || 'draft',
        slides: [],
      }
    }
    byDocument[docId].slides.push({
      chunk_id: chunk.id,
      slide_number: chunk.slide_number || 0,
      content_text: chunk.content_text,
      thumbnail_url: chunk.slide_images?.[0]?.thumbnail_url || null,
    })
  }

  return NextResponse.json({ documents: Object.values(byDocument) })
}
