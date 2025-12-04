import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

let toastId = 0
const toasts: Toast[] = []
const listeners: Array<(toasts: Toast[]) => void> = []

export const toastStore = {
  subscribe: (callback: (toasts: Toast[]) => void) => {
    listeners.push(callback)
    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }
  },
  notify: (message: string, type: ToastType = 'info', duration = 3000) => {
    const toast: Toast = {
      id: `toast-${toastId++}`,
      message,
      type,
      duration,
    }
    toasts.push(toast)
    listeners.forEach(listener => listener([...toasts]))
    
    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === toast.id)
        if (index > -1) {
          toasts.splice(index, 1)
          listeners.forEach(listener => listener([...toasts]))
        }
      }, duration)
    }
  },
  remove: (id: string) => {
    const index = toasts.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.splice(index, 1)
      listeners.forEach(listener => listener([...toasts]))
    }
  },
}

export const toast = {
  success: (message: string, duration?: number) => toastStore.notify(message, 'success', duration),
  error: (message: string, duration?: number) => toastStore.notify(message, 'error', duration),
  warning: (message: string, duration?: number) => toastStore.notify(message, 'warning', duration),
  info: (message: string, duration?: number) => toastStore.notify(message, 'info', duration),
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubscribe = toastStore.subscribe(setToasts)
    return unsubscribe
  }, [])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />
      case 'error':
        return <XCircle size={20} />
      case 'warning':
        return <AlertCircle size={20} />
      case 'info':
        return <Info size={20} />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          color: '#10b981',
        }
      case 'error':
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
        }
      case 'warning':
        return {
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          color: '#fbbf24',
        }
      case 'info':
        return {
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          color: '#3b82f6',
        }
    }
  }

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 300,
              delay: index * 0.05 
            }}
            className="toast"
            style={getStyles(toast.type)}
          >
            <div className="toast-icon">
              {getIcon(toast.type)}
            </div>
            <p className="toast-message">{toast.message}</p>
            <button
              onClick={() => toastStore.remove(toast.id)}
              className="toast-close"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        .toast-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          pointer-events: none;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 0.5rem;
          min-width: 300px;
          max-width: 400px;
          box-shadow: var(--shadow-lg);
          pointer-events: auto;
          backdrop-filter: blur(8px);
        }

        .toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-message {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
          line-height: 1.5;
        }

        .toast-close {
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          opacity: 0.7;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-close:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
