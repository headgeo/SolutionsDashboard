import { DocumentStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: DocumentStatus
  size?: 'sm' | 'md'
  className?: string
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'badge-approved' },
  draft: { label: 'Draft', className: 'badge-draft' },
  archived: { label: 'Archived', className: 'badge-archived' },
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  )
}
