import { auth, db } from '../config/firebase.js';
import { COLLECTIONS, ERROR_MESSAGES, SUCCESS_MESSAGES, USER_PROFILES } from '../config/constants.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Login de usuário
 * Nota: O Firebase Admin SDK não pode verificar senhas diretamente.
 * Para verificar a senha, precisamos usar a REST API do Firebase Auth.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    console.log('📝 Tentativa de login:', { email });

    // Verificar se email e senha foram fornecidos
    if (!email || !password) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 'Email e senha são obrigatórios', 400);
    }

    // Buscar usuário no Firebase Auth para verificar se existe
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('✅ Usuário encontrado no Firebase Auth:', userRecord.uid);
    } catch (error) {
      console.log('❌ Usuário não encontrado:', error.message);
      return errorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 'Email ou senha inválidos', 401);
    }

    // Verificar senha e obter ID token usando a REST API do Firebase Auth
    // O Firebase Admin SDK não pode verificar senhas diretamente,
    // então vamos usar a REST API do Firebase Auth para fazer login e obter um ID token real
    
    // Buscar dados do perfil no Firestore
    // Buscar em todas as collections como no desktop/web
    const collections = [
      COLLECTIONS.PACIENTES,
      COLLECTIONS.PROFISSIONAIS,
      COLLECTIONS.CLINICAS,
      COLLECTIONS.FUNCIONARIOS,
      COLLECTIONS.USERS, // Fallback
    ];
    
    let userData = null;
    let foundCollection = null;
    
    for (const collectionName of collections) {
      try {
        const docRef = db.collection(collectionName).doc(userRecord.uid);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
          const data = docSnap.data();
          
          // Para funcionários, usar cargo como perfil se for válido
          if (collectionName === COLLECTIONS.FUNCIONARIOS) {
            if (data.cargo && ['medico', 'recepcionista'].includes(data.cargo)) {
              data.perfil = data.cargo;
            }
          }
          
          userData = data;
          foundCollection = collectionName;
          console.log(`✅ Usuário encontrado na collection: ${collectionName}`);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar na collection ${collectionName}:`, error.message);
        continue;
      }
    }
    
    // Se não encontrou em nenhuma collection, tentar buscar por email (para funcionários antigos)
    if (!userData) {
      try {
        const funcionariosQuery = db
          .collection(COLLECTIONS.FUNCIONARIOS)
          .where('email', '==', email);
        const funcionariosSnap = await funcionariosQuery.get();
        
        if (!funcionariosSnap.empty) {
          const funcionarioDoc = funcionariosSnap.docs[0];
          const data = funcionarioDoc.data();
          
          // Usar cargo como perfil se for válido
          if (data.cargo && ['medico', 'recepcionista'].includes(data.cargo)) {
            data.perfil = data.cargo;
          }
          
          userData = data;
          foundCollection = COLLECTIONS.FUNCIONARIOS;
          console.log(`✅ Usuário encontrado por email na collection: ${foundCollection}`);
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar por email:', error.message);
      }
    }
    
    if (!userData) {
      console.log('❌ Usuário não encontrado em nenhuma collection do Firestore');
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, 'Usuário não encontrado', 404);
    }

    console.log('✅ Dados do usuário encontrados:', { 
      nome: userData.nome, 
      perfil: userData.perfil,
      collection: foundCollection 
    });

    // Obter ID token usando REST API do Firebase Auth (verificando senha)
    let idToken;
    try {
      // Usar REST API do Firebase Auth para fazer login e obter ID token
      const firebaseApiKey = process.env.FIREBASE_API_KEY || 'AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94';
      
      console.log('🔐 Verificando senha via REST API...');
      const loginResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true,
          }),
        }
      );
      
      const loginData = await loginResponse.json();
      
      if (!loginResponse.ok) {
        console.error('❌ Erro ao fazer login via REST API:', loginData);
        const errorMessage = loginData.error?.message || 'Erro ao fazer login';
        
        // Se a senha estiver errada
        if (errorMessage.includes('INVALID_PASSWORD') || errorMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
          return errorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 'Email ou senha inválidos', 401);
        }
        
        // Se houver outro erro, tentar custom token como fallback
        console.log('⚠️ Tentando usar custom token como fallback...');
        const customToken = await auth.createCustomToken(userRecord.uid);
        idToken = customToken;
        console.log('⚠️ Usando custom token (cliente precisará trocar)');
      } else {
        idToken = loginData.idToken;
        console.log('✅ ID token obtido via REST API (senha verificada)');
      }
    } catch (tokenError) {
      console.error('❌ Erro ao obter token:', tokenError);
      // Em caso de erro, tentar gerar custom token como fallback
      try {
        idToken = await auth.createCustomToken(userRecord.uid);
        console.log('⚠️ Usando custom token como fallback');
      } catch (fallbackError) {
        return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Erro ao gerar token de autenticação', 500);
      }
    }

    return successResponse(res, {
      token: idToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        nome: userData.nome,
        perfil: userData.perfil || userData.profile,
      },
    }, SUCCESS_MESSAGES.LOGIN_SUCCESS);
  } catch (error) {
    console.error('❌ Erro no login:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, error.message, 500);
  }
};

/**
 * Cadastro de novo usuário
 */
export const register = async (req, res) => {
  try {
    // Verificar se Firebase está configurado
    if (!auth || !db) {
      console.error('❌ Firebase Admin SDK não está inicializado');
      console.error('auth:', typeof auth, auth);
      console.error('db:', typeof db, db);
      return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Firebase não configurado. Configure o arquivo .env', 500);
    }

    // Verificar se req.validatedData existe
    if (!req.validatedData) {
      console.error('❌ req.validatedData não existe');
      return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Dados de validação não encontrados', 500);
    }

    const { email, password, nome, perfil, telefone, cpf, dataNascimento, endereco, planoSaude } = req.validatedData;
    
    console.log('📝 Dados recebidos:', { email, nome, perfil, endereco, planoSaude });

    // Verificar se email já existe
    try {
      console.log('🔍 Verificando se email já existe...');
      if (!auth.getUserByEmail) {
        console.error('❌ auth.getUserByEmail não é uma função');
        return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Firebase Auth não está configurado corretamente', 500);
      }
      await auth.getUserByEmail(email);
      console.log('⚠️ Email já existe');
      return errorResponse(res, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, 'Email já cadastrado', 409);
    } catch (error) {
      // Email não existe, pode continuar
      console.log('✅ Email não existe, pode criar novo usuário');
      // Se o erro não for "user not found", pode ser um problema de configuração
      if (error.message && error.message.includes('Firebase não configurado')) {
        return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Firebase não configurado. Configure o arquivo .env', 500);
      }
    }

    // Criar usuário no Firebase Auth
    let userRecord;
    try {
      console.log('👤 Criando usuário no Firebase Auth...');
      if (!auth.createUser) {
        console.error('❌ auth.createUser não é uma função');
        return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Firebase Auth não está configurado corretamente', 500);
      }
      userRecord = await auth.createUser({
        email,
        password,
        emailVerified: false,
      });
      console.log('✅ Usuário criado no Firebase Auth:', userRecord.uid);
    } catch (error) {
      console.error('❌ Erro ao criar usuário no Firebase Auth:', error);
      if (error.message && error.message.includes('Firebase não configurado')) {
        return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Firebase não configurado. Configure o arquivo .env', 500);
      }
      throw error;
    }

    // Preparar dados do perfil
    const userData = {
      id: userRecord.uid,
      email,
      nome,
      perfil,
      telefone: telefone || null,
      cpf: cpf || null,
      dataNascimento: dataNascimento || null,
      endereco: endereco || null,
      planoSaude: planoSaude || null,
      plano: planoSaude || null, // Manter compatibilidade com campo 'plano'
      dataCriacao: new Date(),
    };

    // Salvar no Firestore baseado no perfil
    try {
      console.log('💾 Salvando dados no Firestore...');
      if (!db.collection) {
        console.error('❌ db.collection não é uma função');
        return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Firestore não está configurado corretamente', 500);
      }
      
      if (perfil === USER_PROFILES.PACIENTE) {
        await db.collection(COLLECTIONS.PACIENTES).doc(userRecord.uid).set(userData);
        console.log('✅ Dados salvos na collection pacientes');
      } else if (perfil === USER_PROFILES.PROFISSIONAL) {
        await db.collection(COLLECTIONS.PROFISSIONAIS).doc(userRecord.uid).set({
          ...userData,
          especialidade: null,
          idClinica: null, // Profissional autônomo
        });
        console.log('✅ Dados salvos na collection profissionais');
      }

      // Também salvar na collection users para facilitar busca
      await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(userData);
      console.log('✅ Dados salvos na collection users');
    } catch (error) {
      console.error('❌ Erro ao salvar no Firestore:', error);
      throw error;
    }

    // Gerar token
    let customToken;
    try {
      console.log('🎫 Gerando token customizado...');
      if (!auth.createCustomToken) {
        console.error('❌ auth.createCustomToken não é uma função');
        return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, 'Firebase Auth não está configurado corretamente', 500);
      }
      customToken = await auth.createCustomToken(userRecord.uid);
      console.log('✅ Token gerado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao gerar token:', error);
      throw error;
    }

    return successResponse(res, {
      token: customToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        nome,
        perfil,
      },
    }, SUCCESS_MESSAGES.REGISTER_SUCCESS, 201);
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, error.message, 500);
  }
};

/**
 * Verificar token e retornar dados do usuário
 */
export const verifyToken = async (req, res) => {
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, 'Usuário não encontrado', 404);
    }

    const userData = userDoc.data();

    return successResponse(res, {
      uid: req.user.uid,
      email: req.user.email,
      nome: userData.nome,
      perfil: userData.perfil || userData.profile,
    }, 'Token válido');
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, error.message, 500);
  }
};

