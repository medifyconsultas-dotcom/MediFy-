import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, LogOut } from 'lucide-react'
import { toast } from '@/components/Toast'

export default function PerfilNaoSuportado() {
  const { logout, userProfile } = useAuth()
  const navigate = useNavigate()

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

  return (
    <div className="perfil-nao-suportado-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="perfil-nao-suportado-card"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="icon-wrapper"
        >
          <AlertTriangle size={64} />
        </motion.div>

        <h1>Perfil Não Suportado</h1>
        
        <div className="message-content">
          <p className="main-message">
            O perfil <strong>"{userProfile?.perfil || 'paciente'}"</strong> não é suportado no sistema desktop.
          </p>
          <p className="sub-message">
            Este sistema é destinado apenas para clínicas, médicos, enfermeiros, recepcionistas e profissionais de saúde.
          </p>
          <p className="info-message">
            Se você é um paciente, por favor, utilize o sistema web ou aplicativo móvel.
          </p>
        </div>

        <div className="actions">
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="logout-button"
          >
            <LogOut size={20} />
            Sair e Fazer Login com Outro Perfil
          </motion.button>
        </div>
      </motion.div>

      <style>{`
        .perfil-nao-suportado-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%);
          padding: 2rem;
        }

        .perfil-nao-suportado-card {
          max-width: 600px;
          width: 100%;
          background: var(--color-surface);
          border: 2px solid var(--color-error);
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
          background: rgba(239, 68, 68, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-error);
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

        .main-message strong {
          color: var(--color-error);
          text-transform: capitalize;
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
          margin: 0;
          line-height: 1.6;
          font-style: italic;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: var(--color-error);
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .logout-button:hover {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .logout-button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}

