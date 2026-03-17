import { SearchResult } from '@/types'
import { DocTypeIcon } from '@/components/ui/DocTypeIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, cn } from '@/lib/utils'
import { Plus, Check, Users, CheckSquare, Square } from 'lucide-react'

interface SearchResultItemProps {
  result: SearchResult
  selected?: boolean
  active?: boolean
  inDeck?: boolean
  shortlisted?: boolean
  onSelect: () => void
  onAddToDeck?: () => void
  onToggleShortlist?: () => void
}

export function SearchResultItem({
  result,
  selected,
  active,
  inDeck,
  shortlisted,
  onSelect,
  onAddToDeck,
  onToggleShortlist,
}: SearchResultItemProps) {
  const { chunk, document: doc, similarity } = result
  const pct = Math.round(similarity * 100)

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group p-4 rounded-xl border cursor-pointer transition-all duration-150',
        shortlisted && 'ring-1 ring-accent/30',
        active
          ? 'border-accent/50 bg-accent/5'
          : 'border-surface-border bg-surface-subtle hover:border-accent/30 hover:bg-surface-muted/40'
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5 mb-2">
        {/* Shortlist checkbox */}
        {onToggleShortlist && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleShortlist() }}
            className={cn(
              'mt-0.5 shrink-0 transition-colors',
              shortlisted ? 'text-accent' : 'text-ink-faint hover:text-accent opacity-0 group-hover:opacity-100'
            )}
            title={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            {shortlisted ? <CheckSquare size={14} /> : <Square size={14} />}
          </button>
        )}
        <DocTypeIcon type={doc.type} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-ink truncate">{doc.filename}</p>
          {chunk.slide_number && (
            <p className="text-[10px] text-ink-faint">Slide {chunk.slide_number}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Relevance bar */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full bg-surface-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-ink-faint w-7 text-right">{pct}%</span>
          </div>
          <StatusBadge status={doc.status} size="sm" />
        </div>
      </div>

      {/* Excerpt */}
      <p className="text-xs text-ink-muted line-clamp-3 leading-relaxed mb-3">
        {chunk.content_text}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {doc.client_name && (
            <>
              <span className="text-[10px] text-purple-400 flex items-center gap-0.5">
                <Users size={8} />
                {doc.client_name}
              </span>
              <span className="text-ink-faint text-[10px]">·</span>
            </>
          )}
          <span className="text-[10px] text-ink-faint">{formatDate(doc.upload_date)}</span>
        </div>
        {onAddToDeck && chunk.chunk_type === 'slide' && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToDeck() }}
            className={cn(
              'flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all',
              inDeck
                ? 'text-status-approved bg-status-approved/10'
                : 'text-ink-faint hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100'
            )}
          >
            {inDeck ? <Check size={10} /> : <Plus size={10} />}
            {inDeck ? 'In deck' : 'Add to deck'}
          </button>
        )}
      </div>
    </div>
  )
}
