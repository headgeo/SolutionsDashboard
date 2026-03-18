'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Call our whitelist login API
      const res = await fetch('/api/auth/whitelist-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      const { token_hash } = await res.json()

      // Verify the token client-side to establish the session
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email',
      })

      if (verifyError) {
        setError(verifyError.message)
        setLoading(false)
        return
      }

      // Session is now active — redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #4f7fff 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo area */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-ink font-medium tracking-wide">Solutions Dashboard</span>
          </div>
          <h1
            className="text-3xl text-ink mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sign in
          </h1>
          <p className="text-ink-muted text-sm">
            Internal access only — structuring team
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
              Work email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@flaggroup.com.au"
              required
              className="w-full px-4 py-3 rounded-lg text-ink placeholder-ink-faint text-sm
                         bg-surface-muted border border-surface-border
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                         transition-colors"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3 px-4 rounded-lg bg-accent hover:bg-accent-hover
                       text-white font-medium text-sm transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-ink-faint">
          Structuring Team · Internal & Confidential
        </p>
      </div>
    </div>
  )
}
