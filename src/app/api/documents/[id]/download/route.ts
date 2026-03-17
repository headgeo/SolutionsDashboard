import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_url, filename')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get signed URL for private bucket download
  const path = doc.storage_url.split('/documents/')[1]
  if (!path) return NextResponse.json({ error: 'Invalid storage path' }, { status: 500 })

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 60) // 60 second expiry

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
