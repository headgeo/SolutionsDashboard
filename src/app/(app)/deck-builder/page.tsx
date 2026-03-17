'use client'

import { useState, useEffect } from 'react'
import { DeckSlide } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import {
  Layers, GripVertical, Trash2, Download, Search, ArrowUp, ArrowDown,
  Plus, FileText, ChevronDown, ChevronRight, FolderOpen
} from 'lucide-react'
import Link from 'next/link'

interface BrowseDocument {
  document_id: string
  document_name: string
  document_type: string
  status: string
  slides: {
    chunk_id: string
    slide_number: number
    content_text: string
    thumbnail_url: string | null
  }[]
}

export default function DeckBuilderPage() {
  const [slides, setSlides] = useState<DeckSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deckName, setDeckName] = useState('New Deck')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const { toasts, dismiss, success, error } = useToast()

  // Browse slides state
  const [browseDocs, setBrowseDocs] = useState<BrowseDocument[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [showBrowse, setShowBrowse] = useState(false)
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadSlides = async () => {
      const stored: string[] = JSON.parse(sessionStorage.getItem('deckSlides') || '[]')
      if (stored.length === 0) { setLoading(false); return }
      try {
        const res = await fetch(`/api/deck/slides?ids=${stored.join(',')}`)
        const data = await res.json()
        setSlides(data.slides || [])
      } catch {
        error('Failed to load deck slides.')
      } finally {
        setLoading(false)
      }
    }
    loadSlides()
  }, [])

  const loadBrowseSlides = async () => {
    setShowBrowse(true)
    if (browseDocs.length > 0) return // already loaded
    setBrowseLoading(true)
    try {
      const res = await fetch('/api/deck/browse')
      const data = await res.json()
      setBrowseDocs(data.documents || [])
      // Auto-expand first doc
      if (data.documents?.length > 0) {
        setExpandedDocs(new Set([data.documents[0].document_id]))
      }
    } catch {
      error('Failed to load slides.')
    } finally {
      setBrowseLoading(false)
    }
  }

  const addSlide = (chunkId: string, docName: string, slideNum: number, contentText: string) => {
    if (slides.some((s) => s.chunk_id === chunkId)) return // already in deck
    const newSlide: DeckSlide = {
      chunk_id: chunkId,
      document_id: '',
      document_name: docName,
      slide_number: slideNum,
      thumbnail_url: undefined,
      content_text: contentText,
    }
    setSlides((prev) => [...prev, newSlide])
    const stored: string[] = JSON.parse(sessionStorage.getItem('deckSlides') || '[]')
    if (!stored.includes(chunkId)) {
      stored.push(chunkId)
      sessionStorage.setItem('deckSlides', JSON.stringify(stored))
    }
    success(`Slide ${slideNum} added to deck.`)
  }

  const remove = (chunkId: string) => {
    setSlides((prev) => prev.filter((s) => s.chunk_id !== chunkId))
    const stored: string[] = JSON.parse(sessionStorage.getItem('deckSlides') || '[]')
    sessionStorage.setItem('deckSlides', JSON.stringify(stored.filter((id) => id !== chunkId)))
  }

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return
    const next = [...slides]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setSlides(next)
  }

  const handleDragStart = (i: number) => setDragIdx(i)
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i) }
  const handleDrop = (i: number) => {
    if (dragIdx === null) return
    moveSlide(dragIdx, i)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleExport = async () => {
    if (slides.length === 0) return
    setExporting(true)
    try {
      const res = await fetch('/api/deck/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: slides.map((s) => s.chunk_id), name: deckName }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${deckName.replace(/\s+/g, '_')}_manifest.json`
      a.click()
      URL.revokeObjectURL(url)
      success('Deck exported successfully.')
    } catch {
      error('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const clearDeck = () => {
    setSlides([])
    sessionStorage.removeItem('deckSlides')
  }

  const toggleDocExpand = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  const slideIdsInDeck = new Set(slides.map((s) => s.chunk_id))

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="h-8 w-40 bg-surface-muted rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-subtle border border-surface-border rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-fade-in">
        {/* Main deck panel */}
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                Deck Builder
              </h1>
              <p className="text-sm text-ink-muted mt-0.5">
                {slides.length} slide{slides.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadBrowseSlides}>
                <FolderOpen size={13} /> Browse Slides
              </Button>
              {slides.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearDeck}>
                  <Trash2 size={13} /> Clear all
                </Button>
              )}
              <Button onClick={handleExport} loading={exporting} disabled={slides.length === 0}>
                <Download size={14} />
                Export Manifest
              </Button>
            </div>
          </div>

          {slides.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Your deck is empty"
              description="Browse uploaded presentations to add slides, or search for specific content."
              action={
                <div className="flex gap-2">
                  <Button size="sm" onClick={loadBrowseSlides}>
                    <FolderOpen size={13} /> Browse Slides
                  </Button>
                  <Link href="/search">
                    <Button size="sm" variant="secondary">
                      <Search size={13} /> Search
                    </Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              {/* Deck name input */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
                  Deck name
                </label>
                <input
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-ink bg-surface-muted border border-surface-border
                             focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                />
              </div>

              {/* Slide list */}
              <div className="space-y-2">
                <p className="text-xs text-ink-faint mb-3">Drag to reorder</p>
                {slides.map((slide, i) => (
                  <div
                    key={slide.chunk_id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all
                      ${dragOverIdx === i ? 'border-accent bg-accent/5' : 'border-surface-border bg-surface-subtle'}
                      ${dragIdx === i ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="mt-1 cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink-muted">
                      <GripVertical size={16} />
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-mono text-ink-muted">{i + 1}</span>
                    </div>
                    {slide.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slide.thumbnail_url} alt={`Slide ${i + 1}`}
                        className="w-24 h-16 rounded-md object-cover border border-surface-border shrink-0" />
                    ) : (
                      <div className="w-24 h-16 rounded-md bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
                        <Layers size={16} className="text-ink-faint" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{slide.document_name}</p>
                      {slide.slide_number && (
                        <p className="text-[10px] text-ink-faint mb-1">Slide {slide.slide_number}</p>
                      )}
                      <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">{slide.content_text}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => moveSlide(i, i - 1)} disabled={i === 0}
                        className="p-1 rounded text-ink-faint hover:text-ink disabled:opacity-20 transition-colors">
                        <ArrowUp size={13} />
                      </button>
                      <button onClick={() => moveSlide(i, i + 1)} disabled={i === slides.length - 1}
                        className="p-1 rounded text-ink-faint hover:text-ink disabled:opacity-20 transition-colors">
                        <ArrowDown size={13} />
                      </button>
                      <button onClick={() => remove(slide.chunk_id)}
                        className="p-1 rounded text-ink-faint hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Export footer */}
              <div className="mt-6 p-4 rounded-xl border border-surface-border bg-surface-subtle flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{deckName}</p>
                  <p className="text-xs text-ink-muted">{slides.length} slides</p>
                </div>
                <Button onClick={handleExport} loading={exporting}>
                  <Download size={14} />
                  Export Manifest
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Browse slides sidebar */}
        {showBrowse && (
          <div className="w-[360px] shrink-0 border-l border-surface-border overflow-y-auto bg-surface-subtle animate-fade-in">
            <div className="p-4 border-b border-surface-border sticky top-0 bg-surface-subtle z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Slide Library</h2>
                <button onClick={() => setShowBrowse(false)}
                  className="text-ink-faint hover:text-ink transition-colors text-xs">
                  Close
                </button>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Browse slides from uploaded presentations
              </p>
            </div>

            {browseLoading ? (
              <div className="p-8 flex flex-col items-center gap-3">
                <div className="h-4 w-32 bg-surface-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-surface-muted rounded animate-pulse" />
              </div>
            ) : browseDocs.length === 0 ? (
              <div className="p-8 text-center">
                <FileText size={24} className="mx-auto text-ink-faint mb-2" />
                <p className="text-sm text-ink-muted">No presentations indexed yet.</p>
                <p className="text-xs text-ink-faint mt-1">Upload a PPTX file in the Library.</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {browseDocs.map((doc) => (
                  <div key={doc.document_id} className="rounded-lg border border-surface-border bg-surface overflow-hidden">
                    {/* Document header */}
                    <button
                      onClick={() => toggleDocExpand(doc.document_id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-muted transition-colors"
                    >
                      {expandedDocs.has(doc.document_id) ? (
                        <ChevronDown size={13} className="text-ink-faint shrink-0" />
                      ) : (
                        <ChevronRight size={13} className="text-ink-faint shrink-0" />
                      )}
                      <FileText size={13} className="text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{doc.document_name}</p>
                        <p className="text-[10px] text-ink-faint">{doc.slides.length} slide{doc.slides.length !== 1 ? 's' : ''}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          for (const slide of doc.slides) {
                            if (!slideIdsInDeck.has(slide.chunk_id)) {
                              addSlide(slide.chunk_id, doc.document_name, slide.slide_number, slide.content_text)
                            }
                          }
                        }}
                        className="text-[10px] px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors shrink-0"
                        title="Add all slides"
                      >
                        Add all
                      </button>
                    </button>

                    {/* Slides list */}
                    {expandedDocs.has(doc.document_id) && (
                      <div className="border-t border-surface-border">
                        {doc.slides.map((slide) => {
                          const inDeck = slideIdsInDeck.has(slide.chunk_id)
                          return (
                            <div
                              key={slide.chunk_id}
                              className={`flex items-start gap-2 px-3 py-2 border-b border-surface-border last:border-b-0
                                ${inDeck ? 'bg-accent/5' : 'hover:bg-surface-muted'} transition-colors`}
                            >
                              <div className="w-5 h-5 rounded bg-surface-muted flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] font-mono text-ink-faint">{slide.slide_number}</span>
                              </div>
                              <p className="text-xs text-ink-muted line-clamp-2 flex-1 leading-relaxed">
                                {slide.content_text}
                              </p>
                              <button
                                onClick={() => {
                                  if (inDeck) {
                                    remove(slide.chunk_id)
                                  } else {
                                    addSlide(slide.chunk_id, doc.document_name, slide.slide_number, slide.content_text)
                                  }
                                }}
                                className={`p-1 rounded shrink-0 transition-colors ${
                                  inDeck
                                    ? 'text-accent hover:text-red-400'
                                    : 'text-ink-faint hover:text-accent'
                                }`}
                                title={inDeck ? 'Remove from deck' : 'Add to deck'}
                              >
                                {inDeck ? <Trash2 size={12} /> : <Plus size={12} />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
