'use client'

import { useState, useEffect } from 'react'
import { DeckSlide } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { Layers, GripVertical, Trash2, Download, Search, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'

export default function DeckBuilderPage() {
  const [slides, setSlides] = useState<DeckSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deckName, setDeckName] = useState('New Deck')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const { toasts, dismiss, success, error } = useToast()

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
      <div className="p-8 max-w-3xl mx-auto animate-fade-in">
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
            description="Search for slides and add them to your deck using the + button."
            action={
              <Link href="/search">
                <Button size="sm">
                  <Search size={13} /> Go to Search
                </Button>
              </Link>
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
              <p className="text-xs text-ink-faint mb-3">Drag to reorder · {slides.length} slides</p>
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
                  {/* Drag handle */}
                  <div className="mt-1 cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink-muted">
                    <GripVertical size={16} />
                  </div>

                  {/* Slide number */}
                  <div className="w-7 h-7 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-mono text-ink-muted">{i + 1}</span>
                  </div>

                  {/* Thumbnail or placeholder */}
                  {slide.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.thumbnail_url}
                      alt={`Slide ${i + 1}`}
                      className="w-24 h-16 rounded-md object-cover border border-surface-border shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-16 rounded-md bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
                      <Layers size={16} className="text-ink-faint" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{slide.document_name}</p>
                    {slide.slide_number && (
                      <p className="text-[10px] text-ink-faint mb-1">Slide {slide.slide_number}</p>
                    )}
                    <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">{slide.content_text}</p>
                  </div>

                  {/* Actions */}
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
                <p className="text-xs text-ink-muted">{slides.length} slides · Ready to export</p>
              </div>
              <Button onClick={handleExport} loading={exporting}>
                <Download size={14} />
                Export Manifest
              </Button>
            </div>
          </>
        )}
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
