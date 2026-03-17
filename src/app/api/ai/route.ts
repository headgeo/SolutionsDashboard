import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateAnswer } from '@/lib/claude'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query, chunks } = await request.json()
  if (!query?.trim() || !chunks?.length) {
    return NextResponse.json({ answer: null })
  }

  try {
    const answer = await generateAnswer(query, chunks)
    return NextResponse.json({ answer })
  } catch (err: any) {
    console.error('AI answer error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
