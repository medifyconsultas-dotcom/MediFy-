import { motion } from 'framer-motion'
import { ReactNode, InputHTMLAttributes } from 'react'
import { LucideIcon } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: LucideIcon
  error?: string
  helperText?: string
}

export default function Input({
  label,
  icon: Icon,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label className="input-label">
          {Icon && <Icon size={16} />}
          {label}
        </label>
      )}
      <div className="input-container">
        {Icon && (
          <div className="input-icon-wrapper">
            <Icon size={20} className="input-icon" />
          </div>
        )}
        <motion.input
          className={`input ${error ? 'input-error' : ''}`}
          whileFocus={{ 
            scale: 1.01,
            boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(139, 92, 246, 0.1)'
          }}
          {...props}
        />
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="input-error-message"
          >
            {error}
          </motion.div>
        )}
        {helperText && !error && (
          <p className="input-helper">{helperText}</p>
        )}
      </div>

      <style>{`
        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }

        .input-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .input-container {
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .input-icon-wrapper {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
          pointer-events: none;
          z-index: 1;
        }

        .input {
          width: 100%;
          padding: 0.875rem ${Icon ? '3rem' : '1rem'} 0.875rem ${Icon ? '3rem' : '1rem'};
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .input:focus {
          outline: none;
          border-color: ${error ? 'var(--color-error)' : 'var(--color-primary-medico)'};
        }

        .input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-error {
          border-color: var(--color-error);
        }

        .input-error-message {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--color-error);
        }

        .input-helper {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  )
}

