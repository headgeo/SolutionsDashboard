'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, X, AlertCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const icons = {
    success: <CheckCircle size={15} className="text-status-approved" />,
    error: <XCircle size={15} className="text-red-400" />,
    info: <AlertCircle size={15} className="text-accent" />,
  }

  const borders = {
    success: 'border-status-approved/20',
    error: 'border-red-400/20',
    info: 'border-accent/20',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border bg-surface-subtle shadow-xl text-sm text-ink animate-slide-in-right',
        borders[toast.type]
      )}
    >
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-ink-faint hover:text-ink transition-colors ml-2 mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((m: string) => addToast('success', m), [addToast])
  const error = useCallback((m: string) => addToast('error', m), [addToast])
  const info = useCallback((m: string) => addToast('info', m), [addToast])

  return { toasts, dismiss, success, error, info }
}
