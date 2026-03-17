import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [
    { data: client, error: clientError },
    { count: docCount },
    { data: documents },
    { data: logs },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('client_id', id),
    supabase.from('documents').select('id, filename, type, status, upload_date, content_type').eq('client_id', id).order('upload_date', { ascending: false }),
    supabase.from('client_logs')
      .select('*, sender:sender_user_id(id, name, email)')
      .eq('client_id', id)
      .order('date_sent', { ascending: false }),
  ])

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 404 })

  // Hydrate log documents
  const enrichedLogs = await Promise.all(
    (logs || []).map(async (log) => {
      if (!log.document_ids?.length) return { ...log, documents: [] }
      const { data: docs } = await supabase
        .from('documents')
        .select('id, filename, type')
        .in('id', log.document_ids)
      return { ...log, documents: docs || [] }
    })
  )

  return NextResponse.json({
    client: {
      ...client,
      document_count: docCount || 0,
      last_interaction: logs?.[0]?.date_sent || null,
    },
    documents: documents || [],
    logs: enrichedLogs,
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const allowed = ['name', 'type', 'industry', 'expected_aum', 'actual_aum', 'stage', 'win_probability', 'contacts', 'contact_email', 'notes']
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabase
    .from('clients')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
