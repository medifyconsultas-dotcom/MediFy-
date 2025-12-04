// Script para verificar se a chave de serviço está correta
// Execute: node scripts/verifyServiceAccount.js

const serviceAccount = require('../serviceAccountKey.json');
const expectedProjectId = 'medify-401a8';

console.log('🔍 Verificando chave de serviço...\n');

// Verificar project_id
if (serviceAccount.project_id !== expectedProjectId) {
  console.error('❌ ERRO: project_id incorreto!');
  console.error(`   Esperado: ${expectedProjectId}`);
  console.error(`   Encontrado: ${serviceAccount.project_id}`);
  console.error('\n💡 A chave de serviço é de outro projeto.');
  console.error('   Gere uma nova chave para o projeto medify-401a8\n');
  process.exit(1);
}

console.log(`✅ project_id correto: ${serviceAccount.project_id}`);

// Verificar client_email
if (!serviceAccount.client_email || !serviceAccount.client_email.includes(expectedProjectId)) {
  console.error('❌ ERRO: client_email incorreto!');
  console.error(`   Esperado: @${expectedProjectId}.iam.gserviceaccount.com`);
  console.error(`   Encontrado: ${serviceAccount.client_email || 'não encontrado'}`);
  process.exit(1);
}

console.log(`✅ client_email correto: ${serviceAccount.client_email}`);

// Verificar campos obrigatórios
const requiredFields = ['private_key', 'client_id', 'auth_uri', 'token_uri'];
let allFieldsPresent = true;

for (const field of requiredFields) {
  if (!serviceAccount[field]) {
    console.error(`❌ Campo obrigatório ausente: ${field}`);
    allFieldsPresent = false;
  }
}

if (!allFieldsPresent) {
  console.error('\n💡 A chave de serviço está incompleta.');
  console.error('   Gere uma nova chave no Console do Firebase\n');
  process.exit(1);
}

console.log('✅ Todos os campos obrigatórios presentes');

// Tentar inicializar o Firebase Admin
try {
  const admin = require('firebase-admin');
  
  // Se já foi inicializado, deletar a instância
  try {
    admin.app().delete();
  } catch (e) {
    // Ignorar se não existir
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin inicializado com sucesso!');
  console.log('\n🎉 A chave de serviço está válida e pronta para uso!');
  console.log('\n💡 Você pode executar: npm run reset:firebase\n');
  
  // Limpar instância
  admin.app().delete();
  process.exit(0);
} catch (error) {
  console.error('\n❌ ERRO ao inicializar Firebase Admin:');
  console.error(`   ${error.message}\n`);
  
  if (error.code === 'app/invalid-credential') {
    console.error('💡 A chave de serviço foi revogada ou está inválida.');
    console.error('   Gere uma nova chave no Console do Firebase:\n');
    console.error('   https://console.firebase.google.com/project/medify-401a8/settings/serviceaccounts/adminsdk\n');
  }
  
  process.exit(1);
}

