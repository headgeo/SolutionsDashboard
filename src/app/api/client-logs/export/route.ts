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

  // Hydrate documents
  const enriched = await Promise.all(
    (logs || []).map(async (log) => {
      if (!log.document_ids?.length) return { ...log, documents: [] }
      const { data: docs } = await supabase
        .from('documents')
        .select('id, filename')
        .in('id', log.document_ids)
      return { ...log, documents: docs || [] }
    })
  )

  // Build CSV
  const headers = ['Date Sent', 'Client', 'Client Type', 'Documents Sent', 'Sent By', 'Notes', 'Logged At']
  const rows = enriched.map((log: any) => [
    log.date_sent,
    log.client?.name || '',
    log.client?.type || '',
    (log.documents || []).map((d: any) => d.filename).join('; '),
    log.sender?.name || log.sender?.email || '',
    (log.notes || '').replace(/"/g, '""'),
    log.created_at,
  ])

  const csvLines = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ]
  const csv = csvLines.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="client-log-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
