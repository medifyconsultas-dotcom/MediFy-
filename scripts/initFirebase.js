// Script para inicializar dados de exemplo no Firebase
// Execute: node scripts/initFirebase.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Função para criar usuário e perfil
async function createUserWithProfile(email, password, profileData, collectionName) {
  try {
    // Criar usuário no Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true,
    });

    console.log(`✅ Usuário criado: ${email} (UID: ${userRecord.uid})`);

    // Criar documento no Firestore
    const userDoc = {
      ...profileData,
      id: userRecord.uid,
      email: email,
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(collectionName).doc(userRecord.uid).set(userDoc);
    console.log(`✅ Perfil criado na coleção: ${collectionName}`);

    return userRecord.uid;
  } catch (error) {
    console.error(`❌ Erro ao criar usuário ${email}:`, error.message);
    throw error;
  }
}

// Função para limpar coleções (CUIDADO: Isso apaga TUDO!)
async function clearCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`🗑️  Coleção ${collectionName} limpa: ${snapshot.size} documentos removidos`);
  } catch (error) {
    console.error(`❌ Erro ao limpar coleção ${collectionName}:`, error.message);
  }
}

// Função principal
async function initializeFirebase() {
  console.log('🚀 Inicializando Firebase...\n');

  try {
    // IMPORTANTE: Descomente a linha abaixo para LIMPAR TUDO primeiro
    // await clearAllCollections();

    // Criar Clínica de exemplo
    const clinicaId = await createUserWithProfile(
      'clinica@medify.com',
      '123456',
      {
        nome: 'Clínica Medify',
        nomeFantasia: 'Clínica Medify Exemplo',
        cnpj: '12.345.678/0001-90',
        telefone: '(11) 98765-4321',
        endereco: 'Rua Exemplo, 123 - São Paulo, SP',
        perfil: 'clinica',
      },
      'clinicas'
    );

    // Criar Profissional de exemplo
    const profissionalId = await createUserWithProfile(
      'profissional@medify.com',
      '123456',
      {
        nome: 'Dr. João Silva',
        especialidade: 'Cardiologia',
        crm: 'CRM 123456',
        cpfCnpj: '123.456.789-00',
        telefone: '(11) 98765-4321',
        idClinica: null, // Profissional independente
        perfil: 'profissional',
      },
      'profissionais'
    );

    // Criar Recepcionista
    const recepcionistaId = await createUserWithProfile(
      'recepcionista@medify.com',
      '123456',
      {
        nome: 'Maria Santos',
        telefone: '(11) 98765-4321',
        cargo: 'recepcionista',
        perfil: 'recepcionista',
        idClinica: clinicaId,
      },
      'funcionarios'
    );

    // Criar Médico
    const medicoId = await createUserWithProfile(
      'medico@medify.com',
      '123456',
      {
        nome: 'Dr. Carlos Oliveira',
        especialidade: 'Pediatria',
        crm: 'CRM 789012',
        telefone: '(11) 98765-4321',
        cargo: 'medico',
        perfil: 'medico',
        idClinica: clinicaId,
      },
      'funcionarios'
    );

    // Criar Enfermeiro
    const enfermeiroId = await createUserWithProfile(
      'enfermeiro@medify.com',
      '123456',
      {
        nome: 'Ana Costa',
        telefone: '(11) 98765-4321',
        cargo: 'enfermeiro',
        perfil: 'enfermeiro',
        idClinica: clinicaId,
      },
      'funcionarios'
    );

    // Criar Paciente de exemplo
    await db.collection('pacientes').doc('paciente-exemplo-1').set({
      id: 'paciente-exemplo-1',
      nome: 'José da Silva',
      email: 'jose@example.com',
      dataNascimento: admin.firestore.Timestamp.fromDate(new Date('1980-01-15')),
      telefone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      endereco: 'Rua Exemplo, 456 - São Paulo, SP',
      plano: 'Unimed',
      perfil: 'paciente',
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Paciente criado: José da Silva');

    // Criar Consulta de exemplo
    await db.collection('consultas').doc('consulta-exemplo-1').set({
      id: 'consulta-exemplo-1',
      idPaciente: 'paciente-exemplo-1',
      nomePaciente: 'José da Silva',
      idProfissional: profissionalId,
      nomeProfissional: 'Dr. João Silva',
      idClinica: clinicaId,
      dataConsulta: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // Amanhã
      status: 'agendada',
      observacoes: 'Consulta de rotina',
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Consulta criada');

    console.log('\n✨ Inicialização concluída!\n');
    console.log('📋 USUÁRIOS CRIADOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Clínica:');
    console.log('  Email: clinica@medify.com');
    console.log('  Senha: 123456\n');
    
    console.log('Profissional:');
    console.log('  Email: profissional@medify.com');
    console.log('  Senha: 123456\n');
    
    console.log('Recepcionista:');
    console.log('  Email: recepcionista@medify.com');
    console.log('  Senha: 123456\n');
    
    console.log('Médico:');
    console.log('  Email: medico@medify.com');
    console.log('  Senha: 123456\n');
    
    console.log('Enfermeiro:');
    console.log('  Email: enfermeiro@medify.com');
    console.log('  Senha: 123456\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
  } finally {
    process.exit(0);
  }
}

// Função para limpar TODAS as coleções
async function clearAllCollections() {
  console.log('⚠️  ATENÇÃO: Limpando todas as coleções...\n');
  
  const collections = ['pacientes', 'profissionais', 'clinicas', 'funcionarios', 'consultas', 'prontuarios'];
  
  for (const collection of collections) {
    await clearCollection(collection);
  }
  
  console.log('\n✅ Todas as coleções foram limpas!\n');
}

// Executar
if (require.main === module) {
  // Descomente a linha abaixo para limpar tudo antes de criar
  // clearAllCollections().then(() => initializeFirebase());
  
  initializeFirebase();
}

module.exports = { initializeFirebase, clearAllCollections };

