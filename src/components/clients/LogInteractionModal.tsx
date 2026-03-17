'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { CLIENT_TYPES } from '@/lib/constants'
import { X, Plus } from 'lucide-react'

interface Document { id: string; filename: string }
interface Client { id: string; name: string }

interface LogInteractionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function LogInteractionModal({ open, onClose, onSuccess }: LogInteractionModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewClient, setIsNewClient] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    new_client_name: '',
    new_client_type: '',
    document_ids: [] as string[],
    date_sent: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/clients').then((r) => r.json()),
      fetch('/api/documents?status=approved').then((r) => r.json()),
    ]).then(([clientData, docData]) => {
      setClients(clientData.clients || [])
      setDocuments(docData.documents || [])
    })
  }, [open])

  const toggleDoc = (id: string) => {
    setForm((prev) => ({
      ...prev,
      document_ids: prev.document_ids.includes(id)
        ? prev.document_ids.filter((d) => d !== id)
        : [...prev.document_ids, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isNewClient && !form.client_id) { setError('Please select a client.'); return }
    if (isNewClient && !form.new_client_name) { setError('Please enter a client name.'); return }
    if (form.document_ids.length === 0) { setError('Please select at least one document.'); return }

    setLoading(true)
    try {
      const body: any = {
        document_ids: form.document_ids,
        date_sent: form.date_sent,
        notes: form.notes,
      }
      if (isNewClient) {
        body.new_client = { name: form.new_client_name, type: form.new_client_type || 'institutional' }
      } else {
        body.client_id = form.client_id
      }
      const res = await fetch('/api/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Client Interaction" description="Record materials sent to a client" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Client selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Client *</label>
            <button type="button" onClick={() => setIsNewClient((v) => !v)}
              className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
              <Plus size={11} /> {isNewClient ? 'Select existing' : 'New client'}
            </button>
          </div>
          {isNewClient ? (
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Client name" value={form.new_client_name}
                onChange={(e) => setForm({ ...form, new_client_name: e.target.value })} />
              <Select options={CLIENT_TYPES} placeholder="Client type..."
                value={form.new_client_type}
                onChange={(e) => setForm({ ...form, new_client_type: e.target.value })} />
            </div>
          ) : (
            <Select
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select client..."
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            />
          )}
        </div>

        {/* Documents sent */}
        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
            Documents sent * ({form.document_ids.length} selected)
          </label>
          <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-surface-border p-3 bg-surface-muted">
            {documents.length === 0 ? (
              <p className="text-xs text-ink-faint text-center py-4">No approved documents available.</p>
            ) : (
              documents.map((doc) => (
                <label key={doc.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.document_ids.includes(doc.id)}
                    onChange={() => toggleDoc(doc.id)}
                    className="rounded border-surface-border text-accent focus:ring-accent/30"
                  />
                  <span className="text-xs text-ink-muted group-hover:text-ink transition-colors truncate">
                    {doc.filename}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Date sent" type="date" value={form.date_sent}
            onChange={(e) => setForm({ ...form, date_sent: e.target.value })} />
          <div>
            <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm text-ink placeholder-ink-faint resize-none
                         bg-surface-muted border border-surface-border
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <X size={14} /> {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Log Interaction</Button>
        </div>
      </form>
    </Modal>
  )
}
