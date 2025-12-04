import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import Button from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="error-content"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="error-icon"
            >
              <AlertCircle size={64} />
            </motion.div>
            <h1>Ops! Algo deu errado</h1>
            <p className="error-message">
              {this.state.error?.message || 'Ocorreu um erro inesperado'}
            </p>
            <p className="error-description">
              Por favor, tente recarregar a página ou entre em contato com o suporte se o problema persistir.
            </p>
            <Button
              variant="primary"
              icon={<RefreshCw size={18} />}
              onClick={this.handleReset}
            >
              Recarregar Página
            </Button>
          </motion.div>

          <style>{`
            .error-boundary {
              width: 100vw;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--color-background);
              padding: 2rem;
            }

            .error-content {
              max-width: 500px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1.5rem;
            }

            .error-icon {
              color: var(--color-error);
              margin-bottom: 1rem;
            }

            .error-content h1 {
              font-size: 2rem;
              font-weight: 700;
              color: var(--color-text);
              margin: 0;
            }

            .error-message {
              font-size: 1rem;
              color: var(--color-text-muted);
              margin: 0;
              padding: 1rem;
              background: var(--color-surface);
              border-radius: 0.5rem;
              border: 1px solid var(--color-border);
            }

            .error-description {
              font-size: 0.875rem;
              color: var(--color-text-muted);
              margin: 0;
              line-height: 1.6;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

