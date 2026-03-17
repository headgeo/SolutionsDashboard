import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: logs, error } = await supabase
    .from('client_logs')
    .select(`
      *,
      client:client_id(id, name, type),
      sender:sender_user_id(id, name, email)
    `)
    .order('date_sent', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hydrate documents for each log
  const enriched = await Promise.all(
    (logs || []).map(async (log) => {
      if (!log.document_ids?.length) return { ...log, documents: [] }
      const { data: docs } = await supabase
        .from('documents')
        .select('id, filename, type, status')
        .in('id', log.document_ids)
      return { ...log, documents: docs || [] }
    })
  )

  return NextResponse.json({ logs: enriched })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { client_id, new_client, document_ids, date_sent, notes, folder_link, contacts, custom_documents } = body

  let finalClientId = client_id

  // Create new client if provided
  if (new_client?.name) {
    const { data: created, error } = await supabase
      .from('clients')
      .insert({ name: new_client.name, type: new_client.type || 'institutional' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    finalClientId = created.id
  }

  if (!finalClientId) return NextResponse.json({ error: 'Client required' }, { status: 400 })

  const { data: log, error } = await supabase
    .from('client_logs')
    .insert({
      client_id: finalClientId,
      document_ids: document_ids || [],
      sender_user_id: user.id,
      date_sent: date_sent || new Date().toISOString().split('T')[0],
      notes: notes || null,
      folder_link: folder_link || null,
      contacts: contacts || [],
      custom_documents: custom_documents || [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log }, { status: 201 })
}
