import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import { useAuthStore } from '@/store/authStore'
import { User, UserProfile } from '@/types'

interface AuthContextType {
  currentUser: FirebaseUser | null
  userProfile: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, profileData: Partial<User>) => Promise<void>
  logout: () => Promise<void>
  reloadProfile: () => Promise<void>
  createBasicProfile: (perfilSugerido?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  const { setFirebaseUser, setUserProfile: setStoreProfile, setLoading: setStoreLoading, logout: storeLogout } = useAuthStore()

  useEffect(() => {
    const startTime = Date.now()
    const minLoadingTime = 2000 // Mínimo de 2 segundos de carregamento
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      setFirebaseUser(user)
      
      if (user) {
        try {
          await loadUserProfile(user.uid)
        } catch (error) {
          console.error('Erro ao carregar perfil:', error)
          // Se houver erro ao carregar perfil, limpa o estado
          setUserProfile(null)
          setStoreProfile(null)
        }
      } else {
        setUserProfile(null)
        setStoreProfile(null)
      }
      
      // Garantir que o loading dure pelo menos o tempo mínimo
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
      
      setTimeout(() => {
        setLoading(false)
        setStoreLoading(false)
      }, remainingTime)
    })

    return unsubscribe
  }, [])

  const loadUserProfile = async (uid: string) => {
    try {
      // Timeout de 10 segundos para não ficar travado
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar perfil')), 10000)
      )

      const loadPromise = (async () => {
        console.log(`🔍 Iniciando busca de perfil para UID: ${uid}`)
        
        // Primeiro, tentar buscar pelo UID diretamente (método preferido)
        const collections = [
          { name: 'pacientes', collection: 'pacientes' },
          { name: 'profissionais', collection: 'profissionais' },
          { name: 'clinicas', collection: 'clinicas' },
          { name: 'funcionarios', collection: 'funcionarios' },
          { name: 'users', collection: 'users' }, // Coleção genérica de usuários
          { name: 'admins', collection: 'admins' },
        ]
        
        console.log(`📂 Buscando perfil em ${collections.length} coleções pelo UID...`)
        
        for (const { collection: collectionName } of collections) {
          try {
            const docRef = doc(db, collectionName, uid)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) {
              console.log(`✅ Perfil encontrado na coleção: ${collectionName}`)
              const data = docSnap.data()
              
              // Para funcionários, SEMPRE priorizar cargo sobre perfil
              let perfilFinal = data.perfil
              let cargoCorrigido = data.cargo
              
              if (collectionName === 'funcionarios') {
                console.log(`🔍 Carregando funcionário - perfil atual: ${data.perfil}, cargo: ${data.cargo}, email: ${data.email}`)
                
                // CORREÇÃO AUTOMÁTICA: Se o email indica um cargo diferente, corrigir
                const emailLower = (data.email || '').toLowerCase()
                if (emailLower.includes('medico') && data.cargo !== 'medico') {
                  console.log(`🔧 Correção automática: Email indica médico, mas cargo é ${data.cargo}. Corrigindo...`)
                  cargoCorrigido = 'medico'
                } else if (emailLower.includes('recepcionista') && data.cargo !== 'recepcionista') {
                  console.log(`🔧 Correção automática: Email indica recepcionista, mas cargo é ${data.cargo}. Corrigindo...`)
                  cargoCorrigido = 'recepcionista'
                }
                
                // SEMPRE usar cargo (corrigido se necessário) se existir e for válido
                if (cargoCorrigido && ['medico', 'recepcionista'].includes(cargoCorrigido)) {
                  perfilFinal = cargoCorrigido
                  console.log(`✅ Usando cargo como perfil: ${perfilFinal}`)
                } else if (!perfilFinal || !['medico', 'recepcionista'].includes(perfilFinal)) {
                  // Se não tem cargo válido, tentar inferir do perfil ou usar cargo como fallback
                  perfilFinal = cargoCorrigido || perfilFinal
                  console.log(`⚠️ Usando fallback: ${perfilFinal}`)
                }
                
                // Se o cargo ou perfil mudou, atualizar no Firestore
                if (data.cargo !== cargoCorrigido || data.perfil !== perfilFinal) {
                  console.log(`🔄 Atualizando Firestore - cargo: ${data.cargo} → ${cargoCorrigido}, perfil: ${data.perfil} → ${perfilFinal}`)
                }
              } else {
                // Para outras coleções, usar perfil ou inferir do nome da coleção
                perfilFinal = data.perfil || collectionName.slice(0, -1)
                
                // CORREÇÃO AUTOMÁTICA: Corrigir typos comuns de perfil
                if (perfilFinal === 'profissionai') {
                  console.log(`🔧 Correção automática: perfil "profissionai" corrigido para "profissional"`)
                  perfilFinal = 'profissional'
                  // Atualizar no Firestore
                  try {
                    await updateDoc(doc(db, collectionName, uid), {
                      perfil: 'profissional'
                    })
                    console.log(`✅ Perfil corrigido no Firestore: profissionai → profissional`)
                  } catch (updateError) {
                    console.warn('Erro ao corrigir perfil no Firestore:', updateError)
                  }
                }
                
                // VALIDAÇÃO: Profissionais autônomos NUNCA devem ter idClinica
                if (collectionName === 'profissionais' && perfilFinal === 'profissional') {
                  if (data.idClinica) {
                    console.warn('⚠️ Profissional autônomo com idClinica detectado. Removendo idClinica...')
                    try {
                      await updateDoc(doc(db, 'profissionais', uid), {
                        idClinica: null
                      })
                      console.log('✅ idClinica removido do profissional autônomo')
                    } catch (updateError) {
                      console.warn('Erro ao remover idClinica:', updateError)
                    }
                  }
                }
              }
              
              const profile: User = {
                id: uid,
                ...data,
                perfil: perfilFinal as UserProfile,
                cargo: cargoCorrigido || data.cargo,
                // Garantir que profissionais autônomos não tenham idClinica
                idClinica: (collectionName === 'profissionais' && perfilFinal === 'profissional') ? null : (data.idClinica || undefined),
                fotoURL: data.fotoURL || data.foto || undefined, // Suporta ambos os campos
                tema: data.tema || 'dark', // Tema padrão é dark
                dataCriacao: data.dataCriacao?.toDate ? data.dataCriacao.toDate() : (data.dataCriacao instanceof Date ? data.dataCriacao : new Date()),
              } as User
              
              // Se o cargo ou perfil foi corrigido e é funcionário, atualizar no Firestore
              if (collectionName === 'funcionarios' && (data.cargo !== cargoCorrigido || data.perfil !== perfilFinal)) {
                try {
                  await updateDoc(doc(db, 'funcionarios', uid), {
                    cargo: cargoCorrigido,
                    perfil: perfilFinal
                  })
                  console.log(`✅ Cargo e perfil atualizados no Firestore: cargo=${cargoCorrigido}, perfil=${perfilFinal}`)
                } catch (updateError) {
                  console.warn('Erro ao atualizar cargo/perfil no Firestore:', updateError)
                }
              }
              
              console.log(`📋 Perfil final carregado: ${perfilFinal}`)
              
              setUserProfile(profile)
              setStoreProfile(profile)
              return
            } else {
              console.log(`   ❌ Não encontrado em ${collectionName}`)
            }
          } catch (collectionError) {
            // Se houver erro em uma coleção, continua tentando as outras
            console.warn(`⚠️ Erro ao buscar na coleção ${collectionName}:`, collectionError)
            continue
          }
        }
        
        console.log(`⚠️ Perfil não encontrado pelo UID em nenhuma coleção. Tentando buscar por email...`)

        // Se não encontrou pelo UID, tentar buscar pelo email em todas as coleções
        try {
          const currentUser = auth.currentUser
          if (currentUser && currentUser.email) {
            console.log(`🔍 Buscando perfil por email: ${currentUser.email}`)
            
            // Primeiro, tentar buscar funcionários pelo email (para funcionários antigos criados com addDoc)
            const funcionariosRef = collection(db, 'funcionarios')
            const funcionariosQuery = query(funcionariosRef, where('email', '==', currentUser.email))
            const funcionariosSnap = await getDocs(funcionariosQuery)
            
            if (!funcionariosSnap.empty) {
              const funcionarioDoc = funcionariosSnap.docs[0]
              const data = funcionarioDoc.data()
              
              // Se o documento não tem o UID como ID, corrigir criando um novo com o UID correto
              if (funcionarioDoc.id !== uid) {
                console.warn(`Funcionário encontrado com ID diferente (${funcionarioDoc.id}), corrigindo para ${uid}...`)
                try {
                  // Determinar perfil correto baseado no cargo
                  const perfilCorreto = data.cargo && ['medico', 'recepcionista'].includes(data.cargo) 
                    ? data.cargo 
                    : (data.perfil || data.cargo)
                  
                  // Criar documento com UID correto
                  await setDoc(doc(db, 'funcionarios', uid), {
                    ...data,
                    id: uid,
                    perfil: perfilCorreto,
                    cargo: data.cargo || perfilCorreto,
                  })
                  // Deletar documento antigo
                  await deleteDoc(doc(db, 'funcionarios', funcionarioDoc.id))
                  console.log(`✅ Funcionário corrigido com sucesso! Perfil: ${perfilCorreto}`)
                } catch (migrateError) {
                  console.error('Erro ao migrar funcionário:', migrateError)
                }
              }
              
              // Para funcionários encontrados por email, SEMPRE priorizar cargo
              console.log(`🔍 Funcionário encontrado por email - perfil atual: ${data.perfil}, cargo: ${data.cargo}, email: ${data.email}`)
              
              let perfilFinalEmail = data.perfil
              let cargoCorrigidoEmail = data.cargo
              
              // CORREÇÃO AUTOMÁTICA: Se o email indica um cargo diferente, corrigir
              const emailLower = (data.email || '').toLowerCase()
              if (emailLower.includes('medico') && data.cargo !== 'medico') {
                console.log(`🔧 Correção automática: Email indica médico, mas cargo é ${data.cargo}. Corrigindo...`)
                cargoCorrigidoEmail = 'medico'
              } else if (emailLower.includes('recepcionista') && data.cargo !== 'recepcionista') {
                console.log(`🔧 Correção automática: Email indica recepcionista, mas cargo é ${data.cargo}. Corrigindo...`)
                cargoCorrigidoEmail = 'recepcionista'
              }
              
              // SEMPRE usar cargo (corrigido se necessário) se existir e for válido
              if (cargoCorrigidoEmail && ['medico', 'recepcionista'].includes(cargoCorrigidoEmail)) {
                perfilFinalEmail = cargoCorrigidoEmail
                console.log(`✅ Usando cargo como perfil: ${perfilFinalEmail}`)
              } else if (!perfilFinalEmail || !['medico', 'recepcionista'].includes(perfilFinalEmail)) {
                perfilFinalEmail = cargoCorrigidoEmail || perfilFinalEmail
                console.log(`⚠️ Usando fallback: ${perfilFinalEmail}`)
              }
              
              // CORREÇÃO AUTOMÁTICA: Corrigir typos comuns de perfil
              if (perfilFinalEmail === 'profissionai') {
                console.log(`🔧 Correção automática: perfil "profissionai" corrigido para "profissional"`)
                perfilFinalEmail = 'profissional'
                // Atualizar no Firestore
                try {
                  await updateDoc(doc(db, 'funcionarios', funcionarioDoc.id), {
                    perfil: 'profissional'
                  })
                  console.log(`✅ Perfil corrigido no Firestore: profissionai → profissional`)
                } catch (updateError) {
                  console.warn('Erro ao corrigir perfil no Firestore:', updateError)
                }
              }
              
              // Se o cargo ou perfil mudou, atualizar no Firestore
              if (data.cargo !== cargoCorrigidoEmail || data.perfil !== perfilFinalEmail) {
                console.log(`🔄 Atualizando Firestore - cargo: ${data.cargo} → ${cargoCorrigidoEmail}, perfil: ${data.perfil} → ${perfilFinalEmail}`)
              }
              
              const profile: User = {
                id: uid,
                ...data,
                perfil: perfilFinalEmail as UserProfile,
                cargo: cargoCorrigidoEmail || data.cargo,
                fotoURL: data.fotoURL || data.foto || undefined, // Suporta ambos os campos
                dataCriacao: data.dataCriacao?.toDate ? data.dataCriacao.toDate() : (data.dataCriacao instanceof Date ? data.dataCriacao : new Date()),
              } as User
              
              // Se o cargo ou perfil foi corrigido, atualizar no Firestore
              if (data.cargo !== cargoCorrigidoEmail || data.perfil !== perfilFinalEmail) {
                try {
                  await updateDoc(doc(db, 'funcionarios', uid), {
                    cargo: cargoCorrigidoEmail,
                    perfil: perfilFinalEmail
                  })
                  console.log(`✅ Cargo e perfil atualizados no Firestore: cargo=${cargoCorrigidoEmail}, perfil=${perfilFinalEmail}`)
                } catch (updateError) {
                  console.warn('Erro ao atualizar cargo/perfil no Firestore:', updateError)
                }
              }
              
              console.log(`📋 Perfil final carregado (busca por email): ${perfilFinalEmail}`)
              
              setUserProfile(profile)
              setStoreProfile(profile)
              return
            }
            
            // Se não encontrou em funcionários, buscar em outras coleções por email
            const emailCollections = [
              { name: 'pacientes', collection: 'pacientes' },
              { name: 'profissionais', collection: 'profissionais' },
              { name: 'clinicas', collection: 'clinicas' },
              { name: 'users', collection: 'users' }, // Coleção genérica de usuários
            ]
            
            for (const { collection: collectionName } of emailCollections) {
              try {
                const collectionRef = collection(db, collectionName)
                const emailQuery = query(collectionRef, where('email', '==', currentUser.email))
                const emailSnap = await getDocs(emailQuery)
                
                if (!emailSnap.empty) {
                  const docFound = emailSnap.docs[0]
                  const data = docFound.data()
                  
                  console.log(`✅ Perfil encontrado por email na coleção ${collectionName}`)
                  
                  // Se o documento não tem o UID como ID, corrigir criando um novo com o UID correto
                  if (docFound.id !== uid) {
                    console.warn(`📋 Perfil encontrado com ID diferente (${docFound.id}), migrando para ${uid}...`)
                    try {
                      const perfilInferido = data.perfil || collectionName.slice(0, -1)
                      
                      // Criar documento com UID correto
                      await setDoc(doc(db, collectionName, uid), {
                        ...data,
                        id: uid,
                        perfil: perfilInferido,
                      })
                      // Deletar documento antigo
                      await deleteDoc(doc(db, collectionName, docFound.id))
                      console.log(`✅ Perfil migrado com sucesso! Perfil: ${perfilInferido}`)
                    } catch (migrateError) {
                      console.error('Erro ao migrar perfil:', migrateError)
                    }
                  }
                  
                  // Inferir perfil se não existir
                  let perfilFinal = data.perfil
                  if (!perfilFinal) {
                    if (collectionName === 'pacientes') {
                      perfilFinal = 'paciente'
                    } else if (collectionName === 'profissionais') {
                      perfilFinal = 'profissional'
                    } else if (collectionName === 'clinicas') {
                      perfilFinal = 'clinica'
                    }
                  }
                  
                  const profile: User = {
                    id: uid,
                    ...data,
                    perfil: perfilFinal as UserProfile,
                    fotoURL: data.fotoURL || data.foto || undefined,
                    dataCriacao: data.dataCriacao?.toDate ? data.dataCriacao.toDate() : (data.dataCriacao instanceof Date ? data.dataCriacao : new Date()),
                  } as User
                  
                  console.log(`📋 Perfil final carregado (busca por email em ${collectionName}): ${perfilFinal}`)
                  
                  setUserProfile(profile)
                  setStoreProfile(profile)
                  return
                }
              } catch (collectionEmailError) {
                console.warn(`⚠️ Erro ao buscar por email na coleção ${collectionName}:`, collectionEmailError)
                continue
              }
            }
            
            console.warn(`⚠️ Perfil não encontrado por email em nenhuma coleção para: ${currentUser.email}`)
          }
        } catch (emailSearchError) {
          console.warn('Erro ao buscar perfil por email:', emailSearchError)
        }
        
        // Se não encontrou em nenhuma coleção, define perfil como null mas não lança erro
        const currentUser = auth.currentUser
        console.error(`❌ PERFIL NÃO ENCONTRADO para o usuário:`, {
          uid: uid,
          email: currentUser?.email || 'não disponível',
          displayName: currentUser?.displayName || 'não disponível',
          colecoesVerificadas: ['pacientes', 'profissionais', 'clinicas', 'funcionarios', 'admins'],
          buscaPorEmailRealizada: !!currentUser?.email
        })
        console.warn(`⚠️ Perfil não encontrado para o usuário ${uid} (email: ${currentUser?.email || 'não disponível'})`)
        setUserProfile(null)
        setStoreProfile(null)
      })()

      await Promise.race([loadPromise, timeoutPromise])
    } catch (error: any) {
      console.error('Erro ao carregar perfil do usuário:', error)
      // Se for timeout ou outro erro, define perfil como null e continua
      setUserProfile(null)
      setStoreProfile(null)
      // Não lança erro para não travar o app
    }
  }

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string, profileData: Partial<User>) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    if (profileData.perfil) {
      const collectionName = 
        profileData.perfil === 'medico' || profileData.perfil === 'recepcionista'
          ? 'funcionarios'
          : profileData.perfil
      
      const userDoc = {
        ...profileData,
        id: user.uid,
        email,
        dataCriacao: new Date(),
      }
      
      await setDoc(doc(db, collectionName, user.uid), userDoc)
      await loadUserProfile(user.uid)
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUserProfile(null)
    storeLogout()
  }

  const reloadProfile = async () => {
    if (currentUser) {
      await loadUserProfile(currentUser.uid)
    }
  }

  const createBasicProfile = async (perfilSugerido?: string) => {
    if (!currentUser) {
      throw new Error('Usuário não autenticado')
    }

    const email = currentUser.email?.toLowerCase() || ''
    const displayName = currentUser.displayName || 'Usuário'

    // Determinar perfil baseado no email ou sugestão
    let perfil = perfilSugerido
    let collectionName = 'profissionais'
    let cargo: string | undefined = undefined

    if (!perfil) {
      if (email.includes('medico') || email.includes('medic') || email.includes('doctor')) {
        perfil = 'medico'
        collectionName = 'funcionarios'
        cargo = 'medico'
      } else if (email.includes('recepcionista') || email.includes('reception')) {
        perfil = 'recepcionista'
        collectionName = 'funcionarios'
        cargo = 'recepcionista'
      } else if (email.includes('clinica') || email.includes('clinic')) {
        perfil = 'clinica'
        collectionName = 'clinicas'
      } else if (email.includes('profissional') || email.includes('professional')) {
        perfil = 'profissional'
        collectionName = 'profissionais'
      } else {
        // Padrão: criar como profissional autônomo
        perfil = 'profissional'
        collectionName = 'profissionais'
      }
    } else {
      // Se perfil foi sugerido, determinar a coleção correta
      if (perfil === 'medico' || perfil === 'recepcionista') {
        collectionName = 'funcionarios'
        cargo = perfil
      } else {
        collectionName = perfil === 'clinica' ? 'clinicas' : 'profissionais'
      }
    }

    console.log(`🔧 Criando perfil básico: ${perfil} na coleção ${collectionName}`)

    const profileData: any = {
      id: currentUser.uid,
      email: currentUser.email || '',
      nome: displayName,
      perfil: perfil,
      dataCriacao: new Date(),
    }

    if (cargo) {
      profileData.cargo = cargo
    }

    if (collectionName === 'profissionais') {
      profileData.idClinica = null // Profissional autônomo
    }

    // Criar perfil no Firestore
    await setDoc(doc(db, collectionName, currentUser.uid), profileData)

    console.log(`✅ Perfil básico criado com sucesso!`)
    
    // Recarregar o perfil
    await loadUserProfile(currentUser.uid)
  }

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    logout,
    reloadProfile,
    createBasicProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

