import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoadingScreen from './LoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedProfiles?: string[]
}

export default function ProtectedRoute({ children, allowedProfiles }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading } = useAuth()

  // Se ainda está carregando, mostra loading apenas por um tempo máximo
  if (loading) {
    return <LoadingScreen />
  }

  // Se não tem usuário autenticado, redireciona para login
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  // Se tem perfil específico necessário e não tem perfil carregado ainda, espera um pouco mais
  if (allowedProfiles && !userProfile) {
    // Se após carregar ainda não tem perfil, pode ser que o perfil não exista
    // Mas permite acesso se o usuário está autenticado
    return <>{children}</>
  }

  // Se tem perfil específico necessário e o perfil não está na lista permitida, redireciona
  if (allowedProfiles && userProfile && !allowedProfiles.includes(userProfile.perfil)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

