'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { CLIENT_TYPES, CONTENT_TYPES, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants'
import { X, Plus, Upload, FileText, Check, Link2, Users, FolderOpen } from 'lucide-react'

interface Document { id: string; filename: string; type: string }
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
    folder_link: '',
    contacts: [] as string[],
    custom_documents: [] as string[],
  })

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadContentType, setUploadContentType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tag input state
  const [contactInput, setContactInput] = useState('')
  const [customDocInput, setCustomDocInput] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setUploadFile(null)
    setShowUpload(false)
    setContactInput('')
    setCustomDocInput('')
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

  const addTag = (field: 'contacts' | 'custom_documents', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (form[field].includes(trimmed)) return
    setForm((prev) => ({ ...prev, [field]: [...prev[field], trimmed] }))
  }

  const removeTag = (field: 'contacts' | 'custom_documents', idx: number) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }))
  }

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>, field: 'contacts' | 'custom_documents', inputVal: string, setInputVal: (v: string) => void) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(field, inputVal)
      setInputVal('')
    }
  }

  const handleUploadFile = async () => {
    if (!uploadFile) return
    if (!uploadContentType) { setError('Please select a content type for the uploaded document.'); return }
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('content_type', uploadContentType)
      formData.append('status', 'approved')
      formData.append('upload_date', form.date_sent)
      if (form.client_id) formData.append('client_id', form.client_id)

      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }
      const { document: doc } = await res.json()
      setDocuments((prev) => [{ id: doc.id, filename: doc.filename, type: doc.type }, ...prev])
      setForm((prev) => ({ ...prev, document_ids: [...prev.document_ids, doc.id] }))
      setUploadFile(null)
      setUploadContentType('')
      setShowUpload(false)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isNewClient && !form.client_id) { setError('Please select a client.'); return }
    if (isNewClient && !form.new_client_name) { setError('Please enter a client name.'); return }
    if (form.document_ids.length === 0 && form.custom_documents.length === 0) {
      setError('Please select at least one document or add a custom document entry.')
      return
    }

    // Flush pending tag inputs
    if (contactInput.trim()) addTag('contacts', contactInput)
    if (customDocInput.trim()) addTag('custom_documents', customDocInput)

    setLoading(true)
    try {
      const body: any = {
        document_ids: form.document_ids,
        date_sent: form.date_sent,
        notes: form.notes,
        folder_link: form.folder_link || null,
        contacts: [...form.contacts, ...(contactInput.trim() ? [contactInput.trim()] : [])],
        custom_documents: [...form.custom_documents, ...(customDocInput.trim() ? [customDocInput.trim()] : [])],
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

  const docTypeIcon = (type: string) => {
    const colors: Record<string, string> = { pptx: 'text-orange-400', xlsx: 'text-emerald-400', docx: 'text-blue-400', pdf: 'text-red-400' }
    return colors[type] || 'text-ink-faint'
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Client Interaction" description="Record materials sent to a client" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
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

        {/* Contacts sent to */}
        <div>
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users size={11} /> Contacts sent to
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.contacts.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full">
                {c}
                <button type="button" onClick={() => removeTag('contacts', i)}
                  className="hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={contactInput}
            onChange={(e) => setContactInput(e.target.value)}
            onKeyDown={(e) => handleTagKey(e, 'contacts', contactInput, setContactInput)}
            onBlur={() => { if (contactInput.trim()) { addTag('contacts', contactInput); setContactInput('') } }}
            placeholder="Type a name and press Enter..."
            className="w-full px-3 py-2 rounded-lg text-sm text-ink placeholder-ink-faint
                       bg-surface-muted border border-surface-border
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        {/* Documents sent */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">
              Documents ({form.document_ids.length} selected)
            </label>
            <button type="button" onClick={() => setShowUpload((v) => !v)}
              className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
              <Upload size={11} /> {showUpload ? 'Hide upload' : 'Upload new'}
            </button>
          </div>

          {/* Inline upload */}
          {showUpload && (
            <div className="mb-3 p-3 rounded-lg border border-accent/20 bg-accent/5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      if (f.size > MAX_FILE_SIZE_BYTES) {
                        setError(`File too large. Max ${MAX_FILE_SIZE_MB}MB.`)
                        return
                      }
                      setUploadFile(f)
                    }
                  }}
                />
                {uploadFile ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText size={14} className="text-accent shrink-0" />
                    <span className="text-xs text-ink truncate">{uploadFile.name}</span>
                    <button type="button" onClick={() => setUploadFile(null)}
                      className="p-0.5 rounded text-ink-faint hover:text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-xs text-ink-muted hover:text-ink transition-colors flex-1">
                    <Upload size={12} /> Choose file (.pptx, .xlsx, .docx, .pdf)
                  </button>
                )}
              </div>
              {uploadFile && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select options={CONTENT_TYPES} placeholder="Content type..."
                      value={uploadContentType}
                      onChange={(e) => setUploadContentType(e.target.value)} />
                  </div>
                  <Button type="button" size="sm" onClick={handleUploadFile} loading={uploading}
                    disabled={!uploadContentType}>
                    <Upload size={12} /> Upload
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-surface-border p-3 bg-surface-muted">
            {documents.length === 0 ? (
              <p className="text-xs text-ink-faint text-center py-4">
                No approved documents available. Upload one above.
              </p>
            ) : (
              documents.map((doc) => {
                const selected = form.document_ids.includes(doc.id)
                return (
                  <label key={doc.id}
                    className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 transition-colors
                      ${selected ? 'bg-accent/5' : 'hover:bg-surface-subtle'}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                      ${selected ? 'bg-accent border-accent' : 'border-surface-border'}`}>
                      {selected && <Check size={10} className="text-white" />}
                    </div>
                    <input type="checkbox" checked={selected} onChange={() => toggleDoc(doc.id)} className="sr-only" />
                    <FileText size={12} className={docTypeIcon(doc.type)} />
                    <span className="text-xs text-ink truncate">{doc.filename}</span>
                  </label>
                )
              })
            )}
          </div>
        </div>

        {/* Custom documents / file types */}
        <div>
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FolderOpen size={11} /> Custom documents / file references
          </label>
          <p className="text-[10px] text-ink-faint mb-2">For files not in the system — type a name or description and press Enter</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.custom_documents.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-surface-muted text-ink px-2.5 py-1 rounded-full border border-surface-border">
                <FileText size={10} className="text-ink-faint" />
                {d}
                <button type="button" onClick={() => removeTag('custom_documents', i)}
                  className="hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={customDocInput}
            onChange={(e) => setCustomDocInput(e.target.value)}
            onKeyDown={(e) => handleTagKey(e, 'custom_documents', customDocInput, setCustomDocInput)}
            onBlur={() => { if (customDocInput.trim()) { addTag('custom_documents', customDocInput); setCustomDocInput('') } }}
            placeholder='e.g. "Q4 Performance Report.pdf", "Risk Summary Excel"...'
            className="w-full px-3 py-2 rounded-lg text-sm text-ink placeholder-ink-faint
                       bg-surface-muted border border-surface-border
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        {/* Folder link */}
        <div>
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Link2 size={11} /> Folder link
          </label>
          <input
            type="url"
            value={form.folder_link}
            onChange={(e) => setForm({ ...form, folder_link: e.target.value })}
            placeholder="https://drive.google.com/... or SharePoint link (optional)"
            className="w-full px-3 py-2 rounded-lg text-sm text-ink placeholder-ink-faint
                       bg-surface-muted border border-surface-border
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
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
