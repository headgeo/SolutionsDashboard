import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    { count: docCount },
    { count: approvedCount },
    { count: clientCount },
    { data: recentDocs },
    { count: chunkCount },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('documents')
      .select('*, profiles:uploader(name), clients:client_id(name)')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('chunks').select('*', { count: 'exact', head: true }),
    supabase
      .from('client_logs')
      .select('*, client:client_id(name)')
      .order('date_sent', { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    docCount: docCount ?? 0,
    approvedCount: approvedCount ?? 0,
    clientCount: clientCount ?? 0,
    chunkCount: chunkCount ?? 0,
    recentDocs: (recentDocs || []).map((doc: any) => ({
      ...doc,
      client_name: doc.clients?.name || null,
      uploader_name: doc.profiles?.name || null,
    })),
    recentLogs: recentLogs || [],
  })
}
