'use client'

import { SearchResult } from '@/types'
import { DocTypeIcon } from '@/components/ui/DocTypeIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { CLIENT_TYPE_LABELS, CONTENT_TYPE_LABELS } from '@/types'
import { formatDate } from '@/lib/utils'
import { Download, Plus, Check, FileText, Users } from 'lucide-react'

interface PreviewPanelProps {
  result: SearchResult | null
  inDeck?: boolean
  onAddToDeck?: () => void
}

export function PreviewPanel({ result, inDeck, onAddToDeck }: PreviewPanelProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-14 h-14 rounded-xl border border-surface-border bg-surface-muted flex items-center justify-center mb-4">
          <FileText size={22} className="text-ink-faint" />
        </div>
        <p className="text-sm font-medium text-ink mb-1">Select a result</p>
        <p className="text-xs text-ink-muted">Click any search result to preview its content here.</p>
      </div>
    )
  }

  const { chunk, document: doc, similarity } = result

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-start gap-3 mb-3">
          <DocTypeIcon type={doc.type} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink leading-snug">{doc.filename}</p>
            {chunk.slide_number && (
              <p className="text-xs text-ink-muted">Slide {chunk.slide_number}</p>
            )}
          </div>
          <StatusBadge status={doc.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.client_name && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 flex items-center gap-1">
              <Users size={8} />
              {doc.client_name}
            </span>
          )}
          {[
            CLIENT_TYPE_LABELS[doc.client_type],
            CONTENT_TYPE_LABELS[doc.content_type],
          ].filter(Boolean).map((label) => (
            <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-muted text-ink-muted">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Slide image or text content */}
      <div className="flex-1 overflow-y-auto p-5">
        {result.slide_image ? (
          <div className="rounded-lg overflow-hidden border border-surface-border bg-surface-muted mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.slide_image.image_url}
              alt={`Slide ${chunk.slide_number}`}
              className="w-full h-auto"
            />
          </div>
        ) : null}

        {/* Verbatim text */}
        <div className="rounded-lg border border-surface-border bg-surface-muted p-4">
          <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
            {chunk.chunk_type === 'slide' ? 'Slide text' : 'Matched passage'}
          </p>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{chunk.content_text}</p>
        </div>

        {/* Metadata */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-ink-faint">Relevance</span>
            <span className="text-ink font-medium">{Math.round(similarity * 100)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-ink-faint">Uploaded</span>
            <span className="text-ink">{formatDate(doc.upload_date)}</span>
          </div>
          {chunk.page_number && (
            <div className="flex justify-between text-xs">
              <span className="text-ink-faint">Page</span>
              <span className="text-ink">{chunk.page_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-surface-border flex gap-2">
        {onAddToDeck && chunk.chunk_type === 'slide' && (
          <Button
            variant={inDeck ? 'secondary' : 'primary'}
            size="sm"
            className="flex-1"
            onClick={onAddToDeck}
          >
            {inDeck ? <Check size={13} /> : <Plus size={13} />}
            {inDeck ? 'Added to deck' : 'Add to deck'}
          </Button>
        )}
        <a href={`/api/documents/${doc.id}/download`}>
          <Button variant="secondary" size="sm">
            <Download size={13} />
          </Button>
        </a>
      </div>
    </div>
  )
}
