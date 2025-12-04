// Script para LIMPAR todos os dados do Firebase
// CUIDADO: Isso apaga TUDO!
// Execute: node scripts/clearFirebase.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Função para limpar coleção
async function clearCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`🗑️  Coleção ${collectionName} limpa: ${snapshot.size} documentos removidos`);
    return snapshot.size;
  } catch (error) {
    console.error(`❌ Erro ao limpar coleção ${collectionName}:`, error.message);
    return 0;
  }
}

// Função para deletar todos os usuários do Auth
async function clearAllUsers() {
  try {
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;
    
    console.log(`\n🗑️  Deletando ${users.length} usuários do Auth...`);
    
    for (const user of users) {
      await auth.deleteUser(user.uid);
    }
    
    console.log(`✅ ${users.length} usuários deletados do Auth`);
    return users.length;
  } catch (error) {
    console.error('❌ Erro ao limpar usuários:', error.message);
    return 0;
  }
}

// Função principal
async function clearAllFirebase() {
  console.log('⚠️  ATENÇÃO: Este script vai DELETAR TODOS OS DADOS do Firebase!');
  console.log('📋 Coleções que serão limpas: pacientes, profissionais, clinicas, funcionarios, consultas, prontuarios');
  console.log('👤 Todos os usuários do Auth também serão deletados!\n');

  try {
    // Limpar coleções
    const collections = ['pacientes', 'profissionais', 'clinicas', 'funcionarios', 'consultas', 'prontuarios'];
    let totalDeleted = 0;

    console.log('🗑️  Limpando coleções...\n');
    for (const collection of collections) {
      const deleted = await clearCollection(collection);
      totalDeleted += deleted;
    }

    // Limpar usuários do Auth
    console.log('\n🗑️  Limpando usuários do Auth...');
    const usersDeleted = await clearAllUsers();

    console.log('\n✅ Limpeza concluída!');
    console.log(`📊 Total de documentos removidos: ${totalDeleted}`);
    console.log(`👤 Total de usuários removidos: ${usersDeleted}`);
    console.log('\n✨ Firebase está limpo e pronto para novos dados!\n');

  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  } finally {
    process.exit(0);
  }
}

// Executar
if (require.main === module) {
  clearAllFirebase();
}

module.exports = { clearAllFirebase };

