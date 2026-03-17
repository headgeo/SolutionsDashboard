import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids')
  if (!idsParam) return NextResponse.json({ slides: [] })

  const ids = idsParam.split(',').filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ slides: [] })

  const { data: chunks, error } = await supabase
    .from('chunks')
    .select('*, documents(*), slide_images(*)')
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const slides = ids
    .map((id) => chunks?.find((c) => c.id === id))
    .filter(Boolean)
    .map((chunk: any) => ({
      chunk_id: chunk.id,
      document_id: chunk.document_id,
      document_name: chunk.documents?.filename || 'Unknown',
      slide_number: chunk.slide_number,
      thumbnail_url: chunk.slide_images?.[0]?.thumbnail_url || null,
      content_text: chunk.content_text,
    }))

  return NextResponse.json({ slides })
}
