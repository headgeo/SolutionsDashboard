import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Tag, Shield, BookUser } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { data: users },
    { count: clientCount },
    { count: docCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">
          Settings
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">Admin configuration — internal use only</p>
      </div>

      {/* Team management */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} className="text-ink-faint" />
          <h2 className="text-sm font-semibold text-ink">Team Members</h2>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border">
                {['User', 'Email', 'Role', 'Joined'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.map((u, i) => (
                <tr key={u.id} className={i < (users.length - 1) ? 'border-b border-surface-border' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-accent text-xs font-semibold">
                          {(u.name || u.email)[0].toUpperCase()}
                        </span>
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
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              { label: 'Documents', count: docCount ?? 0 },
              { label: 'Clients', count: clientCount ?? 0 },
              { label: 'Content Types', count: 7 },
            ].map(({ label, count }) => (
              <div key={label} className="p-3 rounded-lg bg-surface-muted border border-surface-border text-center">
                <p className="text-2xl font-semibold text-ink">{count}</p>
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
