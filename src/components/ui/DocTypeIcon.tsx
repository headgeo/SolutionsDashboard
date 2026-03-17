import { DocumentType } from '@/types'
import { cn } from '@/lib/utils'

interface DocTypeIconProps {
  type: DocumentType
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const DOC_CONFIG: Record<DocumentType, { label: string; bg: string; text: string; abbr: string }> = {
  pptx: { label: 'PowerPoint', bg: 'bg-orange-400/10', text: 'text-orange-400', abbr: 'PPT' },
  xlsx: { label: 'Excel', bg: 'bg-emerald-400/10', text: 'text-emerald-400', abbr: 'XLS' },
  docx: { label: 'Word', bg: 'bg-blue-400/10', text: 'text-blue-400', abbr: 'DOC' },
  pdf: { label: 'PDF', bg: 'bg-red-400/10', text: 'text-red-400', abbr: 'PDF' },
}

export function DocTypeIcon({ type, showLabel = false, size = 'md', className }: DocTypeIconProps) {
  const config = DOC_CONFIG[type]
  const sizeClasses = {
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-10 h-10 text-xs',
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded flex items-center justify-center font-bold font-mono shrink-0',
          sizeClasses[size],
          config.bg,
          config.text
        )}
      >
        {config.abbr}
      </div>
      {showLabel && (
        <span className={cn('text-sm', config.text)}>{config.label}</span>
      )}
    </div>
  )
}
