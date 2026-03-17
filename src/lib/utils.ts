import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DocumentType, DocumentStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function getDocTypeColor(type: DocumentType): string {
  const colors: Record<DocumentType, string> = {
    pptx: 'text-orange-400 bg-orange-400/10',
    xlsx: 'text-emerald-400 bg-emerald-400/10',
    docx: 'text-blue-400 bg-blue-400/10',
    pdf: 'text-red-400 bg-red-400/10',
  }
  return colors[type]
}

export function getStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    approved: 'text-status-approved bg-status-approved/10 border-status-approved/20',
    draft: 'text-status-draft bg-status-draft/10 border-status-draft/20',
    archived: 'text-status-archived bg-status-archived/10 border-status-archived/20',
  }
  return colors[status]
}

export function getDocTypeIcon(type: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    pptx: '◈',
    xlsx: '⊞',
    docx: '≡',
    pdf: '⊡',
  }
  return icons[type]
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function similarityToPercent(similarity: number): number {
  return Math.round(similarity * 100)
}
