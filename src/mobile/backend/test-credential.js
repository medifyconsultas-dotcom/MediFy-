// Script para testar se a credencial do Firebase está funcionando
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function testCredential() {
  try {
    console.log('🧪 Testando credencial do Firebase...\n');
    
    // Limpar qualquer inicialização anterior
    if (admin.apps.length > 0) {
      for (const app of admin.apps) {
        await app.delete();
      }
    }
    
    // Obter e limpar credenciais
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY não está definida');
    }
    
    // Remover todas as aspas (simples e duplas) do início e fim
    privateKey = privateKey.trim();
    while (privateKey.length > 0 && (privateKey[0] === '"' || privateKey[0] === "'")) {
      privateKey = privateKey.slice(1);
    }
    while (privateKey.length > 0 && (privateKey[privateKey.length - 1] === '"' || privateKey[privateKey.length - 1] === "'")) {
      privateKey = privateKey.slice(0, -1);
    }
    privateKey = privateKey.trim();
    
    // Substituir \\n por \n
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '');
    
    // Limpar cada linha
    privateKey = privateKey.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    
    // Garantir que começa e termina corretamente
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
    }
    if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
      privateKey = privateKey + '\n-----END PRIVATE KEY-----';
    }
    
    let clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    if (clientEmail?.endsWith(',')) {
      clientEmail = clientEmail.slice(0, -1).trim();
    }
    
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    
    console.log('📋 Project ID:', projectId);
    console.log('📋 Client Email:', clientEmail);
    console.log('📋 Private Key length:', privateKey.length);
    console.log('📋 Private Key first 50 chars:', JSON.stringify(privateKey.substring(0, 50)));
    console.log('📋 Private Key last 50 chars:', JSON.stringify(privateKey.substring(privateKey.length - 50)));
    console.log('📋 Private Key starts with BEGIN:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
    console.log('📋 Private Key ends with END:', privateKey.endsWith('-----END PRIVATE KEY-----'));
    
    // Criar credencial
    const credential = admin.credential.cert({
      projectId: projectId,
      privateKey: privateKey,
      clientEmail: clientEmail,
    });
    
    console.log('\n✅ Credencial criada');
    
    // Inicializar Firebase
    admin.initializeApp({
      credential: credential,
    });
    
    console.log('✅ Firebase inicializado');
    
    // Testar se consegue obter um token (isso é o que está falhando)
    try {
      console.log('\n🔑 Testando obtenção de token...');
      const token = await credential.getAccessToken();
      console.log('✅ Token obtido com sucesso!');
      console.log('📋 Token (primeiros 50 chars):', token?.access_token?.substring(0, 50) || 'N/A');
    } catch (tokenError) {
      console.error('❌ Erro ao obter token:', tokenError.message);
      console.error('📝 Stack:', tokenError.stack);
      throw tokenError;
    }
    
    // Testar criar um usuário (isso também falha)
    try {
      console.log('\n👤 Testando criação de usuário...');
      const auth = admin.auth();
      const testEmail = `test-${Date.now()}@example.com`;
      const userRecord = await auth.createUser({
        email: testEmail,
        password: 'test123456',
        emailVerified: false,
      });
      console.log('✅ Usuário de teste criado:', userRecord.uid);
      
      // Limpar usuário de teste
      await auth.deleteUser(userRecord.uid);
      console.log('✅ Usuário de teste removido');
    } catch (userError) {
      console.error('❌ Erro ao criar usuário:', userError.message);
      console.error('📝 Stack:', userError.stack);
      throw userError;
    }
    
    console.log('\n🎉 Todos os testes passaram!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.message);
    console.error('📝 Stack:', error.stack);
    process.exit(1);
  }
}

testCredential();

