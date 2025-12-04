import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Camera, Loader2, Sparkles } from 'lucide-react'
import { toast } from '@/components/Toast'

interface ImageUploadProps {
  currentImageUrl?: string
  onUpload: (file: File) => Promise<string>
  onRemove?: () => Promise<void>
  maxSizeMB?: number
  accept?: string
  label?: string
  className?: string
}

export default function ImageUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  maxSizeMB = 5,
  accept = 'image/jpeg,image/png,image/jpg',
  label = 'Foto de Perfil',
  className = '',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreview(currentImageUrl || null)
  }, [currentImageUrl])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    // Limpar input imediatamente para evitar múltiplos cliques
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    if (!file) return

    // Validar tipo
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error('Apenas imagens JPG e PNG são permitidas')
      return
    }

    // Validar tamanho
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      toast.error(`A imagem deve ter no máximo ${maxSizeMB}MB`)
      return
    }

    // Criar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Fazer upload
    setUploading(true)
    try {
      const imageUrl = await onUpload(file)
      setPreview(imageUrl)
      toast.success('Foto atualizada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      
      // Mensagem de erro genérica
      toast.error(error.message || 'Erro ao fazer upload da foto')
      
      setPreview(currentImageUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!onRemove) return
    
    if (!confirm('Tem certeza que deseja remover a foto?')) return

    setRemoving(true)
    try {
      await onRemove()
      setPreview(null)
      toast.success('Foto removida com sucesso!')
    } catch (error: any) {
      console.error('Erro ao remover foto:', error)
      toast.error('Erro ao remover foto')
    } finally {
      setRemoving(false)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`image-upload-container ${className}`}>
      <label className="image-upload-label">{label}</label>
      
      <div className="image-upload-wrapper">
        <div className="image-preview-container">
          {preview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="image-preview"
            >
              <img src={preview} alt="Preview" />
              {uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="upload-overlay"
                >
                  <Loader2 size={32} className="spinning" />
                  <span>Enviando...</span>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="image-placeholder"
            >
              <Camera size={48} />
              <span>Nenhuma foto</span>
            </motion.div>
          )}
        </div>

        <div className="image-upload-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading}
            className="image-input"
            id="image-upload-input"
          />
          <motion.button
            type="button"
            className={`upload-button ${uploading ? 'disabled' : ''} ${isHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={!uploading ? { scale: 1.05 } : {}}
            whileTap={!uploading ? { scale: 0.95 } : {}}
            onClick={handleClick}
            disabled={uploading}
          >
            <motion.div
              animate={isHovered && !uploading ? {
                boxShadow: [
                  '0 0 20px rgba(139, 92, 246, 0.5)',
                  '0 0 30px rgba(59, 130, 246, 0.5)',
                  '0 0 40px rgba(16, 185, 129, 0.5)',
                  '0 0 30px rgba(59, 130, 246, 0.5)',
                  '0 0 20px rgba(139, 92, 246, 0.5)',
                ],
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="upload-button-glow"
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="spinning" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>{preview ? 'Alterar Foto' : 'Adicionar Foto'}</span>
                </>
              )}
            </motion.div>
          </motion.button>
          
          {preview && onRemove && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handleRemove}
              disabled={removing || uploading}
              className="delete-button"
              whileHover={!removing && !uploading ? { scale: 1.05 } : {}}
              whileTap={!removing && !uploading ? { scale: 0.95 } : {}}
            >
              {removing ? (
                <>
                  <Loader2 size={18} className="spinning" />
                  <span>Removendo...</span>
                </>
              ) : (
                <>
                  <X size={18} />
                  <span>Excluir Foto</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      <style>{`
        .image-upload-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        }

        .image-upload-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .image-upload-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
        }

        .image-preview-container {
          display: flex;
          justify-content: center;
        }

        .image-preview {
          position: relative;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid var(--color-border);
          box-shadow: var(--shadow-lg);
          transition: all var(--transition-base);
        }

        .image-preview:hover {
          border-color: var(--color-primary);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .image-placeholder {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 3px dashed var(--color-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: var(--color-text-muted);
          background: var(--color-surface);
          transition: all var(--transition-base);
        }

        .image-placeholder:hover {
          border-color: var(--color-primary);
          background: rgba(139, 92, 246, 0.05);
        }

        .image-placeholder svg {
          opacity: 0.5;
        }

        .image-input {
          display: none;
        }

        .image-upload-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          position: relative;
          overflow: hidden;
          min-width: 200px;
        }

        .upload-button-glow {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .upload-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.5s;
        }

        .upload-button:hover::before {
          left: 100%;
        }

        .upload-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
        }

        .upload-button.hovered:not(.disabled) {
          animation: rgbGlow 2s ease-in-out infinite;
        }

        .upload-button.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes rgbGlow {
          0%, 100% {
            box-shadow: 
              0 0 20px rgba(139, 92, 246, 0.5),
              0 0 40px rgba(139, 92, 246, 0.3),
              0 0 60px rgba(139, 92, 246, 0.2);
          }
          33% {
            box-shadow: 
              0 0 20px rgba(59, 130, 246, 0.5),
              0 0 40px rgba(59, 130, 246, 0.3),
              0 0 60px rgba(59, 130, 246, 0.2);
          }
          66% {
            box-shadow: 
              0 0 20px rgba(16, 185, 129, 0.5),
              0 0 40px rgba(16, 185, 129, 0.3),
              0 0 60px rgba(16, 185, 129, 0.2);
          }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        .delete-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.875rem 2rem;
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid rgba(239, 68, 68, 0.3);
          color: var(--color-error);
          border-radius: var(--radius-lg);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          min-width: 200px;
        }

        .delete-button:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          border-color: var(--color-error);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
          transform: translateY(-2px);
        }

        .delete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
