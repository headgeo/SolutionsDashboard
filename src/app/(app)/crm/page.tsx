'use client'

import { useState, useEffect, useCallback } from 'react'
import { Client, ClientContact, ClientStage, CLIENT_TYPE_LABELS } from '@/types'
import { CLIENT_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import {
  Users, Plus, Search, Trash2,
  User, X, ChevronRight, DollarSign,
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

const STAGE_BAR_COLORS: Record<string, string> = {
  'Lost Interest': 'bg-red-400',
  'Engaged': 'bg-blue-400',
  'Expression of Interest': 'bg-yellow-400',
  'Unconfirmed Win': 'bg-orange-400',
  'Won Funded': 'bg-emerald-400',
}

function WinProbabilityBar({ value }: { value: number }) {
  const r = value < 50 ? 255 : Math.round(255 - (value - 50) * 5.1)
  const g = value > 50 ? 200 : Math.round(value * 4)
  const color = `rgb(${r}, ${g}, 60)`

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium tabular-nums" style={{ color }}>{value}%</span>
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
  const [sortBy, setSortBy] = useState<'win_prob' | 'name'>('win_prob')
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

  // Filtering and sorting
  const filtered = clients
    .filter((c) => {
      if (filterStage && c.stage !== filterStage) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return c.name.toLowerCase().includes(q) ||
          (c.industry || '').toLowerCase().includes(q) ||
          (c.contact_email || '').toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'win_prob') return (b.win_probability ?? 50) - (a.win_probability ?? 50)
      return a.name.localeCompare(b.name)
    })

  // Pipeline summary
  const pipelineSummary = STAGES.map((s) => {
    const stageClients = clients.filter((c) => c.stage === s.value)
    const totalAUM = stageClients.reduce((sum, c) => sum + (c.expected_aum || 0), 0)
    return { ...s, count: stageClients.length, totalAUM }
  })

  const totalPipelineAUM = clients.reduce((sum, c) => sum + (c.expected_aum || 0), 0)

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
              {clients.length} client{clients.length !== 1 ? 's' : ''} · {formatAUM(totalPipelineAUM)} total pipeline
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Client
          </Button>
        </div>

        {/* Pipeline summary bar + cards */}
        {clients.length > 0 && (
          <div className="mb-6">
            {/* Visual pipeline bar */}
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-surface-muted mb-3">
              {pipelineSummary.filter((s) => s.count > 0).map((s) => (
                <div
                  key={s.value}
                  className={`${STAGE_BAR_COLORS[s.value] || 'bg-ink-faint'} transition-all cursor-pointer hover:opacity-80`}
                  style={{ width: `${(s.count / Math.max(clients.length, 1)) * 100}%` }}
                  title={`${s.label}: ${s.count} clients · ${formatAUM(s.totalAUM)}`}
                  onClick={() => setFilterStage(filterStage === s.value ? '' : s.value)}
                />
              ))}
            </div>

            {/* Stage filter cards */}
            <div className="grid grid-cols-5 gap-3">
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
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
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
          <div className="flex items-center rounded-xl border border-surface-border bg-surface-subtle overflow-hidden shrink-0">
            <button
              onClick={() => setSortBy('win_prob')}
              className={`px-3 py-2.5 text-xs font-medium transition-colors ${
                sortBy === 'win_prob' ? 'bg-accent/10 text-accent' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Win Prob %
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-2.5 text-xs font-medium transition-colors ${
                sortBy === 'name' ? 'bg-accent/10 text-accent' : 'text-ink-muted hover:text-ink'
              }`}
            >
              A–Z
            </button>
          </div>
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
              const stageColor = STAGE_COLORS[client.stage || 'Engaged']
              return (
                <Link
                  key={client.id}
                  href={`/crm/${client.id}`}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl border border-surface-border bg-surface-subtle
                             hover:bg-surface-muted/40 hover:border-accent/20 transition-all group cursor-pointer"
                >
                  {/* Name & type */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">{client.name}</p>
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
                  <div className="w-32 hidden md:block">
                    <WinProbabilityBar value={client.win_probability ?? 50} />
                  </div>

                  {/* AUM */}
                  <div className="text-right w-24 hidden sm:block">
                    <p className="text-xs text-ink-faint">Expected</p>
                    <p className="text-sm font-medium text-ink">{formatAUM(client.expected_aum || 0)}</p>
                  </div>

                  {/* Docs & interactions */}
                  <div className="text-right w-16 hidden lg:block">
                    <p className="text-xs text-ink-faint">{client.document_count || 0} docs</p>
                    {client.last_interaction && (
                      <p className="text-[10px] text-ink-faint">{formatDate(client.last_interaction)}</p>
                    )}
                  </div>

                  <ChevronRight size={14} className="text-ink-faint group-hover:text-accent transition-colors shrink-0" />
                </Link>
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
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={newClient.win_probability}
                onChange={(e) => setNewClient({ ...newClient, win_probability: parseInt(e.target.value) })}
                className="flex-1 h-2 appearance-none rounded-full bg-surface-muted cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:bg-accent" />
              <span className="text-sm font-semibold tabular-nums w-10 text-right text-ink">{newClient.win_probability}%</span>
            </div>
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
