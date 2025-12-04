// Script para verificar se o Firebase está configurado corretamente
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 Verificando configuração do Firebase...\n');

// Verificar variáveis de ambiente
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

let allConfigured = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === 'your-project-id' || value === 'your-private-key' || value === 'your-client-email') {
    console.log(`❌ ${varName}: NÃO CONFIGURADO`);
    allConfigured = false;
  } else {
    const displayValue = varName === 'FIREBASE_PRIVATE_KEY' 
      ? value.substring(0, 20) + '...' 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n' + '='.repeat(50));

if (!allConfigured) {
  console.log('\n❌ Firebase não está configurado corretamente!');
  console.log('\n📝 Para configurar:');
  console.log('1. Crie um arquivo .env em src/mobile/backend/');
  console.log('2. Copie o conteúdo de env.example');
  console.log('3. Preencha com suas credenciais do Firebase');
  console.log('4. Veja SETUP-MOBILE.md para instruções detalhadas\n');
  process.exit(1);
} else {
  console.log('\n✅ Todas as variáveis de ambiente estão configuradas!');
  console.log('\n🧪 Testando inicialização do Firebase Admin SDK...\n');
  
  try {
    const admin = await import('firebase-admin');
    
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    
    const db = admin.default.firestore();
    const auth = admin.default.auth();
    
    console.log('✅ Firebase Admin SDK inicializado com sucesso!');
    console.log('✅ Firestore conectado');
    console.log('✅ Auth conectado');
    console.log('\n🎉 Tudo pronto! Você pode iniciar o servidor com: npm run dev\n');
  } catch (error) {
    console.error('\n❌ Erro ao inicializar Firebase Admin SDK:');
    console.error(error.message);
    console.error('\n💡 Verifique se:');
    console.error('   - As credenciais estão corretas');
    console.error('   - A chave privada está completa (com \\n)');
    console.error('   - O arquivo .env está no formato correto\n');
    process.exit(1);
  }
}

