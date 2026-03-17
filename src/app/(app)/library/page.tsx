'use client'

import { useState, useEffect, useCallback } from 'react'
import { Document, DocumentStatus, DocumentType, ClientType } from '@/types'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { UploadModal } from '@/components/documents/UploadModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { Upload, Library, SlidersHorizontal, X, Search } from 'lucide-react'
import { CLIENT_TYPES, STATUS_OPTIONS, DOC_TYPES } from '@/lib/constants'

const ALL_OPTION = { value: '', label: 'All' }

interface ClientOption { id: string; name: string }

export default function LibraryPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    client_id: '',
    client_type: '',
  })
  const { toasts, dismiss, success, error } = useToast()

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    try {
      const res = await fetch(`/api/documents?${params}`)
      const data = await res.json()
      setDocs(data.documents || [])
      setIsAdmin(data.isAdmin || false)
    } catch {
      error('Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [filters, error])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      setClients(data.clients || [])
    }).catch(() => {})
  }, [])

  const handleStatusChange = async (id: string, status: DocumentStatus) => {
    try {
      const res = await fetch(`/api/documents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      success(`Document marked as ${status}.`)
      fetchDocs()
    } catch {
      error('Failed to update status.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      success('Document deleted.')
      fetchDocs()
    } catch {
      error('Failed to delete document.')
    }
  }

  const clearFilters = () => setFilters({ status: '', type: '', client_id: '', client_type: '' })
  const hasFilters = Object.values(filters).some(Boolean)

  const filteredClients = clientSearch
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              Library
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {loading ? 'Loading...' : `${docs.length} document${docs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload size={14} />
            Upload Document
          </Button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl border border-surface-border bg-surface-subtle">
          <SlidersHorizontal size={14} className="text-ink-faint shrink-0" />
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="w-36">
              <Select
                options={[ALL_OPTION, ...STATUS_OPTIONS]}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                placeholder="Status"
              />
            </div>
            <div className="w-36">
              <Select
                options={[ALL_OPTION, ...DOC_TYPES]}
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                placeholder="File type"
              />
            </div>
            <div className="w-48">
              <Select
                options={[ALL_OPTION, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                value={filters.client_id}
                onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
                placeholder="Client"
              />
            </div>
            <div className="w-44">
              <Select
                options={[ALL_OPTION, ...CLIENT_TYPES]}
                value={filters.client_type}
                onChange={(e) => setFilters({ ...filters, client_type: e.target.value })}
                placeholder="Client type"
              />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Document grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-surface-subtle border border-surface-border animate-pulse" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={Library}
            title={hasFilters ? 'No documents match your filters' : 'No documents yet'}
            description={hasFilters ? 'Try adjusting your filters.' : 'Upload your first document to start building the knowledge base.'}
            action={
              !hasFilters ? (
                <Button onClick={() => setUploadOpen(true)} size="sm">
                  <Upload size={13} /> Upload Document
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {docs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isAdmin={isAdmin}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={fetchDocs} />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
