'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { SearchResult } from '@/types'
import { SearchResultItem } from '@/components/search/SearchResultItem'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { DocTypeIcon } from '@/components/ui/DocTypeIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Search, Loader2, SlidersHorizontal, X, Sparkles, FileText, Download, Plus, Check, Users, Trash2 } from 'lucide-react'
import { STATUS_OPTIONS, DOC_TYPES } from '@/lib/constants'
import { CLIENT_TYPE_LABELS, CONTENT_TYPE_LABELS } from '@/types'
import { cn, formatDate } from '@/lib/utils'

const EXAMPLE_QUERIES = [
  'Client presentation materials',
  'Term sheet template',
  'Risk factor disclosures',
  'Market commentary latest',
  'Pricing model overview',
]

const ALL = { value: '', label: 'All' }

interface ClientOption { id: string; name: string }

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [deckSlides, setDeckSlides] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [filters, setFilters] = useState({ status: '', type: '', client_id: '' })
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Selected results (multiple)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      setClients(data.clients || [])
    }).catch(() => {})
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setSelectedIds(new Set())
    setAiAnswer(null)
    try {
      const params = new URLSearchParams({ query: q })
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      const searchResults = data.results || []
      setResults(searchResults)

      if (searchResults.length > 0) {
        setAiLoading(true)
        const topChunks = searchResults.slice(0, 5).map((r: any) => ({
          content: r.chunk.content_text,
          filename: r.document.filename,
          slide_number: r.chunk.slide_number,
        }))
        fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, chunks: topChunks }),
        })
          .then(r => r.json())
          .then(data => setAiAnswer(data.answer || null))
          .catch(() => {})
          .finally(() => setAiLoading(false))
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(query)
  }

  const toggleDeck = (chunkId: string) => {
    setDeckSlides((prev) => {
      const next = new Set(prev)
      if (next.has(chunkId)) next.delete(chunkId)
      else next.add(chunkId)
      const stored = JSON.parse(sessionStorage.getItem('deckSlides') || '[]')
      if (next.has(chunkId)) {
        if (!stored.includes(chunkId)) stored.push(chunkId)
      } else {
        const idx = stored.indexOf(chunkId)
        if (idx > -1) stored.splice(idx, 1)
      }
      sessionStorage.setItem('deckSlides', JSON.stringify(stored))
      return next
    })
  }

  const toggleSelected = (chunkId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(chunkId)) next.delete(chunkId)
      else next.add(chunkId)
      return next
    })
  }

  const selectedResults = results.filter((r) => selectedIds.has(r.chunk.id))
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-col h-screen overflow-hidden animate-fade-in">
      {/* Search header */}
      <div className="px-8 pt-8 pb-4 border-b border-surface-border bg-surface shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-ink">Search</h1>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <X size={12} /> Clear {selectedIds.size} selected
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents, slides, and passages..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-ink placeholder-ink-faint
                         bg-surface-muted border border-surface-border
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'px-3 py-3 rounded-xl border text-sm transition-colors',
              showFilters || hasFilters
                ? 'border-accent/40 text-accent bg-accent/5'
                : 'border-surface-border text-ink-muted hover:text-ink bg-surface-muted'
            )}
          >
            <SlidersHorizontal size={15} />
          </button>
        </form>

        {showFilters && (
          <div className="flex flex-wrap gap-3 py-3 animate-slide-up">
            <div className="w-36">
              <Select options={[ALL, ...STATUS_OPTIONS]} value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })} placeholder="Status" />
            </div>
            <div className="w-36">
              <Select options={[ALL, ...DOC_TYPES]} value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })} placeholder="File type" />
            </div>
            <div className="w-52">
              <Select options={[ALL, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                value={filters.client_id}
                onChange={(e) => setFilters({ ...filters, client_id: e.target.value })} placeholder="Client" />
            </div>
            {hasFilters && (
              <button onClick={() => setFilters({ status: '', type: '', client_id: '' })}
                className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors self-center">
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        )}

        {!searched && (
          <div className="flex flex-wrap gap-2 mt-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); runSearch(q) }}
                className="text-xs px-3 py-1.5 rounded-full border border-surface-border bg-surface-muted
                           text-ink-muted hover:text-ink hover:border-accent/30 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Two-column: results | selected previews */}
      <div className="flex flex-1 overflow-hidden">
        {/* Results list */}
        <div className="w-[420px] shrink-0 border-r border-surface-border overflow-y-auto p-4 space-y-2.5">
          {(aiLoading || aiAnswer) && (
            <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 mb-3 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">AI Answer</span>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Generating answer...
                </div>
              ) : (
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={22} className="text-accent animate-spin" />
              <p className="text-sm text-ink-muted">Searching knowledge base...</p>
            </div>
          ) : !searched ? (
            <EmptyState
              icon={Search}
              title="Start searching"
              description="Enter a natural language question or topic to find matching documents and slides."
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No results found"
              description="Try rephrasing your query or adjusting the filters."
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-1 pb-1">
                <p className="text-xs text-ink-faint">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-ink-faint">Click checkbox to select multiple</p>
              </div>
              {results.map((result) => (
                <SearchResultItem
                  key={result.chunk.id}
                  result={result}
                  active={selectedIds.has(result.chunk.id)}
                  inDeck={deckSlides.has(result.chunk.id)}
                  shortlisted={selectedIds.has(result.chunk.id)}
                  onSelect={() => toggleSelected(result.chunk.id)}
                  onAddToDeck={() => toggleDeck(result.chunk.id)}
                  onToggleShortlist={() => toggleSelected(result.chunk.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Right panel: selected results stacked */}
        <div className="flex-1 overflow-y-auto">
          {selectedResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-14 h-14 rounded-xl border border-surface-border bg-surface-muted flex items-center justify-center mb-4">
                <FileText size={22} className="text-ink-faint" />
              </div>
              <p className="text-sm font-medium text-ink mb-1">Select results</p>
              <p className="text-xs text-ink-muted">Click the checkbox on any search result to view it here.<br/>Select multiple to compare side by side.</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Selection summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">
                  {selectedResults.length} result{selectedResults.length !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={11} /> Clear all
                </button>
              </div>

              {/* Stacked result cards */}
              {selectedResults.map((result) => {
                const { chunk, document: doc, similarity } = result
                return (
                  <div key={chunk.id} className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
                    {/* Card header */}
                    <div className="p-4 border-b border-surface-border">
                      <div className="flex items-start gap-3 mb-2">
                        <DocTypeIcon type={doc.type} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink leading-snug">{doc.filename}</p>
                          {chunk.slide_number && (
                            <p className="text-xs text-ink-muted">Slide {chunk.slide_number}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={doc.status} />
                          <button
                            onClick={() => toggleSelected(chunk.id)}
                            className="p-1 rounded text-ink-faint hover:text-red-400 transition-colors"
                            title="Remove from selection"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {doc.client_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 flex items-center gap-1">
                            <Users size={8} /> {doc.client_name}
                          </span>
                        )}
                        {[CLIENT_TYPE_LABELS[doc.client_type], CONTENT_TYPE_LABELS[doc.content_type]]
                          .filter(Boolean)
                          .map((label) => (
                            <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-muted text-ink-muted">
                              {label}
                            </span>
                          ))}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          {Math.round(similarity * 100)}% match
                        </span>
                      </div>
                    </div>

                    {/* Slide image */}
                    {result.slide_image && (
                      <div className="border-b border-surface-border bg-surface-muted p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.slide_image.image_url}
                          alt={`Slide ${chunk.slide_number}`}
                          className="w-full h-auto rounded-lg"
                        />
                      </div>
                    )}

                    {/* Content text */}
                    <div className="p-4">
                      <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
                        {chunk.chunk_type === 'slide' ? 'Slide text' : 'Matched passage'}
                      </p>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{chunk.content_text}</p>
                    </div>

                    {/* Actions footer */}
                    <div className="px-4 py-3 border-t border-surface-border flex items-center gap-2 bg-surface-muted/30">
                      {chunk.chunk_type === 'slide' && (
                        <Button
                          variant={deckSlides.has(chunk.id) ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => toggleDeck(chunk.id)}
                        >
                          {deckSlides.has(chunk.id) ? <Check size={12} /> : <Plus size={12} />}
                          {deckSlides.has(chunk.id) ? 'In deck' : 'Add to deck'}
                        </Button>
                      )}
                      <a href={`/api/documents/${doc.id}/download`}>
                        <Button variant="secondary" size="sm">
                          <Download size={12} /> Download
                        </Button>
                      </a>
                      <span className="text-[10px] text-ink-faint ml-auto">{formatDate(doc.upload_date)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deck tray hint */}
      {deckSlides.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-full
                        border border-accent/30 bg-surface-subtle shadow-xl backdrop-blur-sm animate-slide-up">
          <span className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
            {deckSlides.size}
          </span>
          <span className="text-sm text-ink">slide{deckSlides.size !== 1 ? 's' : ''} in deck</span>
          <a href="/deck-builder" className="text-sm text-accent hover:text-accent-hover font-medium transition-colors">
            Open Deck Builder
          </a>
        </div>
      )}
    </div>
  )
}
