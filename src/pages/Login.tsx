import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Lock, AlertCircle, Bug, X, RefreshCw, LogOut, Eye } from 'lucide-react'
import { handleError } from '@/utils/errorHandler'
import { toast } from '@/components/Toast'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase/config'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const { login, currentUser, userProfile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Redireciona automaticamente se já estiver logado
  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      toast.success('Login realizado com sucesso!')
      navigate('/dashboard')
    } catch (err: unknown) {
      handleError(err)
      if (err instanceof Error) {
        setError(err.message || 'Erro ao fazer login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForceLogout = async () => {
    try {
      await signOut(auth)
      toast.success('Logout forçado realizado!')
      setError('')
    } catch (err: unknown) {
      handleError(err)
      toast.error('Erro ao fazer logout')
    }
  }

  const handleReloadProfile = async () => {
    if (!currentUser) {
      toast.error('Nenhum usuário logado')
      return
    }
    toast.info('Recarregando perfil...')
    window.location.reload()
  }

  const debugInfo = {
    currentUser: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
    } : null,
    userProfile: userProfile ? {
      id: userProfile.id,
      nome: userProfile.nome,
      perfil: userProfile.perfil,
      email: (userProfile as any).email,
    } : null,
    authLoading,
    timestamp: new Date().toLocaleString('pt-BR'),
  }

  // Mostra loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="login-container">
        <div className="loading-state">Carregando...</div>
      </div>
    )
  }

  // Se já está logado, não mostra nada (será redirecionado)
  if (currentUser) {
    return null
  }

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-card"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="login-header"
        >
          <h1>Medify</h1>
          <p>Sistema de Gestão de Clínicas</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="error-message"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="input-group">
            <Mail size={20} className="input-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="login-button"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </motion.button>
        </form>

        {/* Botão de Debug - apenas em desenvolvimento */}
        {process.env.NODE_ENV === 'development' && (
          <motion.button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="debug-toggle-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bug size={16} />
            {showDebug ? 'Ocultar Debug' : 'Mostrar Debug'}
          </motion.button>
        )}
      </motion.div>

      {/* Painel de Debug */}
      <AnimatePresence>
        {showDebug && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="debug-panel"
          >
            <div className="debug-header">
              <h3>
                <Bug size={20} />
                Painel de Debug
              </h3>
              <button onClick={() => setShowDebug(false)} className="debug-close-button">
                <X size={18} />
              </button>
            </div>

            <div className="debug-content">
              <div className="debug-section">
                <h4>Estado de Autenticação</h4>
                <div className="debug-info">
                  <p><strong>Loading:</strong> {authLoading ? 'Sim' : 'Não'}</p>
                  <p><strong>Usuário Logado:</strong> {currentUser ? 'Sim' : 'Não'}</p>
                  <p><strong>Perfil Carregado:</strong> {userProfile ? 'Sim' : 'Não'}</p>
                  <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
                </div>
              </div>

              {currentUser && (
                <div className="debug-section">
                  <h4>Informações do Usuário</h4>
                  <div className="debug-info">
                    <p><strong>UID:</strong> {debugInfo.currentUser?.uid || 'N/A'}</p>
                    <p><strong>Email:</strong> {debugInfo.currentUser?.email || 'N/A'}</p>
                    <p><strong>Email Verificado:</strong> {debugInfo.currentUser?.emailVerified ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              )}

              {userProfile && (
                <div className="debug-section">
                  <h4>Informações do Perfil</h4>
                  <div className="debug-info">
                    <p><strong>ID:</strong> {debugInfo.userProfile?.id || 'N/A'}</p>
                    <p><strong>Nome:</strong> {debugInfo.userProfile?.nome || 'N/A'}</p>
                    <p><strong>Perfil:</strong> {debugInfo.userProfile?.perfil || 'N/A'}</p>
                    <p><strong>Email:</strong> {debugInfo.userProfile?.email || 'N/A'}</p>
                  </div>
                </div>
              )}

              <div className="debug-actions">
                {currentUser && (
                  <>
                    <motion.button
                      type="button"
                      onClick={handleReloadProfile}
                      className="debug-action-button reload"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RefreshCw size={16} />
                      Recarregar Perfil
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleForceLogout}
                      className="debug-action-button logout"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <LogOut size={16} />
                      Forçar Logout
                    </motion.button>
                  </>
                )}
                <motion.button
                  type="button"
                  onClick={() => {
                    console.log('=== DEBUG INFO ===')
                    console.log('currentUser:', currentUser)
                    console.log('userProfile:', userProfile)
                    console.log('authLoading:', authLoading)
                    console.log('debugInfo:', debugInfo)
                    toast.info('Informações de debug enviadas para o console!')
                  }}
                  className="debug-action-button console"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Eye size={16} />
                  Log no Console
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .login-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          position: relative;
          overflow: hidden;
        }

        .login-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.1) 0%,
            transparent 70%
          );
          animation: rotate 30s linear infinite;
        }

        .login-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(167, 139, 250, 0.08) 0%, transparent 50%);
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-state {
          color: #f1f5f9;
          font-size: 1rem;
          font-weight: 500;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem;
          background: rgba(30, 41, 59, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 20px rgba(139, 92, 246, 0.3);
          position: relative;
          z-index: 1;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .login-card:hover {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-header h1 {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #8b5cf6, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
        }

        .login-header p {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 0.5rem;
          color: #ef4444;
          font-size: 0.875rem;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          pointer-events: none;
        }

        .input-group input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          color: #f1f5f9;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .input-group input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2), 0 0 20px rgba(139, 92, 246, 0.3);
          background: rgba(15, 23, 42, 0.8);
          transform: translateY(-1px);
        }

        .input-group input:hover:not(:focus) {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(15, 23, 42, 0.7);
        }

        .input-group input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-button {
          padding: 0.875rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border: none;
          border-radius: 0.75rem;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .login-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .login-button:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }

        .login-button:hover:not(:disabled)::before {
          width: 300px;
          height: 300px;
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .debug-toggle-button {
          margin-top: 1rem;
          width: 100%;
          padding: 0.625rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          color: #8b5cf6;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .debug-toggle-button:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .debug-panel {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          width: 400px;
          max-height: 80vh;
          background: #1e293b;
          border: 2px solid #8b5cf6;
          border-radius: 0.75rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(139, 92, 246, 0.1);
          border-bottom: 1px solid #334155;
        }

        .debug-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #8b5cf6;
          margin: 0;
        }

        .debug-close-button {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .debug-close-button:hover {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }

        .debug-content {
          padding: 1rem;
          overflow-y: auto;
          max-height: calc(80vh - 60px);
        }

        .debug-section {
          margin-bottom: 1.5rem;
        }

        .debug-section:last-child {
          margin-bottom: 0;
        }

        .debug-section h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #334155;
        }

        .debug-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .debug-info p {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
          word-break: break-all;
        }

        .debug-info strong {
          color: #f1f5f9;
          font-weight: 600;
        }

        .debug-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #334155;
        }

        .debug-action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .debug-action-button.reload {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .debug-action-button.reload:hover {
          background: rgba(59, 130, 246, 0.2);
        }

        .debug-action-button.logout {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .debug-action-button.logout:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .debug-action-button.console {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .debug-action-button.console:hover {
          background: rgba(245, 158, 11, 0.2);
        }
      `}</style>
    </div>
  )
}

