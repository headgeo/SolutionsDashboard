'use client'

import { useState, useRef, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { Upload, FileText, X, Plus } from 'lucide-react'
import { CLIENT_TYPES, CONTENT_TYPES, STATUS_OPTIONS, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface Client { id: string; name: string }

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [isNewClient, setIsNewClient] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    new_client_name: '',
    new_client_type: '',
    client_type: '',
    content_type: '',
    status: 'draft',
    upload_date: new Date().toISOString().split('T')[0],
    author: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toasts, dismiss, success, error } = useToast()

  useEffect(() => {
    if (!open) return
    fetch('/api/clients').then(r => r.json()).then(data => {
      setClients(data.clients || [])
    }).catch(() => {})
  }, [open])

  const handleFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      error(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`)
      return
    }
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    if (!form.content_type) {
      error('Please select a content type.')
      return
    }

    setLoading(true)
    try {
      // If new client, create it first
      let clientId = form.client_id
      if (isNewClient && form.new_client_name) {
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.new_client_name,
            type: form.new_client_type || 'institutional',
          }),
        })
        if (clientRes.ok) {
          const { client } = await clientRes.json()
          clientId = client.id
        }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('client_id', clientId)
      formData.append('client_type', isNewClient ? (form.new_client_type || 'institutional') : form.client_type)
      formData.append('content_type', form.content_type)
      formData.append('status', form.status)
      formData.append('upload_date', form.upload_date)
      formData.append('author', form.author)

      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      success('Document uploaded and indexed successfully.')
      setFile(null)
      setForm({ client_id: '', new_client_name: '', new_client_type: '', client_type: '', content_type: '', status: 'draft', upload_date: new Date().toISOString().split('T')[0], author: '' })
      setIsNewClient(false)
      onSuccess()
      onClose()
    } catch (err: any) {
      error(err.message || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Upload Document" description="Add a new document to the knowledge base" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all',
              dragOver ? 'border-accent bg-accent/5' : 'border-surface-border hover:border-accent/40 hover:bg-surface-muted/50',
              file && 'border-status-approved/40 bg-status-approved/5'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={20} className="text-status-approved" />
                <div className="text-left">
                  <p className="text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-xs text-ink-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="ml-2 p-1 rounded hover:bg-surface-muted text-ink-faint hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={24} className="mx-auto text-ink-faint mb-3" />
                <p className="text-sm text-ink mb-1">Drop file here or click to browse</p>
                <p className="text-xs text-ink-muted">.pptx, .xlsx, .docx, .pdf · Max {MAX_FILE_SIZE_MB}MB</p>
              </div>
            )}
          </div>

          {/* Client selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Client</label>
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
                options={[{ value: '', label: 'No client (general)' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]  }
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                placeholder="Select client..."
              />
            )}
          </div>

          {/* Metadata fields */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Content Type *"
              options={CONTENT_TYPES}
              placeholder="Select content type..."
              value={form.content_type}
              onChange={(e) => setForm({ ...form, content_type: e.target.value })}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={form.upload_date}
              onChange={(e) => setForm({ ...form, upload_date: e.target.value })}
            />
            <Input
              label="Author"
              placeholder="e.g. Alex Smith"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!file}>
              <Upload size={14} />
              {loading ? 'Uploading...' : 'Upload & Index'}
            </Button>
          </div>
        </form>
      </Modal>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
