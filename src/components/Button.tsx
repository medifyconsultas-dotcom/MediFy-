import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark))',
          color: 'white',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
        }
      case 'secondary':
        return {
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }
      case 'danger':
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--color-error)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--color-success)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }
      default:
        return {}
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
        }
      case 'md':
        return {
          padding: '0.875rem 1.5rem',
          fontSize: '0.95rem',
        }
      case 'lg':
        return {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
        }
      default:
        return {}
    }
  }

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02, boxShadow: '0 6px 16px rgba(139, 92, 246, 0.4)' } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      disabled={disabled || loading}
      className={`button button-${variant} button-${size} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontWeight: 600,
        border: 'none',
        borderRadius: '0.5rem',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
        ...getVariantStyles(),
        ...getSizeStyles(),
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
      }}
      {...props}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={20} />
        </motion.div>
      ) : (
        icon
      )}
      {children}
      {variant === 'primary' && !disabled && !loading && (
        <motion.div
          className="button-shine"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 2,
            ease: 'linear',
          }}
        />
      )}
      <style>{`
        .button {
          position: relative;
          overflow: hidden;
        }

        .button-shine {
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          pointer-events: none;
        }

        .button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </motion.button>
  )
}

