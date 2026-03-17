'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
import { DocTypeIcon } from '@/components/ui/DocTypeIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FileText, Search, Layers, BookUser, TrendingUp, Clock, Users, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface PipelineStage {
  stage: string
  count: number
  totalAUM: number
}

interface DashboardData {
  docCount: number
  approvedCount: number
  clientCount: number
  chunkCount: number
  totalPipelineAUM: number
  pipeline: PipelineStage[]
  recentDocs: any[]
  recentLogs: any[]
}

function formatAUM(v: number): string {
  if (!v) return '$0'
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

const STAGE_COLORS: Record<string, string> = {
  'Lost Interest': 'bg-red-400',
  'Engaged': 'bg-blue-400',
  'Expression of Interest': 'bg-yellow-400',
  'Unconfirmed Win': 'bg-orange-400',
  'Won Funded': 'bg-emerald-400',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  const stats = [
    { label: 'Total Documents', value: data?.docCount ?? 0, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Approved', value: data?.approvedCount ?? 0, icon: TrendingUp, color: 'text-status-approved', bg: 'bg-status-approved/10' },
    { label: 'Indexed Chunks', value: data?.chunkCount ?? 0, icon: Search, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Clients', value: data?.clientCount ?? 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink mb-1">Dashboard</h1>
        <p className="text-sm text-ink-muted">Knowledge base & client overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-xl border border-surface-border bg-surface-subtle">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            {data ? (
              <p className="text-2xl font-semibold text-ink">{value.toLocaleString()}</p>
            ) : (
              <div className="h-8 w-16 bg-surface-muted rounded animate-pulse" />
            )}
            <p className="text-xs text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline overview */}
      {data && data.pipeline && (
        <div className="mb-8 p-5 rounded-xl border border-surface-border bg-surface-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Pipeline Overview</h2>
              <span className="text-xs text-ink-muted ml-2">{formatAUM(data.totalPipelineAUM)} total</span>
            </div>
            <Link href="/crm" className="text-xs text-accent hover:text-accent-hover transition-colors">
              Open CRM
            </Link>
          </div>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-surface-muted mb-3">
            {data.pipeline.filter((s) => s.count > 0).map((s) => (
              <div
                key={s.stage}
                className={`${STAGE_COLORS[s.stage] || 'bg-ink-faint'} transition-all`}
                style={{ width: `${(s.count / Math.max(data.clientCount, 1)) * 100}%` }}
                title={`${s.stage}: ${s.count} clients`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {data.pipeline.map((s) => (
              <div key={s.stage} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[s.stage]}`} />
                <span className="text-[10px] text-ink-muted">{s.stage}</span>
                <span className="text-[10px] font-semibold text-ink">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { href: '/search', label: 'Search documents', desc: 'Find slides & passages', icon: Search, accent: true },
          { href: '/library', label: 'Browse library', desc: 'All uploaded materials', icon: FileText },
          { href: '/client-log', label: 'Client activity', desc: 'Log & track interactions', icon: BookUser },
          { href: '/crm', label: 'CRM', desc: 'Manage pipeline & contacts', icon: Users },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent uploads */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Recent Uploads</h2>
            </div>
            <Link href="/library" className="text-xs text-accent hover:text-accent-hover transition-colors">
              View all
            </Link>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
            {!data ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 border-b border-surface-border animate-pulse bg-surface-muted/30" />
                ))}
              </div>
            ) : data.recentDocs.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3">Document</th>
                    <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3 hidden md:table-cell">Client</th>
                    <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Uploaded</th>
                    <th className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDocs.map((doc: any, i: number) => (
                    <tr
                      key={doc.id}
                      className={`transition-colors hover:bg-surface-muted/50 ${i < data.recentDocs.length - 1 ? 'border-b border-surface-border' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <DocTypeIcon type={doc.type} size="sm" />
                          <span className="text-sm text-ink truncate max-w-xs">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-ink-muted">
                          {doc.client_name || '—'}
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
                  Upload your first document
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent client activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookUser size={14} className="text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Recent Activity</h2>
            </div>
            <Link href="/client-log" className="text-xs text-accent hover:text-accent-hover transition-colors">
              View all
            </Link>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-subtle p-4 space-y-3">
            {!data ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-surface-muted/30 animate-pulse" />
              ))
            ) : data.recentLogs.length > 0 ? (
              data.recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-surface-border last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-purple-400/10 flex items-center justify-center shrink-0 mt-0.5">
                    <BookUser size={12} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">
                      {log.client?.name || 'Unknown client'}
                    </p>
                    <p className="text-[10px] text-ink-faint">
                      {log.document_ids?.length || 0} doc{(log.document_ids?.length || 0) !== 1 ? 's' : ''} sent · {formatDate(log.date_sent)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <BookUser size={20} className="mx-auto text-ink-faint mb-2" />
                <p className="text-xs text-ink-muted">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
