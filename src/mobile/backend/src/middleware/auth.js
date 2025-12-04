import { auth } from '../config/firebase.js';
import { ERROR_MESSAGES } from '../config/constants.js';

/**
 * Middleware de autenticação
 * Verifica o token JWT do Firebase e adiciona o usuário ao request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: 'Token de autenticação não fornecido',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verificar token com Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    
    // Adicionar informações do usuário ao request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Token inválido ou expirado',
    });
  }
};

/**
 * Middleware para verificar perfil específico
 */
export const requireProfile = (...allowedProfiles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      // Buscar perfil do usuário no Firestore (em todas as collections como no desktop/web)
      const { db } = await import('../config/firebase.js');
      const { COLLECTIONS } = await import('../config/constants.js');
      
      const collections = [
        COLLECTIONS.PACIENTES,
        COLLECTIONS.PROFISSIONAIS,
        COLLECTIONS.CLINICAS,
        COLLECTIONS.FUNCIONARIOS,
        COLLECTIONS.USERS, // Fallback
      ];
      
      let userData = null;
      let foundCollection = null;
      
      console.log(`🔍 Buscando perfil para usuário ${req.user.uid} (email: ${req.user.email})`);
      
      for (const collectionName of collections) {
        try {
          const docRef = db.collection(collectionName).doc(req.user.uid);
          const docSnap = await docRef.get();
          
          if (docSnap.exists) {
            const data = docSnap.data();
            console.log(`✅ Usuário encontrado na collection ${collectionName}`);
            
            // Para funcionários, usar cargo como perfil se for válido
            if (collectionName === COLLECTIONS.FUNCIONARIOS) {
              if (data.cargo && ['medico', 'recepcionista'].includes(data.cargo)) {
                data.perfil = data.cargo;
              }
            }
            
            // Se não tem perfil explícito, inferir pela collection
            if (!data.perfil && !data.profile) {
              if (collectionName === COLLECTIONS.PACIENTES) {
                data.perfil = 'paciente';
                console.log(`   → Perfil inferido como 'paciente' (collection: ${collectionName})`);
              } else if (collectionName === COLLECTIONS.PROFISSIONAIS) {
                data.perfil = 'profissional';
                console.log(`   → Perfil inferido como 'profissional' (collection: ${collectionName})`);
              } else if (collectionName === COLLECTIONS.CLINICAS) {
                data.perfil = 'clinica';
                console.log(`   → Perfil inferido como 'clinica' (collection: ${collectionName})`);
              }
            } else {
              console.log(`   → Perfil encontrado no documento: ${data.perfil || data.profile}`);
            }
            
            userData = data;
            foundCollection = collectionName;
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar na collection ${collectionName}:`, error.message);
          continue;
        }
      }
      
      // Se não encontrou em nenhuma collection, tentar buscar por email
      if (!userData) {
        try {
          const funcionariosQuery = db
            .collection(COLLECTIONS.FUNCIONARIOS)
            .where('email', '==', req.user.email);
          const funcionariosSnap = await funcionariosQuery.get();
          
          if (!funcionariosSnap.empty) {
            const funcionarioDoc = funcionariosSnap.docs[0];
            const data = funcionarioDoc.data();
            
            if (data.cargo && ['medico', 'recepcionista'].includes(data.cargo)) {
              data.perfil = data.cargo;
            }
            
            userData = data;
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar por email:', error.message);
        }
      }

      if (!userData) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND,
          message: 'Perfil do usuário não encontrado',
        });
      }

      // Determinar perfil baseado na collection onde foi encontrado ou no campo perfil
      let userProfile = userData.perfil || userData.profile;
      
      // Se não tem perfil explícito, inferir pela collection onde foi encontrado
      if (!userProfile && foundCollection) {
        if (foundCollection === COLLECTIONS.PACIENTES) {
          userProfile = 'paciente';
        } else if (foundCollection === COLLECTIONS.PROFISSIONAIS) {
          userProfile = 'profissional';
        } else if (foundCollection === COLLECTIONS.CLINICAS) {
          userProfile = 'clinica';
        } else if (foundCollection === COLLECTIONS.FUNCIONARIOS) {
          userProfile = userData.cargo && ['medico', 'recepcionista'].includes(userData.cargo) ? userData.cargo : 'medico';
        }
      }

      console.log(`🔍 Perfil identificado: ${userProfile} para usuário ${req.user.uid} (collection: ${foundCollection})`);

      if (!userProfile || !allowedProfiles.includes(userProfile)) {
        console.log(`❌ Perfil ${userProfile} não permitido. Permitidos: ${allowedProfiles.join(', ')}`);
        return res.status(403).json({
          success: false,
          error: ERROR_MESSAGES.FORBIDDEN,
          message: 'Acesso negado para este perfil',
        });
      }

      req.userProfile = userProfile;
      req.userData = userData;
      next();
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
      return res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  };
};

