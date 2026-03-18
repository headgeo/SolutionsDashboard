import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const WHITELISTED_EMAILS = [
  'jakb@flaggroup.com.au',
  'georgeh@flaggroup.com.au',
  'jarydb@flaggroup.com.au',
  'jamesb@flaggroup.com.au',
  'kevink@flaggroup.com.au',
]

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || !WHITELISTED_EMAILS.includes(email.toLowerCase().trim())) {
    return NextResponse.json(
      { error: 'Email not authorised' },
      { status: 403 }
    )
  }

  // Use the service role key to generate a magic link without sending an email
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase().trim(),
  })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to generate login' },
      { status: 500 }
    )
  }

  // Extract the token_hash from the generated action link
  const actionLink = new URL(data.properties.action_link)
  const tokenHash = actionLink.searchParams.get('token')

  return NextResponse.json({ token_hash: tokenHash })
}
