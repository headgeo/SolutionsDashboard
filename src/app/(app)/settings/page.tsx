'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Tag, Shield } from 'lucide-react'

interface SettingsData {
  users: any[]
  clientCount: number
  docCount: number
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (r.status === 403) { setUnauthorized(true); return null }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d) => d && setData(d))
      .catch(() => {})
  }, [])

  if (unauthorized) {
    router.push('/dashboard')
    return null
  }

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink-muted mt-0.5">Admin configuration — internal use only</p>
      </div>

      {/* Team management */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} className="text-ink-faint" />
          <h2 className="text-sm font-semibold text-ink">Team Members</h2>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
          {!data ? (
            <div className="space-y-0">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 border-b border-surface-border animate-pulse bg-surface-muted/30" />
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  {['User', 'Email', 'Role', 'Joined'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((u: any, i: number) => (
                  <tr key={u.id} className={i < data.users.length - 1 ? 'border-b border-surface-border' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                          <span className="text-accent text-xs font-semibold">{(u.name || u.email)[0].toUpperCase()}</span>
                        </div>
                        <span className="text-sm text-ink">{u.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'text-accent bg-accent/10 border border-accent/20'
                          : 'text-ink-faint bg-surface-muted border border-surface-border'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Overview */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={15} className="text-ink-faint" />
          <h2 className="text-sm font-semibold text-ink">System Overview</h2>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-subtle p-5">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Documents', count: data?.docCount ?? 0 },
              { label: 'Clients', count: data?.clientCount ?? 0 },
              { label: 'Content Types', count: 7 },
            ].map(({ label, count }) => (
              <div key={label} className="p-3 rounded-lg bg-surface-muted border border-surface-border text-center">
                {data ? (
                  <p className="text-2xl font-semibold text-ink">{count}</p>
                ) : (
                  <div className="h-8 w-12 mx-auto bg-surface-muted rounded animate-pulse" />
                )}
                <p className="text-xs text-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={15} className="text-ink-faint" />
          <h2 className="text-sm font-semibold text-ink">Security & Compliance</h2>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-subtle p-5 space-y-3">
          {[
            { label: 'Authentication', value: 'Magic link (passwordless)', ok: true },
            { label: 'Row-level security', value: 'Enabled on all tables', ok: true },
            { label: 'File storage', value: 'Supabase Storage (private bucket)', ok: true },
            { label: 'Vector index', value: 'pgvector (cosine similarity)', ok: true },
            { label: 'Data region', value: 'Configure in Supabase dashboard', ok: false },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
              <span className="text-sm text-ink">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted">{value}</span>
                <span className={`w-2 h-2 rounded-full ${ok ? 'bg-status-approved' : 'bg-status-draft'}`} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
