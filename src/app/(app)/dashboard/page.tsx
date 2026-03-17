import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { DocTypeIcon } from '@/components/ui/DocTypeIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FileText, Search, Layers, BookUser, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'
import { Document } from '@/types'
import { PRODUCT_TYPE_LABELS } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: docCount },
    { count: approvedCount },
    { count: clientCount },
    { data: recentDocs },
    { count: chunkCount },
  ] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('documents')
      .select('*, profiles:uploader(name)')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('chunks').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Total Documents', value: docCount ?? 0, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Approved', value: approvedCount ?? 0, icon: TrendingUp, color: 'text-status-approved', bg: 'bg-status-approved/10' },
    { label: 'Indexed Chunks', value: chunkCount ?? 0, icon: Search, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Clients Tracked', value: clientCount ?? 0, icon: BookUser, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Dashboard
        </h1>
        <p className="text-sm text-ink-muted">Structuring team knowledge base overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="p-5 rounded-xl border border-surface-border bg-surface-subtle"
          >
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-semibold text-ink">{value.toLocaleString()}</p>
            <p className="text-xs text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { href: '/search', label: 'Search documents', desc: 'Find slides & passages', icon: Search, accent: true },
          { href: '/library', label: 'Browse library', desc: 'All uploaded materials', icon: FileText },
          { href: '/deck-builder', label: 'Build a deck', desc: 'Assemble from slides', icon: Layers },
        ].map(({ href, label, desc, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className={`p-4 rounded-xl border transition-all duration-150 group card-hover ${
              accent
                ? 'border-accent/30 bg-accent/5 hover:bg-accent/10'
                : 'border-surface-border bg-surface-subtle hover:border-accent/20'
            }`}
          >
            <Icon size={18} className={accent ? 'text-accent mb-3' : 'text-ink-faint mb-3 group-hover:text-ink-muted'} />
            <p className={`text-sm font-medium mb-0.5 ${accent ? 'text-accent' : 'text-ink'}`}>{label}</p>
            <p className="text-xs text-ink-muted">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent uploads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-ink-faint" />
            <h2 className="text-sm font-semibold text-ink">Recent Uploads</h2>
          </div>
          <Link href="/library" className="text-xs text-accent hover:text-accent-hover transition-colors">
            View all →
          </Link>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
          {recentDocs && recentDocs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3">Document</th>
                  <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3 hidden md:table-cell">Product</th>
                  <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Uploaded</th>
                  <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(recentDocs as any[]).map((doc, i) => (
                  <tr
                    key={doc.id}
                    className={`transition-colors hover:bg-surface-muted/50 ${i < recentDocs.length - 1 ? 'border-b border-surface-border' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <DocTypeIcon type={doc.type} size="sm" />
                        <span className="text-sm text-ink truncate max-w-xs">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-ink-muted">
                        {PRODUCT_TYPE_LABELS[doc.product_type as keyof typeof PRODUCT_TYPE_LABELS] || doc.product_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-ink-muted">{formatDate(doc.upload_date)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <FileText size={24} className="mx-auto text-ink-faint mb-3" />
              <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
              <Link href="/library" className="text-xs text-accent hover:underline mt-1 inline-block">
                Upload your first document →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
