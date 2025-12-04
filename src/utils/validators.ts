// Utilitários de validação

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Validação dos dígitos verificadores
  let sum = 0
  let remainder
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false
  
  return true
}

export const validateCNPJ = (cnpj: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  
  // Validação dos dígitos verificadores
  let length = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, length)
  const digits = cleanCNPJ.substring(length)
  let sum = 0
  let pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  length = length + 1
  numbers = cleanCNPJ.substring(0, length)
  sum = 0
  pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

export const formatCPF = (cpf: string): string => {
  const cleanCPF = cpf.replace(/\D/g, '')
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatCNPJ = (cnpj: string): string => {
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return phone
}

// Formata telefone no formato: 55 (XX) XXXXX-XXXX
export const formatPhoneBR = (phone: string): string => {
  if (!phone) return ''
  
  // Remove tudo que não é número
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Se começar com 55, remove (já vamos adicionar)
  const phoneWithoutCountry = cleanPhone.startsWith('55') ? cleanPhone.slice(2) : cleanPhone
  
  // Limita a 11 dígitos (2 DDD + 9 número)
  const limitedPhone = phoneWithoutCountry.slice(0, 11)
  
  // Se não tiver nenhum dígito, retorna vazio
  if (limitedPhone.length === 0) return ''
  
  // Formata conforme o tamanho
  if (limitedPhone.length <= 2) {
    return `55 (${limitedPhone}`
  } else if (limitedPhone.length <= 7) {
    return `55 (${limitedPhone.slice(0, 2)}) ${limitedPhone.slice(2)}`
  } else {
    return `55 (${limitedPhone.slice(0, 2)}) ${limitedPhone.slice(2, 7)}-${limitedPhone.slice(7)}`
  }
}

// Formata CRM no formato: XXXXX ou XXXXX-XX
export const formatCRM = (crm: string): string => {
  if (!crm) return ''
  const numbers = crm.replace(/\D/g, '')
  if (numbers.length > 7) {
    return numbers.substring(0, 7).replace(/^(\d{5})(\d+)/, '$1-$2')
  }
  if (numbers.length > 5) {
    return numbers.replace(/^(\d{5})(\d+)/, '$1-$2')
  }
  return numbers
}

export const isPastDate = (date: Date): boolean => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  return checkDate < now
}

export const isPastDateTime = (dateTime: Date): boolean => {
  return dateTime < new Date()
}

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

