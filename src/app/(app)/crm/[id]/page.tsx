'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Client, ClientContact, ClientStage, CLIENT_TYPE_LABELS } from '@/types'
import { CLIENT_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft, Edit3, Save, Trash2, Plus, X,
  User, Mail, Phone, FileText, BookUser,
  ExternalLink, FolderOpen, Link2, Users, Send,
  StickyNote, Clock,
} from 'lucide-react'
import Link from 'next/link'

const STAGES: { value: ClientStage; label: string }[] = [
  { value: 'Lost Interest', label: 'Lost Interest' },
  { value: 'Engaged', label: 'Engaged' },
  { value: 'Expression of Interest', label: 'Expression of Interest' },
  { value: 'Unconfirmed Win', label: 'Unconfirmed Win' },
  { value: 'Won Funded', label: 'Won Funded' },
]

const STAGE_COLORS: Record<ClientStage, string> = {
  'Lost Interest': 'text-red-400 bg-red-400/10 border-red-400/20',
  'Engaged': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Expression of Interest': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Unconfirmed Win': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Won Funded': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

function WinProbabilitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const r = value < 50 ? 255 : Math.round(255 - (value - 50) * 5.1)
  const g = value > 50 ? 200 : Math.round(value * 4)
  const color = `rgb(${r}, ${g}, 60)`

  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-2 appearance-none rounded-full bg-surface-muted cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
        style={{ background: `linear-gradient(to right, ${color} ${value}%, var(--color-surface-muted) ${value}%)` }}
      />
      <span className="text-sm font-semibold tabular-nums w-10 text-right" style={{ color }}>{value}%</span>
    </div>
  )
}

function WinProbabilityBar({ value }: { value: number }) {
  const r = value < 50 ? 255 : Math.round(255 - (value - 50) * 5.1)
  const g = value > 50 ? 200 : Math.round(value * 4)
  const color = `rgb(${r}, ${g}, 60)`

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>{value}%</span>
    </div>
  )
}

function formatAUM(v: number): string {
  if (!v) return '—'
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

interface ClientNote {
  id: string
  content: string
  author: { id: string; name: string; email: string } | null
  created_at: string
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toasts, dismiss, success, error } = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [loading, setLoading] = useState(true)

  // Editing state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Client>>({})
  const [editContacts, setEditContacts] = useState<ClientContact[]>([])
  const [newContactForm, setNewContactForm] = useState<ClientContact>({ name: '', email: '', phone: '', role: '' })
  const [saving, setSaving] = useState(false)

  // Notes
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const fetchClient = useCallback(async () => {
    try {
      const [clientRes, notesRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/clients/${id}/notes`),
      ])
      const clientData = await clientRes.json()
      const notesData = await notesRes.json()

      setClient(clientData.client)
      setDocuments(clientData.documents || [])
      setLogs(clientData.logs || [])
      setNotes(notesData.notes || [])
    } catch {
      error('Failed to load client.')
    } finally {
      setLoading(false)
    }
  }, [id, error])

  useEffect(() => { fetchClient() }, [fetchClient])

  const startEdit = () => {
    if (!client) return
    setEditing(true)
    setEditForm({
      name: client.name,
      type: client.type,
      industry: client.industry || '',
      expected_aum: client.expected_aum || 0,
      actual_aum: client.actual_aum || 0,
      stage: client.stage || 'Engaged',
      win_probability: client.win_probability ?? 50,
      contact_email: client.contact_email || '',
      notes: client.notes || '',
    })
    setEditContacts(client.contacts || [])
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, contacts: editContacts }),
      })
      if (!res.ok) throw new Error()
      setEditing(false)
      fetchClient()
      success('Client updated.')
    } catch {
      error('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const deleteClient = async () => {
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      success('Client deleted.')
      router.push('/crm')
    } catch {
      error('Failed to delete.')
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/clients/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      })
      if (!res.ok) throw new Error()
      const { note } = await res.json()
      setNotes((prev) => [note, ...prev])
      setNewNote('')
    } catch {
      error('Failed to add note.')
    } finally {
      setAddingNote(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/clients/${id}/notes?noteId=${noteId}`, { method: 'DELETE' })
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch {
      error('Failed to delete note.')
    }
  }

  const addContactToEdit = () => {
    if (!newContactForm.name.trim()) return
    setEditContacts((prev) => [...prev, { ...newContactForm }])
    setNewContactForm({ name: '', email: '', phone: '', role: '' })
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="h-6 w-32 bg-surface-muted rounded animate-pulse mb-6" />
        <div className="h-10 w-64 bg-surface-muted rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-subtle border border-surface-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <EmptyState icon={Users} title="Client not found" description="This client may have been deleted." />
      </div>
    )
  }

  const stageColor = STAGE_COLORS[client.stage || 'Engaged']

  const docTypeColors: Record<string, string> = {
    pptx: 'text-orange-400', xlsx: 'text-emerald-400', docx: 'text-blue-400', pdf: 'text-red-400',
  }

  return (
    <>
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Back + header */}
        <Link href="/crm" className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors mb-4">
          <ArrowLeft size={12} /> Back to CRM
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                {client.name}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${stageColor}`}>
                {client.stage || 'Engaged'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-muted">{CLIENT_TYPE_LABELS[client.type]}</span>
              {client.industry && (
                <>
                  <span className="text-ink-faint">·</span>
                  <span className="text-sm text-ink-muted">{client.industry}</span>
                </>
              )}
              {client.contact_email && (
                <>
                  <span className="text-ink-faint">·</span>
                  <a href={`mailto:${client.contact_email}`} className="text-sm text-accent hover:underline">{client.contact_email}</a>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button size="sm" variant="secondary" onClick={startEdit}>
                <Edit3 size={12} /> Edit
              </Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} loading={saving}>
                  <Save size={12} /> Save
                </Button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          /* ===== EDIT MODE ===== */
          <div className="space-y-6 mb-10">
            <div className="rounded-xl border border-surface-border bg-surface-subtle p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Company name" value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <Select label="Client type" options={CLIENT_TYPES}
                  value={editForm.type || 'institutional'}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })} />
                <Input label="Industry" placeholder="e.g. Technology, Healthcare..."
                  value={editForm.industry || ''}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Select label="Pipeline stage"
                  options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
                  value={editForm.stage || 'Engaged'}
                  onChange={(e) => setEditForm({ ...editForm, stage: e.target.value as ClientStage })} />
                <Input label="Expected AUM ($)" type="number" placeholder="0"
                  value={String(editForm.expected_aum || '')}
                  onChange={(e) => setEditForm({ ...editForm, expected_aum: parseFloat(e.target.value) || 0 })} />
                <Input label="Actual AUM ($)" type="number" placeholder="0"
                  value={String(editForm.actual_aum || '')}
                  onChange={(e) => setEditForm({ ...editForm, actual_aum: parseFloat(e.target.value) || 0 })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">Win Probability</label>
                <WinProbabilitySlider value={editForm.win_probability ?? 50}
                  onChange={(v) => setEditForm({ ...editForm, win_probability: v })} />
              </div>

              <Input label="Primary email" type="email" placeholder="client@example.com"
                value={editForm.contact_email || ''}
                onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} />

              {/* Contacts editor */}
              <div>
                <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
                  Contacts ({editContacts.length})
                </label>
                {editContacts.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {editContacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-muted border border-surface-border">
                        <User size={12} className="text-ink-faint shrink-0" />
                        <span className="text-xs font-medium text-ink flex-1">{c.name}</span>
                        {c.role && <span className="text-[10px] text-ink-faint">{c.role}</span>}
                        {c.email && <span className="text-[10px] text-accent">{c.email}</span>}
                        {c.phone && <span className="text-[10px] text-ink-faint">{c.phone}</span>}
                        <button onClick={() => setEditContacts((prev) => prev.filter((_, j) => j !== i))}
                          className="p-0.5 text-ink-faint hover:text-red-400 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Input placeholder="Name" value={newContactForm.name}
                    onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })} />
                  <Input placeholder="Email" value={newContactForm.email || ''}
                    onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })} />
                  <Input placeholder="Phone" value={newContactForm.phone || ''}
                    onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })} />
                  <Input placeholder="Role" value={newContactForm.role || ''}
                    onChange={(e) => setNewContactForm({ ...newContactForm, role: e.target.value })} />
                  <Button type="button" size="sm" variant="secondary" onClick={addContactToEdit}>
                    <Plus size={12} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <button onClick={deleteClient}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  <Trash2 size={11} /> Delete client
                </button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={saveEdit} loading={saving}><Save size={12} /> Save</Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ===== VIEW MODE ===== */
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl border border-surface-border bg-surface-subtle">
                <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Expected AUM</p>
                <p className="text-lg font-semibold text-ink">{formatAUM(client.expected_aum || 0)}</p>
              </div>
              <div className="p-4 rounded-xl border border-surface-border bg-surface-subtle">
                <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Actual AUM</p>
                <p className="text-lg font-semibold text-ink">{formatAUM(client.actual_aum || 0)}</p>
              </div>
              <div className="p-4 rounded-xl border border-surface-border bg-surface-subtle">
                <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-2">Win Probability</p>
                <WinProbabilityBar value={client.win_probability ?? 50} />
              </div>
              <div className="p-4 rounded-xl border border-surface-border bg-surface-subtle">
                <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Documents</p>
                <p className="text-lg font-semibold text-ink">{client.document_count || 0}</p>
              </div>
            </div>

            {/* Contacts */}
            {(client.contacts?.length ?? 0) > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                  <Users size={14} className="text-ink-faint" /> Contacts
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {client.contacts!.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-surface-subtle border border-surface-border">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <User size={16} className="text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{c.name}</p>
                        {c.role && <p className="text-xs text-ink-faint">{c.role}</p>}
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="text-xs text-accent hover:underline flex items-center gap-1 mt-0.5">
                            <Mail size={10} /> {c.email}
                          </a>
                        )}
                        {c.phone && (
                          <p className="text-xs text-ink-faint flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {c.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Notes Timeline */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <StickyNote size={14} className="text-ink-faint" /> Notes
          </h2>

          {/* Add note */}
          <div className="flex gap-2 mb-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  addNote()
                }
              }}
              className="flex-1 px-4 py-3 rounded-xl text-sm text-ink placeholder-ink-faint resize-none
                         bg-surface-subtle border border-surface-border
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
            <Button onClick={addNote} loading={addingNote} disabled={!newNote.trim()} className="self-end">
              <Send size={13} /> Add
            </Button>
          </div>

          {/* Notes list */}
          {notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="relative group p-4 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-ink-faint">
                          {note.author?.name || 'Unknown'}
                        </span>
                        <span className="text-ink-faint">·</span>
                        <span className="text-[10px] text-ink-faint flex items-center gap-0.5">
                          <Clock size={8} /> {formatDate(note.created_at)}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => deleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-faint hover:text-red-400 transition-all">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center rounded-xl border border-dashed border-surface-border">
              <StickyNote size={20} className="mx-auto text-ink-faint mb-2" />
              <p className="text-xs text-ink-muted">No notes yet. Add one above.</p>
            </div>
          )}
        </div>

        {/* Documents */}
        {documents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <FileText size={14} className="text-ink-faint" /> Documents ({documents.length})
            </h2>
            <div className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
              {documents.map((doc, i) => (
                <a
                  key={doc.id}
                  href={`/api/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/50 transition-colors
                    ${i < documents.length - 1 ? 'border-b border-surface-border' : ''}`}
                >
                  <FileText size={14} className={docTypeColors[doc.type] || 'text-ink-faint'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{doc.filename}</p>
                    <p className="text-[10px] text-ink-faint">{doc.type?.toUpperCase()} · {formatDate(doc.upload_date)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    doc.status === 'approved' ? 'bg-status-approved/10 text-status-approved' :
                    doc.status === 'draft' ? 'bg-status-draft/10 text-status-draft' :
                    'bg-status-archived/10 text-status-archived'
                  }`}>{doc.status}</span>
                  <ExternalLink size={10} className="text-ink-faint" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Interaction logs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <BookUser size={14} className="text-ink-faint" /> Interaction Log ({logs.length})
            </h2>
            <Link href={`/client-log?client=${id}`}>
              <Button size="sm" variant="ghost">View in Client Log</Button>
            </Link>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink">{formatDate(log.date_sent)}</span>
                      {log.sender && (
                        <span className="text-[10px] text-ink-faint">by {log.sender.name || log.sender.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  {(log.documents?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {log.documents.map((doc: any) => (
                        <a key={doc.id} href={`/api/documents/${doc.id}/download`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-surface-muted border border-surface-border
                                     text-ink-muted hover:text-accent transition-colors"
                          onClick={(e) => e.stopPropagation()}>
                          <FileText size={9} className={docTypeColors[doc.type] || 'text-ink-faint'} />
                          {doc.filename}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Custom documents */}
                  {(log.custom_documents?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {log.custom_documents.map((d: string, j: number) => (
                        <span key={j} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-surface-muted border border-surface-border text-ink-muted">
                          <FolderOpen size={9} /> {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contacts */}
                  {(log.contacts?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {log.contacts.map((c: string, j: number) => (
                        <span key={j} className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}

                  {/* Folder link */}
                  {log.folder_link && (
                    <a href={log.folder_link} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline flex items-center gap-1 mb-1">
                      <Link2 size={8} /> {log.folder_link}
                    </a>
                  )}

                  {log.notes && <p className="text-xs text-ink-faint mt-1">{log.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center rounded-xl border border-dashed border-surface-border">
              <BookUser size={20} className="mx-auto text-ink-faint mb-2" />
              <p className="text-xs text-ink-muted">No interactions logged yet.</p>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
