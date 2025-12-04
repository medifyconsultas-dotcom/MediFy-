import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obter diretório atual para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env do diretório correto
dotenv.config({ path: join(__dirname, '../../.env') });

let db, auth;

// Verificar se Firebase Admin SDK já foi inicializado
if (!admin.apps.length) {
  // Verificar se temos credenciais do Firebase
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error('❌ Firebase Admin SDK não configurado!');
    console.error('📝 Crie um arquivo .env em src/mobile/backend/ com as credenciais do Firebase');
    console.error('📖 Veja SETUP-MOBILE.md para instruções detalhadas');
    
    // Em modo de desenvolvimento, usar mock para evitar crash
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Usando mock do Firebase (funcionalidade limitada)');
      db = {
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null }),
            set: async () => ({}),
            update: async () => ({}),
            ref: { update: async () => ({}) },
          }),
          add: async () => ({ id: 'mock-id' }),
          where: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({ get: async () => ({ docs: [], size: 0, empty: true }) }),
                get: async () => ({ docs: [], size: 0, empty: true }),
              }),
              limit: () => ({ get: async () => ({ docs: [], size: 0, empty: true }) }),
              get: async () => ({ docs: [], size: 0, empty: true }),
            }),
            orderBy: () => ({
              limit: () => ({ get: async () => ({ docs: [], size: 0, empty: true }) }),
              get: async () => ({ docs: [], size: 0, empty: true }),
            }),
            limit: () => ({ get: async () => ({ docs: [], size: 0, empty: true }) }),
            get: async () => ({ docs: [], size: 0, empty: true }),
          }),
          get: async () => ({ docs: [], size: 0, empty: true }),
        }),
      };

      auth = {
        getUserByEmail: async (email) => {
          throw new Error('Firebase não configurado. Configure o arquivo .env');
        },
        createUser: async (userData) => {
          throw new Error('Firebase não configurado. Configure o arquivo .env');
        },
        verifyIdToken: async () => {
          throw new Error('Firebase não configurado. Configure o arquivo .env');
        },
        createCustomToken: async (uid) => {
          throw new Error('Firebase não configurado. Configure o arquivo .env');
        },
      };
    } else {
      throw new Error('Firebase Admin SDK não configurado. Configure o arquivo .env');
    }
  } else {
    // Inicializar Firebase Admin SDK com credenciais
    try {
      // Verificar e limpar a chave privada
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (!privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY não está definida no .env');
      }
      
      // Remover todas as aspas (simples e duplas) do início e fim
      privateKey = privateKey.trim();
      while (privateKey.length > 0 && (privateKey[0] === '"' || privateKey[0] === "'")) {
        privateKey = privateKey.slice(1).trim();
      }
      while (privateKey.length > 0 && (privateKey[privateKey.length - 1] === '"' || privateKey[privateKey.length - 1] === "'" || privateKey[privateKey.length - 1] === ',')) {
        privateKey = privateKey.slice(0, -1).trim();
      }
      
      // Substituir \\n por \n
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '');
      
      // Limpar cada linha e remover linhas vazias e linhas com apenas aspas/vírgulas
      const lines = privateKey.split('\n').map(line => line.trim()).filter(line => {
        const cleaned = line.replace(/["',]/g, '').trim();
        return cleaned.length > 0;
      });
      
      // Reconstruir a chave, garantindo que começa e termina corretamente
      privateKey = lines.join('\n');
      
      // Garantir que começa com BEGIN
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
      } else {
        // Remover tudo antes do BEGIN
        const beginIndex = privateKey.indexOf('-----BEGIN PRIVATE KEY-----');
        privateKey = privateKey.substring(beginIndex);
      }
      
      // Garantir que termina com END (encontrar a última ocorrência)
      if (!privateKey.includes('-----END PRIVATE KEY-----')) {
        privateKey = privateKey + '\n-----END PRIVATE KEY-----';
      } else {
        // Encontrar a última ocorrência de END
        const lastEndIndex = privateKey.lastIndexOf('-----END PRIVATE KEY-----');
        if (lastEndIndex >= 0) {
          privateKey = privateKey.substring(0, lastEndIndex + '-----END PRIVATE KEY-----'.length);
        }
      }
      
      // Limpar novamente e remover qualquer caractere estranho no final
      privateKey = privateKey.trim();
      // Remover qualquer aspa, vírgula ou quebra de linha extra no final
      while (privateKey.length > 0 && 
             (privateKey[privateKey.length - 1] === '"' || 
              privateKey[privateKey.length - 1] === "'" || 
              privateKey[privateKey.length - 1] === ',' ||
              privateKey[privateKey.length - 1] === '\n')) {
        privateKey = privateKey.slice(0, -1).trim();
      }
      
      // Garantir que termina com END PRIVATE KEY
      if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
        privateKey = privateKey + '\n-----END PRIVATE KEY-----';
      }
      
      // Verificar se a chave começa e termina corretamente
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        console.error('⚠️ A chave privada pode estar mal formatada');
        console.error('⚠️ Deve começar com -----BEGIN PRIVATE KEY-----');
        console.error('⚠️ E terminar com -----END PRIVATE KEY-----');
        throw new Error('Chave privada mal formatada');
      }
      
      // Verificar se a chave tem o formato correto (deve ter pelo menos 1000 caracteres)
      if (privateKey.length < 1000) {
        console.error('⚠️ Chave privada muito curta:', privateKey.length);
        throw new Error('Chave privada parece estar incompleta');
      }
      
      // Limpar e validar o client email (remover vírgulas e espaços extras)
      let clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
      if (clientEmail?.endsWith(',')) {
        clientEmail = clientEmail.slice(0, -1).trim();
        console.warn('⚠️ Vírgula removida do Client Email');
      }
      
      // Limpar e validar o project ID
      const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
      
      console.log('🔧 Inicializando Firebase Admin SDK...');
      console.log('📋 Project ID:', projectId);
      console.log('📋 Client Email:', clientEmail);
      console.log('📋 Private Key length:', privateKey.length);
      console.log('📋 Private Key starts with BEGIN:', privateKey.includes('BEGIN PRIVATE KEY'));
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Credenciais do Firebase incompletas. Verifique o arquivo .env');
      }
      
      // Criar credencial diretamente (formato simplificado que o Firebase Admin SDK aceita)
      let credential;
      try {
        // Validar formato da chave privada antes de criar a credencial
        const keyLines = privateKey.split('\n');
        if (keyLines.length < 3) {
          throw new Error('Chave privada parece estar mal formatada. Deve ter múltiplas linhas.');
        }
        
        // Usar apenas os campos essenciais (formato que o Firebase Admin SDK espera)
        const certConfig = {
          projectId: projectId,
          privateKey: privateKey,
          clientEmail: clientEmail,
        };
        
        console.log('🔑 Criando credencial com:', {
          projectId: certConfig.projectId,
          clientEmail: certConfig.clientEmail,
          privateKeyLength: certConfig.privateKey.length,
          privateKeyFirstLine: certConfig.privateKey.split('\n')[0],
          privateKeyLastLine: certConfig.privateKey.split('\n').slice(-1)[0],
        });
        
        credential = admin.credential.cert(certConfig);
        
        // Verificar se a credencial foi criada corretamente
        if (!credential) {
          throw new Error('Falha ao criar credencial do Firebase');
        }
        
        console.log('✅ Credencial criada com sucesso');
      } catch (credError) {
        console.error('❌ Erro ao criar credencial:', credError.message);
        console.error('📝 Stack:', credError.stack);
        console.error('📝 Verifique se a chave privada está no formato correto');
        throw new Error(`Erro ao criar credencial do Firebase: ${credError.message}`);
      }
      
      // Inicializar Firebase Admin SDK
      try {
        // Limpar qualquer inicialização anterior (se houver)
        if (admin.apps.length > 0) {
          console.log('⚠️ Firebase já estava inicializado, limpando...');
          admin.apps.forEach(app => {
            try {
              app.delete();
            } catch (deleteError) {
              // Ignorar erros ao deletar
            }
          });
        }
        
        // Inicializar com a credencial
        admin.initializeApp({
          credential: credential,
        });
        console.log('✅ Firebase Admin SDK inicializado com sucesso');
        
        // Testar se auth e db funcionam
        db = admin.firestore();
        auth = admin.auth();
        
        // Verificar se auth tem os métodos necessários
        if (!auth || typeof auth.createUser !== 'function') {
          throw new Error('Firebase Auth não está configurado corretamente');
        }
        
        console.log('✅ Firebase Auth verificado');
        console.log('✅ Firestore verificado');
      } catch (initError) {
        console.error('❌ Erro ao inicializar Firebase Admin SDK:', initError.message);
        console.error('📝 Stack:', initError.stack);
        throw initError;
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase Admin SDK:', error.message);
      console.error('📝 Stack:', error.stack);
      console.error('📝 Verifique se as credenciais no arquivo .env estão corretas');
      console.error('📝 Certifique-se de que:');
      console.error('   - FIREBASE_PRIVATE_KEY está entre aspas duplas');
      console.error('   - A chave privada contém \\n para quebras de linha');
      console.error('   - A chave começa com -----BEGIN PRIVATE KEY-----');
      throw error;
    }
  }
} else {
  // Firebase já inicializado
  db = admin.firestore();
  auth = admin.auth();
}

// Garantir que db e auth não sejam undefined
if (!db || !auth) {
  console.error('❌ db ou auth são undefined!');
  console.error('db:', typeof db, db);
  console.error('auth:', typeof auth, auth);
  throw new Error('Firebase Admin SDK não foi inicializado corretamente');
}

console.log('✅ Firebase configurado - db:', typeof db, 'auth:', typeof auth);
console.log('✅ auth.createUser:', typeof auth.createUser);
console.log('✅ db.collection:', typeof db.collection);

export { db, auth };
export default admin;
