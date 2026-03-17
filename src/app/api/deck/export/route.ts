import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slides: chunkIds, name } = await request.json()
  if (!chunkIds?.length) return NextResponse.json({ error: 'No slides provided' }, { status: 400 })

  // Fetch chunk details to find source documents and slide numbers
  const { data: chunks } = await supabase
    .from('chunks')
    .select('*, documents(*)')
    .in('id', chunkIds)

  if (!chunks?.length) return NextResponse.json({ error: 'Slides not found' }, { status: 404 })

  // In a full implementation, this would:
  // 1. Group chunks by source document
  // 2. Download each source PPTX from Supabase Storage
  // 3. Use python-pptx (via a Python service / Edge Function) to extract specified slides
  // 4. Assemble into a new PPTX and return it

  // For MVP: return a placeholder response with metadata
  // Replace this with a call to your Python slide assembly service
  const manifest = {
    deck_name: name || 'Assembled Deck',
    slides: chunkIds.map((id: string, i: number) => {
      const chunk = chunks.find((c) => c.id === id)
      return {
        order: i + 1,
        chunk_id: id,
        source_document: chunk?.documents?.filename,
        slide_number: chunk?.slide_number,
        content_preview: chunk?.content_text?.slice(0, 100),
      }
    }),
    exported_at: new Date().toISOString(),
    exported_by: user.email,
  }

  // Return JSON manifest until Python assembly service is connected
  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${(name || 'deck').replace(/\s+/g, '_')}_manifest.json"`,
    },
  })
}
