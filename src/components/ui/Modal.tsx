'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, description, size = 'md', children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full rounded-xl border border-surface-border bg-surface-subtle shadow-2xl animate-slide-up',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-surface-border">
            <div>
              {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
              {description && <p className="text-sm text-ink-muted mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={cn(!title && !description && 'pt-2')}>
          {!title && !description && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors z-10"
            >
              <X size={16} />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
