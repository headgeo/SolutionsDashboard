'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { SearchResult } from '@/types'
import { SearchResultItem } from '@/components/search/SearchResultItem'
import { PreviewPanel } from '@/components/search/PreviewPanel'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { STATUS_OPTIONS, DOC_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

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
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [deckSlides, setDeckSlides] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [filters, setFilters] = useState({ status: '', type: '', client_id: '' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      setClients(data.clients || [])
    }).catch(() => {})
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setSelected(null)
    try {
      const params = new URLSearchParams({ query: q })
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      setResults(data.results || [])
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

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-col h-screen overflow-hidden animate-fade-in">
      {/* Search header */}
      <div className="px-8 pt-8 pb-4 border-b border-surface-border bg-surface shrink-0">
        <h1 className="text-2xl font-semibold text-ink mb-4">
          Search
        </h1>

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

        {/* Filters row */}
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

        {/* Example queries (before first search) */}
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

      {/* Two-column results */}
      <div className="flex flex-1 overflow-hidden">
        {/* Results list */}
        <div className="w-[420px] shrink-0 border-r border-surface-border overflow-y-auto p-4 space-y-2.5">
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
              <p className="text-xs text-ink-faint px-1 pb-1">
                {results.length} result{results.length !== 1 ? 's' : ''} — ranked by relevance
              </p>
              {results.map((result) => (
                <SearchResultItem
                  key={result.chunk.id}
                  result={result}
                  active={selected?.chunk.id === result.chunk.id}
                  inDeck={deckSlides.has(result.chunk.id)}
                  onSelect={() => setSelected(result)}
                  onAddToDeck={() => toggleDeck(result.chunk.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel
            result={selected}
            inDeck={selected ? deckSlides.has(selected.chunk.id) : false}
            onAddToDeck={selected ? () => toggleDeck(selected.chunk.id) : undefined}
          />
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
