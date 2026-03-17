import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with document count and last interaction
  const enriched = await Promise.all(
    (clients || []).map(async (client) => {
      const [{ count: docCount }, { data: lastLog }] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('client_id', client.id),
        supabase.from('client_logs').select('date_sent').eq('client_id', client.id).order('date_sent', { ascending: false }).limit(1),
      ])
      return {
        ...client,
        document_count: docCount || 0,
        last_interaction: lastLog?.[0]?.date_sent || null,
      }
    })
  )

  return NextResponse.json({ clients: enriched })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, type, industry, expected_aum, actual_aum, stage, win_probability, contacts, contact_email, notes } = body
  if (!name) return NextResponse.json({ error: 'Client name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name,
      type: type || 'institutional',
      industry: industry || null,
      expected_aum: expected_aum || 0,
      actual_aum: actual_aum || 0,
      stage: stage || 'Engaged',
      win_probability: win_probability ?? 50,
      contacts: contacts || [],
      contact_email: contact_email || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data }, { status: 201 })
}
