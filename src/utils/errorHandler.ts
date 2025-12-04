import { toast } from '@/components/Toast'

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const handleError = (error: unknown) => {
  console.error('Error:', error)

  if (error instanceof AppError) {
    toast.error(error.message)
    return
  }

  if (error instanceof Error) {
    // Firebase Auth errors
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error('Usuário não encontrado')
          return
        case 'auth/wrong-password':
          toast.error('Senha incorreta')
          return
        case 'auth/email-already-in-use':
          toast.error('Este email já está em uso')
          return
        case 'auth/weak-password':
          toast.error('Senha muito fraca. Use pelo menos 6 caracteres')
          return
        case 'auth/invalid-email':
          toast.error('Email inválido')
          return
        case 'auth/network-request-failed':
          toast.error('Erro de conexão. Verifique sua internet')
          return
        case 'permission-denied':
          toast.error('Você não tem permissão para realizar esta ação')
          return
        default:
          toast.error(error.message || 'Erro desconhecido')
          return
      }
    }
    toast.error(error.message || 'Ocorreu um erro inesperado')
    return
  }

  toast.error('Ocorreu um erro inesperado. Tente novamente.')
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Senha deve ter pelo menos 6 caracteres' }
  }
  return { valid: true }
}

export const validateRequired = (value: string, fieldName: string): { valid: boolean; message?: string } => {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: `${fieldName} é obrigatório` }
  }
  return { valid: true }
}

