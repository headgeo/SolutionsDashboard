'use client'

import { useState, useEffect, useCallback } from 'react'
import { Client, ClientContact, ClientStage, CLIENT_TYPE_LABELS, CLIENT_STAGE_LABELS } from '@/types'
import { CLIENT_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import {
  Users, Plus, Search, ChevronDown, ChevronUp, Trash2, Save,
  Building2, DollarSign, Target, Phone, Mail, User, X, ExternalLink,
  FileText, TrendingUp, Edit3,
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

function WinProbabilityBar({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  // Colour gradient from red (0) -> yellow (50) -> green (100)
  const r = value < 50 ? 255 : Math.round(255 - (value - 50) * 5.1)
  const g = value > 50 ? 200 : Math.round(value * 4)
  const color = `rgb(${r}, ${g}, 60)`

  if (readonly) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-medium tabular-nums" style={{ color }}>{value}%</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange?.(parseInt(e.target.value))}
        className="flex-1 h-2 appearance-none rounded-full bg-surface-muted cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
        style={{
          background: `linear-gradient(to right, ${color} ${value}%, var(--color-surface-muted) ${value}%)`,
          // @ts-ignore
          '--tw-ring-color': color,
        }}
      />
      <span className="text-sm font-semibold tabular-nums w-10 text-right" style={{ color }}>{value}%</span>
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

export default function CRMPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Client>>({})
  const [editContacts, setEditContacts] = useState<ClientContact[]>([])
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const { toasts, dismiss, success, error } = useToast()

  // New client form
  const [newClient, setNewClient] = useState({
    name: '', type: 'institutional', industry: '', stage: 'Engaged' as ClientStage,
    expected_aum: '', actual_aum: '', win_probability: 50, contact_email: '', notes: '',
    contacts: [] as ClientContact[],
  })
  const [newContactForm, setNewContactForm] = useState<ClientContact>({ name: '', email: '', phone: '', role: '' })
  const [addingClient, setAddingClient] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data.clients || [])
    } catch {
      error('Failed to load clients.')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => { fetchClients() }, [fetchClients])

  const startEdit = (client: Client) => {
    setEditingId(client.id)
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
    setExpandedId(client.id)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, contacts: editContacts }),
      })
      if (!res.ok) throw new Error()
      setEditingId(null)
      fetchClients()
      success('Client updated.')
    } catch {
      error('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const deleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchClients()
      success('Client deleted.')
      if (expandedId === id) setExpandedId(null)
    } catch {
      error('Failed to delete client.')
    }
  }

  const addNewClient = async () => {
    if (!newClient.name.trim()) { error('Client name is required.'); return }
    setAddingClient(true)
    try {
      const body = {
        ...newClient,
        expected_aum: parseFloat(newClient.expected_aum) || 0,
        actual_aum: parseFloat(newClient.actual_aum) || 0,
      }
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setShowAddModal(false)
      setNewClient({
        name: '', type: 'institutional', industry: '', stage: 'Engaged',
        expected_aum: '', actual_aum: '', win_probability: 50, contact_email: '', notes: '',
        contacts: [],
      })
      fetchClients()
      success('Client added.')
    } catch {
      error('Failed to add client.')
    } finally {
      setAddingClient(false)
    }
  }

  const addContactToNew = () => {
    if (!newContactForm.name.trim()) return
    setNewClient((prev) => ({ ...prev, contacts: [...prev.contacts, { ...newContactForm }] }))
    setNewContactForm({ name: '', email: '', phone: '', role: '' })
  }

  const addContactToEdit = () => {
    if (!newContactForm.name.trim()) return
    setEditContacts((prev) => [...prev, { ...newContactForm }])
    setNewContactForm({ name: '', email: '', phone: '', role: '' })
  }

  // Filtering
  const filtered = clients.filter((c) => {
    if (filterStage && c.stage !== filterStage) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return c.name.toLowerCase().includes(q) ||
        (c.industry || '').toLowerCase().includes(q) ||
        (c.contact_email || '').toLowerCase().includes(q)
    }
    return true
  })

  // Pipeline summary
  const pipelineSummary = STAGES.map((s) => {
    const stageClients = clients.filter((c) => c.stage === s.value)
    const totalAUM = stageClients.reduce((sum, c) => sum + (c.expected_aum || 0), 0)
    return { ...s, count: stageClients.length, totalAUM }
  })

  return (
    <>
      <div className="p-8 max-w-6xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              CRM
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {clients.length} client{clients.length !== 1 ? 's' : ''} in pipeline
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Client
          </Button>
        </div>

        {/* Pipeline summary cards */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {pipelineSummary.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStage(filterStage === s.value ? '' : s.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterStage === s.value
                  ? STAGE_COLORS[s.value] + ' border-current'
                  : 'border-surface-border bg-surface-subtle hover:bg-surface-muted/50'
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1">{s.label}</p>
              <p className="text-lg font-semibold text-ink">{s.count}</p>
              <p className="text-[10px] text-ink-faint">{formatAUM(s.totalAUM)} pipeline</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients, industry..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-ink placeholder-ink-faint
                       bg-surface-subtle border border-surface-border
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        {/* Client list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-subtle border border-surface-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients found"
            description={searchQuery || filterStage ? 'Try adjusting your filters.' : 'Add your first client to get started.'}
            action={
              !searchQuery && !filterStage ? (
                <Button size="sm" onClick={() => setShowAddModal(true)}>
                  <Plus size={13} /> Add Client
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((client) => {
              const isExpanded = expandedId === client.id
              const isEditing = editingId === client.id
              const stageColor = STAGE_COLORS[client.stage || 'Engaged']

              return (
                <div key={client.id} className="rounded-xl border border-surface-border bg-surface-subtle overflow-hidden">
                  {/* Client row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface-muted/40 transition-colors"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : client.id)
                      if (isEditing && !isExpanded) { /* keep editing */ }
                      else setEditingId(null)
                    }}
                  >
                    {/* Name & type */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-semibold text-ink">{client.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${stageColor}`}>
                          {client.stage || 'Engaged'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-ink-faint">{CLIENT_TYPE_LABELS[client.type]}</span>
                        {client.industry && (
                          <>
                            <span className="text-ink-faint">·</span>
                            <span className="text-xs text-ink-faint">{client.industry}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Win probability */}
                    <div className="w-32">
                      <WinProbabilityBar value={client.win_probability ?? 50} readonly />
                    </div>

                    {/* AUM */}
                    <div className="text-right w-24">
                      <p className="text-xs text-ink-faint">Expected</p>
                      <p className="text-sm font-medium text-ink">{formatAUM(client.expected_aum || 0)}</p>
                    </div>

                    {/* Docs & interactions */}
                    <div className="text-right w-16">
                      <p className="text-xs text-ink-faint">{client.document_count || 0} docs</p>
                      {client.last_interaction && (
                        <p className="text-[10px] text-ink-faint">{formatDate(client.last_interaction)}</p>
                      )}
                    </div>

                    <div>
                      {isExpanded ? <ChevronUp size={14} className="text-ink-faint" /> : <ChevronDown size={14} className="text-ink-faint" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-surface-border px-5 py-5 bg-surface-muted/20 space-y-5">
                      {isEditing ? (
                        /* Editing mode */
                        <>
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
                            <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
                              Win Probability
                            </label>
                            <WinProbabilityBar value={editForm.win_probability ?? 50}
                              onChange={(v) => setEditForm({ ...editForm, win_probability: v })} />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Input label="Primary email" type="email" placeholder="client@example.com"
                              value={editForm.contact_email || ''}
                              onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} />
                            <div>
                              <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">Notes</label>
                              <textarea value={editForm.notes || ''}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                rows={2} placeholder="Internal notes..."
                                className="w-full px-3 py-2 rounded-lg text-sm text-ink placeholder-ink-faint resize-none
                                           bg-surface-muted border border-surface-border
                                           focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors" />
                            </div>
                          </div>

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

                          <div className="flex items-center justify-between pt-2">
                            <button onClick={() => deleteClient(client.id)}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                              <Trash2 size={11} /> Delete client
                            </button>
                            <div className="flex items-center gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                              <Button size="sm" onClick={saveEdit} loading={saving}>
                                <Save size={12} /> Save
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* View mode */
                        <>
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Industry</p>
                              <p className="text-sm text-ink">{client.industry || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Expected AUM</p>
                              <p className="text-sm text-ink">{formatAUM(client.expected_aum || 0)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Actual AUM</p>
                              <p className="text-sm text-ink">{formatAUM(client.actual_aum || 0)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Primary Email</p>
                              <p className="text-sm text-ink">{client.contact_email || '—'}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-2">Win Probability</p>
                            <WinProbabilityBar value={client.win_probability ?? 50} readonly />
                          </div>

                          {/* Contacts */}
                          {(client.contacts?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
                                Contacts ({client.contacts!.length})
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {client.contacts!.map((c, i) => (
                                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-muted border border-surface-border">
                                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                                      <User size={14} className="text-accent" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-ink">{c.name}</p>
                                      {c.role && <p className="text-[10px] text-ink-faint">{c.role}</p>}
                                      {c.email && (
                                        <a href={`mailto:${c.email}`} className="text-[10px] text-accent hover:underline flex items-center gap-0.5">
                                          <Mail size={8} /> {c.email}
                                        </a>
                                      )}
                                      {c.phone && (
                                        <p className="text-[10px] text-ink-faint flex items-center gap-0.5">
                                          <Phone size={8} /> {c.phone}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {client.notes && (
                            <div>
                              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider mb-1">Notes</p>
                              <p className="text-xs text-ink-muted">{client.notes}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); startEdit(client) }}>
                              <Edit3 size={11} /> Edit
                            </Button>
                            <Link href={`/client-log?client=${client.id}`}>
                              <Button size="sm" variant="ghost">
                                <FileText size={11} /> View Logs
                              </Button>
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client" description="Create a new client record" size="lg">
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company name *" placeholder="Acme Corp" value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            <Select label="Client type" options={CLIENT_TYPES} value={newClient.type}
              onChange={(e) => setNewClient({ ...newClient, type: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Industry" placeholder="e.g. Technology, Healthcare..."
              value={newClient.industry}
              onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })} />
            <Select label="Pipeline stage"
              options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
              value={newClient.stage}
              onChange={(e) => setNewClient({ ...newClient, stage: e.target.value as ClientStage })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Expected AUM ($)" type="number" placeholder="0"
              value={newClient.expected_aum}
              onChange={(e) => setNewClient({ ...newClient, expected_aum: e.target.value })} />
            <Input label="Actual AUM ($)" type="number" placeholder="0"
              value={newClient.actual_aum}
              onChange={(e) => setNewClient({ ...newClient, actual_aum: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">Win Probability</label>
            <WinProbabilityBar value={newClient.win_probability}
              onChange={(v) => setNewClient({ ...newClient, win_probability: v })} />
          </div>

          <Input label="Primary email" type="email" placeholder="client@example.com"
            value={newClient.contact_email}
            onChange={(e) => setNewClient({ ...newClient, contact_email: e.target.value })} />

          {/* Contacts */}
          <div>
            <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
              Contacts ({newClient.contacts.length})
            </label>
            {newClient.contacts.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {newClient.contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface-muted border border-surface-border text-xs">
                    <User size={11} className="text-ink-faint" />
                    <span className="font-medium text-ink">{c.name}</span>
                    {c.role && <span className="text-ink-faint">({c.role})</span>}
                    {c.email && <span className="text-accent">{c.email}</span>}
                    {c.phone && <span className="text-ink-faint">{c.phone}</span>}
                    <button onClick={() => setNewClient((prev) => ({ ...prev, contacts: prev.contacts.filter((_, j) => j !== i) }))}
                      className="ml-auto p-0.5 text-ink-faint hover:text-red-400">
                      <X size={11} />
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
              <Button type="button" size="sm" variant="secondary" onClick={addContactToNew}>
                <Plus size={12} />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={newClient.notes}
              onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
              rows={2} placeholder="Internal notes..."
              className="w-full px-3 py-2 rounded-lg text-sm text-ink placeholder-ink-faint resize-none
                         bg-surface-muted border border-surface-border
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={addNewClient} loading={addingClient}>
              <Plus size={14} /> Add Client
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
