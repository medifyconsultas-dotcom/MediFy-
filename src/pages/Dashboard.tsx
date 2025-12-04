import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import DashboardClinica from './clinica/DashboardClinica'
import DashboardProfissional from './profissional/DashboardProfissional'
import DashboardRecepcionista from './recepcionista/DashboardRecepcionista'
import DashboardMedicoEnfermeiro from './medico/DashboardMedicoEnfermeiro'
import DashboardSkeleton from '@/components/DashboardSkeleton'

const PERFIS_SUPORTADOS = ['clinica', 'profissional', 'recepcionista', 'medico']

export default function Dashboard() {
  const { userProfile, loading } = useAuth()
  const navigate = useNavigate()
  const [showSkeleton, setShowSkeleton] = useState(true)

  useEffect(() => {
    if (userProfile) {
      console.log(`📊 Dashboard - Perfil atual: ${userProfile.perfil}`, userProfile)
      
      // Verificar se estamos criando um funcionário e o perfil mudou para funcionário
      const creatingFuncionario = sessionStorage.getItem('creatingFuncionario')
      if (creatingFuncionario === 'true' && (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista')) {
        console.log('🔍 Detectado criação de funcionário - fazendo logout para manter sessão da clínica')
        sessionStorage.removeItem('creatingFuncionario')
        // Fazer logout para evitar redirecionamento para o dashboard do funcionário
        // O usuário precisará fazer login novamente com a conta da clínica
        import('firebase/auth').then(({ signOut, auth }) => {
          signOut(auth)
        })
        return
      }
      
      // Se o perfil não é suportado, redireciona para a página de perfil não suportado
      if (!PERFIS_SUPORTADOS.includes(userProfile.perfil)) {
        console.log(`❌ Perfil não suportado: ${userProfile.perfil}`)
        navigate('/perfil-nao-suportado', { replace: true })
        return
      }
      
      // Simular um delay mínimo para mostrar o skeleton (efeito Apple)
      const timer = setTimeout(() => {
        setShowSkeleton(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [userProfile, navigate])

  // Mostra skeleton enquanto carrega ou durante o delay
  if (loading || !userProfile || showSkeleton) {
    return (
      <DashboardSkeleton 
        currentProfile={userProfile?.perfil as any || 'clinica'} 
      />
    )
  }

  // Se não é um perfil suportado, não renderiza nada (será redirecionado)
  if (!PERFIS_SUPORTADOS.includes(userProfile.perfil)) {
    return null
  }

  console.log(`🎯 Renderizando dashboard para perfil: ${userProfile.perfil}`)

  const getDashboardComponent = () => {
    switch (userProfile.perfil) {
      case 'clinica':
        return <DashboardClinica />
      case 'profissional':
        return <DashboardProfissional />
      case 'recepcionista':
        return <DashboardRecepcionista />
      case 'medico':
        return <DashboardMedicoEnfermeiro />
      default:
        return null
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={userProfile.perfil}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ 
          duration: 0.5, 
          ease: [0.16, 1, 0.3, 1] 
        }}
      >
        {getDashboardComponent()}
      </motion.div>
    </AnimatePresence>
  )
}

