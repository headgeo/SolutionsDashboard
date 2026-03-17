import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 text-center', className)}>
      <div className="w-14 h-14 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-center mb-4">
        <Icon size={22} className="text-ink-faint" />
      </div>
      <h3 className="text-sm font-medium text-ink mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-muted max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}
