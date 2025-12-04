import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage, auth } from '@/firebase/config'

/**
 * Faz upload de uma imagem para o Firebase Storage
 * @param file Arquivo de imagem
 * @param path Caminho no storage (ex: 'profissionais', 'pacientes', 'clinicas', 'funcionarios')
 * @param userId ID do usuário
 * @returns URL da imagem no Firebase Storage
 */
export async function uploadImage(
  file: File,
  path: string,
  userId: string
): Promise<string> {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('Usuário não autenticado. Faça login novamente.')
    }

    // Criar nome único para o arquivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${userId}_${timestamp}.${extension}`
    
    // Criar referência no storage
    const storageRef = ref(storage, `${path}/${fileName}`)
    
    // Fazer upload com metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    }
    
    await uploadBytes(storageRef, file, metadata)
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(storageRef)
    
    return downloadURL
  } catch (error: any) {
    console.error('Erro ao fazer upload da imagem:', error)
    
    // Mensagens de erro mais amigáveis
    if (error.code === 'storage/unauthorized') {
      throw new Error('Sem permissão para fazer upload. Verifique as regras do Firebase Storage.')
    } else if (error.code === 'storage/canceled') {
      throw new Error('Upload cancelado.')
    } else if (error.code === 'storage/unknown') {
      throw new Error('Erro desconhecido ao fazer upload. Tente novamente.')
    }
    
    throw new Error('Erro ao fazer upload da imagem: ' + (error.message || 'Erro desconhecido'))
  }
}

/**
 * Remove uma imagem do Firebase Storage
 * @param imageURL URL completa da imagem no Firebase Storage
 */
export async function deleteImage(imageURL: string): Promise<void> {
  try {
    if (!imageURL || typeof imageURL !== 'string') {
      console.warn('URL inválida ou vazia para deletar')
      return
    }

    // Verificar se é uma URL válida do Firebase Storage
    let path: string | null = null

    // Tentar extrair o caminho de diferentes formatos de URL do Firebase Storage
    if (imageURL.includes('firebasestorage.googleapis.com')) {
      try {
        const url = new URL(imageURL)
        // Formato: /v0/b/{bucket}/o/{path}?alt=media&token=...
        const pathMatch = url.pathname.match(/\/o\/(.+)/)
        if (pathMatch) {
          path = decodeURIComponent(pathMatch[1])
        }
      } catch (urlError) {
        // Se não conseguir criar URL, tentar extrair diretamente
        const pathMatch = imageURL.match(/\/o\/([^?]+)/)
        if (pathMatch) {
          path = decodeURIComponent(pathMatch[1])
        }
      }
    } else if (imageURL.startsWith('gs://')) {
      // Formato gs://bucket/path
      path = imageURL.replace(/^gs:\/\/[^/]+\//, '')
    } else if (!imageURL.includes('://')) {
      // Se não tem protocolo, pode ser um caminho direto
      path = imageURL
    }

    if (!path) {
      console.warn('Não foi possível extrair o caminho da URL:', imageURL)
      // Não lançar erro, apenas avisar - pode ser que a imagem já foi deletada ou a URL está em formato diferente
      return
    }
    
    // Criar referência e deletar
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error: any) {
    console.error('Erro ao deletar imagem:', error)
    
    // Se o erro for que o arquivo não existe, não é um problema crítico
    if (error.code === 'storage/object-not-found') {
      console.warn('Imagem não encontrada no storage (pode já ter sido deletada)')
      return
    }
    
    throw new Error('Erro ao deletar imagem: ' + (error.message || 'Erro desconhecido'))
  }
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

