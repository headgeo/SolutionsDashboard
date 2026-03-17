import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const product_type = searchParams.get('product_type')
  const client_type = searchParams.get('client_type')

  let query = supabase
    .from('documents')
    .select('*, profiles:uploader(name)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  if (product_type) query = query.eq('product_type', product_type)
  if (client_type) query = query.eq('client_type', client_type)

  const { data: documents, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  return NextResponse.json({ documents, isAdmin: profile?.role === 'admin' })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const product_type = formData.get('product_type') as string
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

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)

  // Create document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      filename: file.name,
      type: ext,
      upload_date: upload_date || new Date().toISOString().split('T')[0],
      uploader: user.id,
      product_type,
      client_type,
      content_type,
      status,
      storage_url: publicUrl,
    })
    .select()
    .single()

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

  // Trigger async indexing (fire and forget)
  fetch(`${request.nextUrl.origin}/api/documents/${doc.id}/index`, {
    method: 'POST',
    headers: { 'Cookie': request.headers.get('cookie') || '' },
  }).catch(() => {})

  return NextResponse.json({ document: doc }, { status: 201 })
}
