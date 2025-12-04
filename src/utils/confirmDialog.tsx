import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'warning'
}: ConfirmDialogProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="confirm-dialog"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="confirm-overlay"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="confirm-dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="confirm-header">
            <AlertTriangle 
              size={24} 
              className={variant === 'danger' ? 'text-danger' : variant === 'warning' ? 'text-warning' : 'text-info'} 
            />
            <h3>{title}</h3>
          </div>
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button onClick={onCancel} className="confirm-cancel">
              {cancelText}
            </button>
            <button 
              onClick={onConfirm} 
              className={`confirm-button ${variant}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
      <style>{`
        .confirm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
        }

        .confirm-dialog {
          background: var(--color-surface);
          border-radius: 0.75rem;
          padding: 1.5rem;
          max-width: 400px;
          width: 90%;
          border: 1px solid var(--color-border);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .confirm-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .confirm-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .confirm-message {
          color: var(--color-text-muted);
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .confirm-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .confirm-cancel {
          padding: 0.625rem 1.25rem;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .confirm-cancel:hover {
          background: var(--color-surface);
        }

        .confirm-button {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .confirm-button.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .confirm-button.danger:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .confirm-button.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .confirm-button.warning:hover {
          background: rgba(245, 158, 11, 0.2);
        }

        .confirm-button.info {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .confirm-button.info:hover {
          background: rgba(59, 130, 246, 0.2);
        }

        .text-danger {
          color: var(--color-error);
        }

        .text-warning {
          color: #f59e0b;
        }

        .text-info {
          color: #3b82f6;
        }
      `}</style>
    </AnimatePresence>
  )
}

// Hook para usar o dialog de confirmação
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'danger' | 'warning' | 'info'
  } | null>(null)

  const confirm = (
    title: string,
    message: string,
    options?: {
      confirmText?: string
      cancelText?: string
      variant?: 'danger' | 'warning' | 'info'
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        variant: options?.variant,
        onConfirm: () => {
          setDialog(null)
          resolve(true)
        },
        onCancel: () => {
          setDialog(null)
          resolve(false)
        }
      })
    })
  }

  const DialogComponent = dialog ? (
    <ConfirmDialog
      title={dialog.title}
      message={dialog.message}
      confirmText={dialog.confirmText}
      cancelText={dialog.cancelText}
      variant={dialog.variant}
      onConfirm={dialog.onConfirm}
      onCancel={dialog.onCancel}
    />
  ) : null

  return { confirm, DialogComponent }
}

