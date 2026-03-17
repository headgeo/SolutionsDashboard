'use client'

import { Document, CLIENT_TYPE_LABELS, CONTENT_TYPE_LABELS } from '@/types'
import { DocTypeIcon } from '@/components/ui/DocTypeIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Download, MoreVertical, Archive, CheckCircle, Trash2, Users, RefreshCw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface DocumentCardProps {
  document: Document
  isAdmin?: boolean
  onStatusChange?: (id: string, status: Document['status']) => void
  onDelete?: (id: string) => void
  onReindex?: (id: string) => void
}

export function DocumentCard({ document: doc, isAdmin, onStatusChange, onDelete, onReindex }: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="group rounded-xl border border-surface-border bg-surface-subtle p-4 card-hover flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <DocTypeIcon type={doc.type} size="md" />
        <div className="flex items-center gap-1.5 ml-auto">
          <StatusBadge status={doc.status} size="sm" />
          {isAdmin && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical size={13} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-surface-border bg-surface-subtle shadow-xl z-20 py-1">
                  {doc.status !== 'approved' && (
                    <button
                      onClick={() => { onStatusChange?.(doc.id, 'approved'); setMenuOpen(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ink-muted hover:text-status-approved hover:bg-surface-muted transition-colors"
                    >
                      <CheckCircle size={12} /> Mark Approved
                    </button>
                  )}
                  {doc.status !== 'draft' && (
                    <button
                      onClick={() => { onStatusChange?.(doc.id, 'draft'); setMenuOpen(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ink-muted hover:text-status-draft hover:bg-surface-muted transition-colors"
                    >
                      <Archive size={12} /> Set as Draft
                    </button>
                  )}
                  {doc.status !== 'archived' && (
                    <button
                      onClick={() => { onStatusChange?.(doc.id, 'archived'); setMenuOpen(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ink-muted hover:text-ink-faint hover:bg-surface-muted transition-colors"
                    >
                      <Archive size={12} /> Archive
                    </button>
                  )}
                  <button
                    onClick={() => { onReindex?.(doc.id); setMenuOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ink-muted hover:text-accent hover:bg-surface-muted transition-colors"
                  >
                    <RefreshCw size={12} /> Re-index
                  </button>
                  <div className="border-t border-surface-border my-1" />
                  <button
                    onClick={() => { onDelete?.(doc.id); setMenuOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filename */}
      <div>
        <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{doc.filename}</p>
        {doc.summary && (
          <p className="text-[11px] text-ink-muted leading-relaxed mt-1 line-clamp-2">{doc.summary}</p>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {doc.client_name && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 flex items-center gap-1">
            <Users size={8} />
            {doc.client_name}
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-muted text-ink-muted">
          {CONTENT_TYPE_LABELS[doc.content_type]}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-border mt-auto">
        <span className="text-[11px] text-ink-faint">{formatDate(doc.upload_date)}</span>
        <div className="flex items-center gap-1">
          {doc.chunk_count != null && (
            <span className="text-[10px] text-ink-faint">{doc.chunk_count} chunks</span>
          )}
          <a
            href={`/api/documents/${doc.id}/download`}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors opacity-0 group-hover:opacity-100"
            title="Download"
          >
            <Download size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}
