import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { UserX, LogOut, RefreshCw, UserPlus } from 'lucide-react'
import { toast } from '@/components/Toast'

export default function PerfilNaoEncontrado() {
  const { logout, currentUser, reloadProfile, loading, createBasicProfile } = useAuth()
  const navigate = useNavigate()
  const [creatingProfile, setCreatingProfile] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logout realizado com sucesso!')
      navigate('/login', { replace: true })
    } catch (error: any) {
      toast.error('Erro ao fazer logout')
      console.error('Erro ao fazer logout:', error)
    }
  }

  const handleReloadProfile = async () => {
    try {
      toast.info('Recarregando perfil...')
      await reloadProfile()
      toast.success('Perfil recarregado!')
      // Aguardar um pouco para o perfil ser carregado
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1000)
    } catch (error: any) {
      toast.error('Erro ao recarregar perfil')
      console.error('Erro ao recarregar perfil:', error)
    }
  }

  const handleCreateBasicProfile = async () => {
    if (!currentUser) {
      toast.error('Usuário não autenticado')
      return
    }

    setCreatingProfile(true)
    try {
      const email = currentUser.email?.toLowerCase() || ''
      let perfilSugerido: string | undefined = undefined

      // Tentar inferir o perfil do email
      if (email.includes('medico') || email.includes('medic') || email.includes('doctor')) {
        perfilSugerido = 'medico'
      } else if (email.includes('recepcionista') || email.includes('reception')) {
        perfilSugerido = 'recepcionista'
      } else if (email.includes('clinica') || email.includes('clinic')) {
        perfilSugerido = 'clinica'
      }

      toast.info('Criando perfil básico...')
      await createBasicProfile(perfilSugerido)
      toast.success('Perfil criado com sucesso!')
      
      // Aguardar um pouco para o perfil ser carregado
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1000)
    } catch (error: any) {
      console.error('Erro ao criar perfil:', error)
      toast.error(error.message || 'Erro ao criar perfil básico')
    } finally {
      setCreatingProfile(false)
    }
  }

  // Determinar perfil sugerido baseado no email
  const getSuggestedProfile = () => {
    const email = currentUser?.email?.toLowerCase() || ''
    if (email.includes('medico') || email.includes('medic') || email.includes('doctor')) {
      return 'médico'
    } else if (email.includes('recepcionista') || email.includes('reception')) {
      return 'recepcionista'
    } else if (email.includes('clinica') || email.includes('clinic')) {
      return 'clínica'
    }
    return 'profissional'
  }

  return (
    <div className="perfil-nao-encontrado-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="perfil-nao-encontrado-card"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="icon-wrapper"
        >
          <UserX size={64} />
        </motion.div>

        <h1>Perfil Não Encontrado</h1>
        
        <div className="message-content">
          <p className="main-message">
            Não foi possível encontrar o perfil do usuário no sistema.
          </p>
          <p className="sub-message">
            O seu usuário está autenticado, mas não encontramos um perfil associado na base de dados.
          </p>
          <p className="info-message">
            <strong>Usuário:</strong> {currentUser?.email || 'Não identificado'}<br/>
            <strong>UID:</strong> {currentUser?.uid || 'Não identificado'}
          </p>
          <p className="help-message">
            Isso pode acontecer se o seu perfil ainda não foi criado ou se houve um problema ao carregar os dados.
            Você pode criar um perfil básico automaticamente ou tentar recarregar o perfil.
          </p>
          {currentUser?.email && (
            <p className="suggestion-message">
              <strong>Sugestão:</strong> Baseado no seu email, será criado um perfil como <strong>{getSuggestedProfile()}</strong>
            </p>
          )}
        </div>

        <div className="actions">
          <motion.button
            onClick={handleCreateBasicProfile}
            disabled={creatingProfile || loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="create-profile-button"
          >
            <UserPlus size={20} />
            {creatingProfile ? 'Criando Perfil...' : 'Criar Perfil Automaticamente'}
          </motion.button>
          
          <motion.button
            onClick={handleReloadProfile}
            disabled={loading || creatingProfile}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="reload-button"
          >
            <RefreshCw size={20} />
            {loading ? 'Recarregando...' : 'Tentar Novamente'}
          </motion.button>
          
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="logout-button"
          >
            <LogOut size={20} />
            Sair e Fazer Login Novamente
          </motion.button>
        </div>
      </motion.div>

      <style>{`
        .perfil-nao-encontrado-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%);
          padding: 2rem;
        }

        .perfil-nao-encontrado-card {
          max-width: 600px;
          width: 100%;
          background: var(--color-surface);
          border: 2px solid var(--color-warning);
          border-radius: 1rem;
          padding: 3rem;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .icon-wrapper {
          margin: 0 auto 2rem;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-warning);
        }

        h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 1.5rem 0;
        }

        .message-content {
          margin-bottom: 2.5rem;
          text-align: left;
        }

        .main-message {
          font-size: 1.125rem;
          color: var(--color-text);
          margin: 0 0 1rem 0;
          line-height: 1.6;
        }

        .sub-message {
          font-size: 1rem;
          color: var(--color-text-muted);
          margin: 0 0 1rem 0;
          line-height: 1.6;
        }

        .info-message {
          font-size: 0.95rem;
          color: var(--color-text-muted);
          margin: 0 0 1rem 0;
          line-height: 1.8;
          background: var(--color-surface-elevated);
          padding: 1rem;
          border-radius: var(--radius-md);
          font-family: 'Courier New', monospace;
          word-break: break-all;
        }

        .info-message strong {
          color: var(--color-warning);
        }

        .help-message {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          margin: 1rem 0 0 0;
          line-height: 1.6;
          font-style: italic;
        }

        .suggestion-message {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          margin: 0.5rem 0 0 0;
          line-height: 1.6;
          padding: 0.75rem;
          background: rgba(139, 92, 246, 0.1);
          border-radius: var(--radius-md);
          border-left: 3px solid var(--color-primary-medico);
        }

        .suggestion-message strong {
          color: var(--color-primary-medico);
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .create-profile-button,
        .reload-button,
        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .create-profile-button {
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          color: white;
        }

        .create-profile-button:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .create-profile-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reload-button {
          background: var(--color-warning);
          color: white;
        }

        .reload-button:hover:not(:disabled) {
          background: #d97706;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .reload-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logout-button {
          background: var(--color-error);
          color: white;
        }

        .logout-button:hover {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .reload-button:active:not(:disabled),
        .logout-button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}

