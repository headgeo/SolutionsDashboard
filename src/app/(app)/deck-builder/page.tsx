'use client'

import { useState, useEffect } from 'react'
import { DeckSlide } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import {
  Layers, GripVertical, Trash2, Download, Search, ArrowUp, ArrowDown,
  Plus, FileText, ChevronDown, ChevronRight, FolderOpen, Eye, X, Maximize2
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

  // Preview state
  const [previewSlide, setPreviewSlide] = useState<DeckSlide | null>(null)

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
    if (browseDocs.length > 0) return
    setBrowseLoading(true)
    try {
      const res = await fetch('/api/deck/browse')
      const data = await res.json()
      setBrowseDocs(data.documents || [])
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
    if (slides.some((s) => s.chunk_id === chunkId)) return
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
    success(`Slide ${slideNum} added.`)
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[16/10] bg-surface-subtle border border-surface-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-fade-in">
        {/* Main deck panel */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  Deck Builder
                </h1>
                <p className="text-sm text-ink-muted mt-0.5">
                  {slides.length} slide{slides.length !== 1 ? 's' : ''}
                </p>
              </div>
              {slides.length > 0 && (
                <input
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm text-ink bg-surface-muted border border-surface-border
                             focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors w-48"
                  placeholder="Deck name..."
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadBrowseSlides}>
                <FolderOpen size={13} /> Slide Library
              </Button>
              <Link href="/search">
                <Button variant="ghost" size="sm">
                  <Search size={13} /> Search
                </Button>
              </Link>
              {slides.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearDeck}>
                  <Trash2 size={13} /> Clear
                </Button>
              )}
              <Button onClick={handleExport} loading={exporting} disabled={slides.length === 0}>
                <Download size={14} /> Export
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
              {/* Slide grid — PowerPoint-style cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {slides.map((slide, i) => (
                  <div
                    key={slide.chunk_id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                    className={`group relative rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing
                      ${dragOverIdx === i ? 'border-accent shadow-lg scale-[1.02]' : 'border-surface-border hover:border-accent/40'}
                      ${dragIdx === i ? 'opacity-30' : 'opacity-100'}`}
                  >
                    {/* Slide number badge */}
                    <div className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center z-10 shadow-sm">
                      <span className="text-[10px] font-bold text-white">{i + 1}</span>
                    </div>

                    {/* Slide preview area — 16:10 aspect ratio like PowerPoint */}
                    <div
                      className="aspect-[16/10] bg-white rounded-t-[10px] relative overflow-hidden cursor-pointer"
                      onClick={() => setPreviewSlide(slide)}
                    >
                      {slide.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={slide.thumbnail_url} alt={`Slide ${i + 1}`}
                          className="w-full h-full object-cover" />
                      ) : (
                        /* Text-based slide preview */
                        <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-white to-gray-50">
                          <div>
                            {/* Extract first line as a "title" */}
                            <p className="text-[9px] font-semibold text-gray-800 leading-tight line-clamp-2 mb-1.5">
                              {slide.content_text.split(/[.!?\n]/)[0]?.trim() || 'Slide Content'}
                            </p>
                            <div className="space-y-0.5">
                              {slide.content_text
                                .split(/[.!?\n]/)
                                .slice(1, 5)
                                .filter(s => s.trim().length > 3)
                                .map((line, j) => (
                                  <p key={j} className="text-[7px] text-gray-500 leading-tight truncate">
                                    {line.trim()}
                                  </p>
                                ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-[2px] w-8 bg-accent/30 rounded" />
                            <span className="text-[6px] text-gray-400">{slide.slide_number ? `Slide ${slide.slide_number}` : ''}</span>
                          </div>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={18} className="text-white drop-shadow-lg" />
                        </div>
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="px-3 py-2 bg-surface-subtle rounded-b-[10px] border-t border-surface-border">
                      <p className="text-[10px] font-medium text-ink truncate">{slide.document_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-ink-faint">
                          {slide.slide_number ? `Slide ${slide.slide_number}` : 'Content'}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); moveSlide(i, i - 1) }} disabled={i === 0}
                            className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-20 transition-colors"
                            title="Move left">
                            <ArrowUp size={10} className="rotate-[-90deg]" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); moveSlide(i, i + 1) }} disabled={i === slides.length - 1}
                            className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-20 transition-colors"
                            title="Move right">
                            <ArrowDown size={10} className="rotate-[-90deg]" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); remove(slide.chunk_id) }}
                            className="p-0.5 rounded text-ink-faint hover:text-red-400 transition-colors"
                            title="Remove">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Export footer */}
              <div className="mt-8 p-4 rounded-xl border border-surface-border bg-surface-subtle flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{deckName}</p>
                  <p className="text-xs text-ink-muted">{slides.length} slides</p>
                </div>
                <Button onClick={handleExport} loading={exporting}>
                  <Download size={14} /> Export Manifest
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Browse slides sidebar */}
        {showBrowse && (
          <div className="w-[380px] shrink-0 border-l border-surface-border overflow-y-auto bg-surface-subtle animate-slide-in-right">
            <div className="p-4 border-b border-surface-border sticky top-0 bg-surface-subtle z-10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-ink">Slide Library</h2>
                <button onClick={() => setShowBrowse(false)}
                  className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors">
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-ink-muted">
                Add slides from uploaded presentations
              </p>
            </div>

            {browseLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-surface-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : browseDocs.length === 0 ? (
              <div className="p-8 text-center">
                <FileText size={28} className="mx-auto text-ink-faint mb-3" />
                <p className="text-sm text-ink-muted">No presentations indexed yet.</p>
                <p className="text-xs text-ink-faint mt-1 mb-4">Upload a PPTX file in the Library first.</p>
                <Link href="/library">
                  <Button size="sm" variant="secondary">Go to Library</Button>
                </Link>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {browseDocs.map((doc) => (
                  <div key={doc.document_id} className="rounded-xl border border-surface-border bg-surface overflow-hidden">
                    {/* Document header */}
                    <button
                      onClick={() => toggleDocExpand(doc.document_id)}
                      className="w-full flex items-center gap-2.5 px-3 py-3 text-left hover:bg-surface-muted/50 transition-colors"
                    >
                      {expandedDocs.has(doc.document_id) ? (
                        <ChevronDown size={14} className="text-ink-faint shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-ink-faint shrink-0" />
                      )}
                      <div className="w-7 h-7 rounded-lg bg-orange-400/10 flex items-center justify-center shrink-0">
                        <FileText size={13} className="text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{doc.document_name}</p>
                        <p className="text-[10px] text-ink-faint">
                          {doc.slides.length} slide{doc.slides.length !== 1 ? 's' : ''}
                        </p>
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
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors shrink-0 font-medium"
                        title="Add all slides"
                      >
                        Add all
                      </button>
                    </button>

                    {/* Slides grid */}
                    {expandedDocs.has(doc.document_id) && (
                      <div className="border-t border-surface-border p-2 grid grid-cols-2 gap-2">
                        {doc.slides.map((slide) => {
                          const inDeck = slideIdsInDeck.has(slide.chunk_id)
                          return (
                            <div
                              key={slide.chunk_id}
                              className={`rounded-lg border overflow-hidden transition-all
                                ${inDeck ? 'border-accent/40 ring-1 ring-accent/20' : 'border-surface-border hover:border-accent/30'}`}
                            >
                              {/* Mini slide preview */}
                              <div className="aspect-[16/10] bg-white relative">
                                <div className="w-full h-full p-2">
                                  <p className="text-[7px] font-medium text-gray-700 leading-tight line-clamp-3">
                                    {slide.content_text}
                                  </p>
                                </div>
                                {/* Slide number */}
                                <div className="absolute bottom-1 right-1">
                                  <span className="text-[7px] text-gray-400 bg-white/80 px-1 rounded">
                                    {slide.slide_number}
                                  </span>
                                </div>
                              </div>
                              {/* Add/remove button */}
                              <button
                                onClick={() => {
                                  if (inDeck) remove(slide.chunk_id)
                                  else addSlide(slide.chunk_id, doc.document_name, slide.slide_number, slide.content_text)
                                }}
                                className={`w-full py-1.5 text-[10px] font-medium transition-colors
                                  ${inDeck
                                    ? 'bg-accent/10 text-accent hover:bg-red-400/10 hover:text-red-400'
                                    : 'bg-surface-muted text-ink-muted hover:text-accent hover:bg-accent/5'
                                  }`}
                              >
                                {inDeck ? 'Remove' : '+ Add'}
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

      {/* Slide preview modal */}
      {previewSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewSlide(null)}>
          <div className="relative w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewSlide(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
              <X size={16} /> Close
            </button>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {/* Slide content — full preview */}
              <div className="aspect-[16/10] bg-white p-8 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3 leading-snug">
                    {previewSlide.content_text.split(/[.!?\n]/)[0]?.trim() || 'Slide Content'}
                  </h2>
                  <div className="space-y-2">
                    {previewSlide.content_text
                      .split(/[.!?\n]/)
                      .slice(1)
                      .filter(s => s.trim().length > 3)
                      .map((line, j) => (
                        <p key={j} className="text-sm text-gray-600 leading-relaxed">
                          {line.trim()}
                        </p>
                      ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="h-1 w-12 bg-accent/40 rounded" />
                  <span className="text-xs text-gray-400">
                    {previewSlide.slide_number ? `Slide ${previewSlide.slide_number}` : ''}
                  </span>
                </div>
              </div>
              {/* Info bar */}
              <div className="bg-surface-subtle px-6 py-3 flex items-center justify-between border-t border-surface-border">
                <div>
                  <p className="text-sm font-medium text-ink">{previewSlide.document_name}</p>
                  <p className="text-xs text-ink-muted">
                    {previewSlide.slide_number ? `Slide ${previewSlide.slide_number}` : 'Content preview'}
                  </p>
                </div>
                {!slideIdsInDeck.has(previewSlide.chunk_id) ? (
                  <Button size="sm" onClick={() => {
                    addSlide(previewSlide.chunk_id, previewSlide.document_name, previewSlide.slide_number || 0, previewSlide.content_text)
                  }}>
                    <Plus size={13} /> Add to Deck
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => remove(previewSlide.chunk_id)}>
                    <Trash2 size={13} /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
