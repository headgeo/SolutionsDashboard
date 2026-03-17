import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const client_id = searchParams.get('client_id')
  const client_type = searchParams.get('client_type')

  let query = supabase
    .from('documents')
    .select('*, profiles:uploader(name), clients:client_id(name)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  if (client_id) query = query.eq('client_id', client_id)
  if (client_type) query = query.eq('client_type', client_type)

  const { data: documents, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich documents with client name
  const enriched = (documents || []).map((doc: any) => ({
    ...doc,
    client_name: doc.clients?.name || null,
  }))

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  return NextResponse.json({ documents: enriched, isAdmin: profile?.role === 'admin' })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ensure profile exists (required by documents.uploader foreign key)
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: 'user',
    }, { onConflict: 'id', ignoreDuplicates: true })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const client_id = formData.get('client_id') as string
    const client_type = formData.get('client_type') as string
    const content_type = formData.get('content_type') as string
    const status = formData.get('status') as string || 'draft'
    const upload_date = formData.get('upload_date') as string
    const author = formData.get('author') as string

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pptx', 'xlsx', 'docx', 'pdf'].includes(ext || '')) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const filePath = `${user.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { contentType: file.type })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: `Storage: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)

    // Create document record
    const insertData: any = {
      filename: file.name,
      type: ext,
      upload_date: upload_date || new Date().toISOString().split('T')[0],
      uploader: user.id,
      client_type: client_type || 'institutional',
      content_type: content_type || 'pitch_deck',
      status,
      storage_url: publicUrl,
    }

    if (client_id) {
      insertData.client_id = client_id
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert(insertData)
      .select()
      .single()

    if (docError) {
      console.error('Document insert error:', docError)
      return NextResponse.json({ error: `Database: ${docError.message}` }, { status: 500 })
    }

    // Trigger async indexing (fire and forget)
    fetch(`${request.nextUrl.origin}/api/documents/${doc.id}/index`, {
      method: 'POST',
      headers: { 'Cookie': request.headers.get('cookie') || '' },
    }).catch(() => {})

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
