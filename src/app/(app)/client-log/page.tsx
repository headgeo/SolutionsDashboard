'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClientLog } from '@/types'
import { LogInteractionModal } from '@/components/clients/LogInteractionModal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { BookUser, Plus, Download, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CLIENT_TYPE_LABELS } from '@/types'

export default function ClientLogPage() {
  const [logs, setLogs] = useState<ClientLog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterClient, setFilterClient] = useState('')
  const { toasts, dismiss, success, error } = useToast()

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client-logs')
      const data = await res.json()
      setLogs(data.logs || [])
    } catch {
      error('Failed to load client log.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/client-logs/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `client-log-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      success('CSV exported.')
    } catch {
      error('Export failed.')
    }
  }

  // Get unique clients for filter
  const uniqueClients = Array.from(
    new Map(logs.map((l) => [l.client?.id, l.client]).filter(([id]) => id)).values()
  ) as NonNullable<ClientLog['client']>[]

  const filtered = filterClient
    ? logs.filter((l) => l.client?.id === filterClient)
    : logs

  return (
    <>
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              Client Log
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">Materials sent to clients</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <Download size={13} /> Export CSV
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Log Interaction
            </Button>
          </div>
        </div>

        {/* Filter by client */}
        {uniqueClients.length > 1 && (
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs text-ink-faint">Filter by client:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterClient('')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  !filterClient ? 'border-accent/40 bg-accent/5 text-accent' : 'border-surface-border text-ink-muted hover:text-ink'
                }`}
              >
                All clients
              </button>
              {uniqueClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setFilterClient(client.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filterClient === client.id ? 'border-accent/40 bg-accent/5 text-accent' : 'border-surface-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {client.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Log table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-subtle border border-surface-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookUser}
            title="No interactions logged"
            description="Log materials sent to clients for compliance tracking and audit purposes."
            action={
              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus size={13} /> Log Interaction
              </Button>
            }
          />
        ) : (
          <div className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Client', 'Documents', 'Sent by', 'Date', 'Notes', ''].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <>
                    <tr
                      key={log.id}
                      className={`transition-colors hover:bg-surface-muted/40 cursor-pointer ${
                        i < filtered.length - 1 || expandedId === log.id ? 'border-b border-surface-border' : ''
                      }`}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-ink">{log.client?.name || '—'}</p>
                          <p className="text-[10px] text-ink-faint">
                            {log.client?.type ? CLIENT_TYPE_LABELS[log.client.type] : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-ink-muted">
                          {log.document_ids?.length ?? 0} doc{(log.document_ids?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-ink-muted">{(log.sender as any)?.name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-ink-muted">{formatDate(log.date_sent)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-xs text-ink-faint truncate block">{log.notes || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {expandedId === log.id
                          ? <ChevronUp size={14} className="text-ink-faint" />
                          : <ChevronDown size={14} className="text-ink-faint" />}
                      </td>
                    </tr>

                    {/* Expanded docs row */}
                    {expandedId === log.id && (log.documents?.length ?? 0) > 0 && (
                      <tr key={`${log.id}-expanded`} className={i < filtered.length - 1 ? 'border-b border-surface-border' : ''}>
                        <td colSpan={6} className="px-4 py-3 bg-surface-muted/30">
                          <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-2">Documents sent</p>
                          <div className="flex flex-wrap gap-2">
                            {log.documents?.map((doc: any) => (
                              <div key={doc.id} className="flex items-center gap-1.5 text-xs bg-surface-muted px-2.5 py-1 rounded-full text-ink-muted">
                                <FileText size={10} />
                                {doc.filename}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LogInteractionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { fetchLogs(); success('Interaction logged.') }}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
