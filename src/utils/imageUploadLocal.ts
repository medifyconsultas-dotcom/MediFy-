/**
 * Sistema de Upload Local - Usa Base64 ao invés de Firebase Storage
 * Ideal para desenvolvimento/teste sem necessidade de cartão de crédito
 */

/**
 * Converte um arquivo de imagem para Base64
 * @param file Arquivo de imagem
 * @returns Promise com string base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = (error) => {
      reject(error)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Faz upload de uma imagem usando Base64 (armazenamento local)
 * @param file Arquivo de imagem
 * @param path Caminho no storage (ex: 'profissionais', 'pacientes', 'clinicas', 'funcionarios')
 * @param userId ID do usuário
 * @returns URL base64 da imagem
 */
export async function uploadImageLocal(
  file: File,
  path: string,
  userId: string
): Promise<string> {
  try {
    // Validar tipo
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      throw new Error('Apenas imagens JPG e PNG são permitidas')
    }

    // Validar tamanho (máx 2MB para base64 - localStorage tem limite)
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > 2) {
      throw new Error('A imagem deve ter no máximo 2MB para armazenamento local')
    }

    // Converter para base64
    const base64 = await fileToBase64(file)
    
    return base64
  } catch (error: any) {
    console.error('Erro ao converter imagem para base64:', error)
    throw new Error('Erro ao processar imagem: ' + (error.message || 'Erro desconhecido'))
  }
}

/**
 * Remove uma imagem (não necessário para base64, mas mantém compatibilidade)
 * @param imageURL URL base64 da imagem
 */
export async function deleteImageLocal(imageURL: string): Promise<void> {
  // Para base64, não há nada a deletar do storage
  // A imagem será removida do Firestore quando o campo for limpo
  console.log('Imagem base64 será removida do Firestore')
}

/**
 * Verifica se uma URL é base64
 */
export function isBase64Image(url: string): boolean {
  return url.startsWith('data:image/')
}

/**
 * Obtém o caminho do storage baseado no perfil do usuário
 */
export function getStoragePath(perfil: string): string {
  switch (perfil) {
    case 'profissional':
      return 'profissionais'
    case 'paciente':
      return 'pacientes'
    case 'clinica':
      return 'clinicas'
    case 'medico':
    case 'recepcionista':
      return 'funcionarios'
    default:
      return 'usuarios'
  }
}

