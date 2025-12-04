import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { toast } from './Toast'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { userProfile, reloadProfile } = useAuth()

  const handleToggle = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    toggleTheme()

    // Salvar preferência no perfil do usuário
    if (userProfile) {
      try {
        let collectionName: string = userProfile.perfil
        if (userProfile.perfil === 'clinica') {
          collectionName = 'clinicas'
        } else if (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') {
          collectionName = 'funcionarios'
        } else if (userProfile.perfil === 'profissional') {
          collectionName = 'profissionais'
        } else if (userProfile.perfil === 'paciente') {
          collectionName = 'pacientes'
        }

        await updateDoc(doc(db, collectionName, userProfile.id), {
          tema: newTheme
        })

        // Atualizar o perfil no contexto
        if (reloadProfile) {
          await reloadProfile()
        }
      } catch (error) {
        console.error('Erro ao salvar tema:', error)
        toast.error('Erro ao salvar preferência de tema')
      }
    }
  }

  return (
    <motion.button
      onClick={handleToggle}
      className="theme-toggle"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
    >
      {theme === 'dark' ? (
        <Sun size={20} />
      ) : (
        <Moon size={20} />
      )}
    </motion.button>
  )
}

