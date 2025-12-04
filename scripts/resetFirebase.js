// Script para resetar completamente o Firebase (limpar tudo e criar usuários de exemplo)
// Execute: node scripts/resetFirebase.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Variáveis globais
let db, auth;

// Função para inicializar Firebase Admin
async function initializeFirebase() {
  // Limpar instâncias anteriores se existirem
  try {
    const apps = admin.apps;
    for (const app of apps) {
      await app.delete();
    }
  } catch (e) {
    // Ignorar se não houver instância anterior
  }

  // Inicializar com nova instância
  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    db = app.firestore();
    auth = app.auth();
    
    console.log('✅ Firebase Admin inicializado com sucesso\n');
  } catch (error) {
    if (error.code === 'app/duplicate-app') {
      const app = admin.app();
      db = app.firestore();
      auth = app.auth();
      console.log('✅ Usando instância existente do Firebase Admin\n');
    } else {
      console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
      console.error('\n💡 A chave de serviço pode estar inválida ou revogada.');
      console.error('   Gere uma nova chave em: https://console.firebase.google.com/project/medify-401a8/settings/serviceaccounts/adminsdk\n');
      throw error;
    }
  }
}

// Função para limpar todos os usuários do Auth
async function clearAllUsers() {
  try {
    console.log('🗑️  Limpando usuários do Firebase Auth...');
    const users = await auth.listUsers(1000);
    const uids = users.users.map(user => user.uid);
    
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      console.log(`✅ ${uids.length} usuários removidos do Auth`);
    } else {
      console.log('ℹ️  Nenhum usuário encontrado no Auth');
    }
  } catch (error) {
    console.error('❌ Erro ao limpar usuários do Auth:', error.message);
    throw error;
  }
}

// Função para limpar uma coleção do Firestore
async function clearCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`ℹ️  Coleção ${collectionName} já está vazia`);
      return 0;
    }

    const batch = db.batch();
    let count = 0;
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    console.log(`✅ Coleção ${collectionName} limpa: ${count} documentos removidos`);
    return count;
  } catch (error) {
    console.error(`❌ Erro ao limpar coleção ${collectionName}:`, error.message);
    return 0;
  }
}

// Função para limpar subcoleções
async function clearSubcollections(parentCollection, subCollection) {
  try {
    const parentDocs = await db.collection(parentCollection).get();
    let totalCount = 0;

    for (const parentDoc of parentDocs.docs) {
      const subSnapshot = await db
        .collection(parentCollection)
        .doc(parentDoc.id)
        .collection(subCollection)
        .get();

      if (!subSnapshot.empty) {
        const batch = db.batch();
        subSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          totalCount++;
        });
        await batch.commit();
      }
    }

    if (totalCount > 0) {
      console.log(`✅ Subcoleção ${parentCollection}/${subCollection} limpa: ${totalCount} documentos removidos`);
    }
    return totalCount;
  } catch (error) {
    console.error(`❌ Erro ao limpar subcoleção ${parentCollection}/${subCollection}:`, error.message);
    return 0;
  }
}

// Função para limpar todas as coleções principais
async function clearAllCollections() {
  console.log('\n🧹 Limpando todas as coleções do Firestore...\n');
  
  const collections = [
    'pacientes',
    'profissionais',
    'clinicas',
    'funcionarios',
    'admins',
    'consultas',
    'consultas_clinicas',
    'consultas_autonomos',
    'prontuarios'
  ];

  let totalRemoved = 0;
  
  for (const collectionName of collections) {
    const count = await clearCollection(collectionName);
    totalRemoved += count;
  }

  // Limpar subcoleções
  console.log('\n🧹 Limpando subcoleções...\n');
  await clearSubcollections('pacientes', 'consultas');
  await clearSubcollections('pacientes', 'prontuarios');
  await clearSubcollections('profissionais', 'consultas');
  await clearSubcollections('profissionais', 'horarios');
  await clearSubcollections('clinicas', 'funcionarios');

  console.log(`\n✅ Total de documentos removidos: ${totalRemoved}`);
}

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

// Função para criar usuários de exemplo
async function createExampleUsers() {
  console.log('\n👥 Criando usuários de exemplo...\n');

  try {
    // Criar Clínica
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

    // Criar Profissional
    const profissionalId = await createUserWithProfile(
      'profissional@medify.com',
      '123456',
      {
        nome: 'Dr. João Silva',
        especialidade: 'Cardiologia',
        crm: 'CRM 123456',
        cpfCnpj: '123.456.789-00',
        telefone: '(11) 98765-4321',
        idClinica: null,
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
        especialidade: 'Enfermagem Geral',
        telefone: '(11) 98765-4321',
        cargo: 'enfermeiro',
        perfil: 'enfermeiro',
        idClinica: clinicaId,
      },
      'funcionarios'
    );

    console.log('\n✅ Todos os usuários de exemplo criados com sucesso!');
    console.log('\n📝 Credenciais de login:');
    console.log('   - Clínica: clinica@medify.com / 123456');
    console.log('   - Profissional: profissional@medify.com / 123456');
    console.log('   - Recepcionista: recepcionista@medify.com / 123456');
    console.log('   - Médico: medico@medify.com / 123456');
    console.log('   - Enfermeiro: enfermeiro@medify.com / 123456\n');

    return { clinicaId, profissionalId, recepcionistaId, medicoId, enfermeiroId };
  } catch (error) {
    console.error('❌ Erro ao criar usuários de exemplo:', error.message);
    throw error;
  }
}

// Função para criar dados simulados completos
async function createSeedData(userIds) {
  console.log('\n🌱 Criando dados simulados completos...\n');
  
  const { clinicaId, profissionalId, recepcionistaId, medicoId, enfermeiroId } = userIds;
  
  try {
    // Criar pacientes
    const pacientes = [];
    const nomesPacientes = [
      'Maria Silva', 'João Santos', 'Ana Costa', 'Carlos Oliveira',
      'Julia Ferreira', 'Pedro Alves', 'Fernanda Lima', 'Ricardo Souza',
      'Camila Rodrigues', 'Lucas Martins', 'Patricia Gomes', 'Roberto Dias',
      'Beatriz Ribeiro', 'Felipe Araujo', 'Larissa Castro'
    ];

    console.log('👥 Criando 15 pacientes...');
    for (let i = 0; i < 15; i++) {
      const pacienteData = {
        nome: nomesPacientes[i],
        email: `paciente${i + 1}@example.com`,
        dataNascimento: admin.firestore.Timestamp.fromDate(new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)),
        telefone: `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
        cpf: `${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}`,
        endereco: `Rua ${i + 1}, ${Math.floor(Math.random() * 1000)} - São Paulo, SP`,
        plano: ['Unimed', 'Amil', 'Bradesco Saúde', 'SulAmérica'][Math.floor(Math.random() * 4)],
        perfil: 'paciente',
        dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
      };

      const pacienteRef = db.collection('pacientes').doc();
      await pacienteRef.set({ ...pacienteData, id: pacienteRef.id });
      pacientes.push({ ...pacienteData, id: pacienteRef.id });
    }
    console.log(`✅ ${pacientes.length} pacientes criados`);

    // Criar consultas (7 dias, 2 por dia)
    console.log('\n📅 Criando consultas (1 semana, ~2 por dia)...');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const profissionaisDisponiveis = [];
    if (medicoId) profissionaisDisponiveis.push({ uid: medicoId, nome: 'Dr. Carlos Oliveira' });
    if (enfermeiroId) profissionaisDisponiveis.push({ uid: enfermeiroId, nome: 'Ana Costa' });
    if (profissionalId) profissionaisDisponiveis.push({ uid: profissionalId, nome: 'Dr. João Silva' });
    
    const statusOptions = ['Agendada', 'Confirmada', 'Realizada', 'Cancelada'];
    let consultaCount = 0;

    // 7 dias de dados
    for (let dia = 0; dia < 7; dia++) {
      const dataConsulta = new Date(hoje);
      dataConsulta.setDate(hoje.getDate() + dia);
      
      const horarios = [9, 14]; // 9h e 14h

      for (const hora of horarios) {
        if (profissionaisDisponiveis.length === 0) break;
        
        const profissional = profissionaisDisponiveis[Math.floor(Math.random() * profissionaisDisponiveis.length)];
        const paciente = pacientes[Math.floor(Math.random() * pacientes.length)];
        const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

        const dataConsultaCompleta = new Date(dataConsulta);
        dataConsultaCompleta.setHours(hora, Math.floor(Math.random() * 60), 0, 0);

        const dataStr = formatDate(dataConsultaCompleta, 'yyyy-MM-dd');
        const horaStr = formatDate(dataConsultaCompleta, 'HH:mm');
        
        const consultaData = {
          id_paciente: paciente.id,
          nm_paciente: paciente.nome,
          id_profissional: profissional.uid,
          nm_profissional: profissional.nome,
          id_clinica: clinicaId,
          nm_clinica: 'Clínica Medify',
          data_consulta: `${dataStr} ${horaStr}`,
          status: status,
          tipo_atendimento: 'clinica',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          obs: status === 'Realizada' ? 'Consulta realizada com sucesso' : 
               status === 'Cancelada' ? 'Paciente cancelou' : 
               'Consulta agendada',
        };

        // Criar em consultas_clinicas (Django)
        const consultaRef = db.collection('consultas_clinicas').doc();
        consultaData.id = consultaRef.id;
        await consultaRef.set(consultaData);
        
        // Também criar em consultas (Electron)
        const consultaRef2 = db.collection('consultas').doc();
        await consultaRef2.set({
          id: consultaRef2.id,
          idPaciente: paciente.id,
          nomePaciente: paciente.nome,
          idProfissional: profissional.uid,
          nomeProfissional: profissional.nome,
          idClinica: clinicaId,
          dataConsulta: admin.firestore.Timestamp.fromDate(dataConsultaCompleta),
          status: status.toLowerCase(),
          observacoes: consultaData.obs,
          dataCriacao: admin.firestore.Timestamp.now(),
        });
        
        consultaCount++;
      }
    }
    console.log(`✅ ${consultaCount} consultas criadas`);

    // Criar prontuários (2 por profissional)
    console.log('\n📋 Criando prontuários...');
    let prontuarioCount = 0;

    for (const profissional of profissionaisDisponiveis) {
      for (let i = 0; i < 2 && i < pacientes.length; i++) {
        const paciente = pacientes[i * 2];
        if (!paciente) continue;

        const historico = [];
        for (let j = 0; j < 2; j++) {
          const dataHistorico = new Date();
          dataHistorico.setDate(dataHistorico.getDate() - Math.floor(Math.random() * 30));
          
          historico.push({
            data: admin.firestore.Timestamp.fromDate(dataHistorico),
            profissional: profissional.nome,
            observacao: `Observação ${j + 1}: Paciente em acompanhamento regular. Evolução satisfatória.`
          });
        }

        const prontuarioData = {
          idPaciente: paciente.id,
          nomePaciente: paciente.nome,
          dataNascimento: paciente.dataNascimento,
          telefone: paciente.telefone,
          cpf: paciente.cpf,
          idProfissional: profissional.uid,
          nomeProfissional: profissional.nome,
          idClinica: clinicaId,
          observacoes: 'Prontuário inicial criado automaticamente.',
          historico: historico,
          dataRegistro: admin.firestore.Timestamp.now(),
          dataAtualizacao: admin.firestore.Timestamp.now(),
        };

        const prontuarioRef = db.collection('prontuarios').doc();
        prontuarioData.id = prontuarioRef.id;
        await prontuarioRef.set(prontuarioData);
        prontuarioCount++;
      }
    }
    console.log(`✅ ${prontuarioCount} prontuários criados`);

    console.log('\n🎉 Dados simulados criados com sucesso!');
    console.log(`   - ${pacientes.length} pacientes`);
    console.log(`   - ${consultaCount} consultas`);
    console.log(`   - ${prontuarioCount} prontuários\n`);

  } catch (error) {
    console.error('❌ Erro ao criar dados simulados:', error.message);
    throw error;
  }
}

// Helper para formatar data
function formatDate(date, formatStr) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return formatStr
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes);
}

// Função principal
async function resetFirebase() {
  console.log('🔄 Iniciando reset completo do Firebase...\n');
  console.log('⚠️  ATENÇÃO: Isso vai apagar TODOS os dados!\n');

  try {
    // 0. Inicializar Firebase Admin
    await initializeFirebase();

    // 1. Limpar todos os usuários do Auth
    await clearAllUsers();

    // 2. Limpar todas as coleções do Firestore
    await clearAllCollections();

    // 3. Criar usuários de exemplo
    const userIds = await createExampleUsers();

    // 4. Criar dados simulados completos
    await createSeedData(userIds);

    console.log('\n🎉 Reset completo realizado com sucesso!');
    console.log('\n✨ O Firebase está limpo e pronto para uso com usuários e dados de exemplo.\n');
    console.log('📝 Credenciais de login:');
    console.log('   - Clínica: clinica@medify.com / 123456');
    console.log('   - Profissional: profissional@medify.com / 123456');
    console.log('   - Recepcionista: recepcionista@medify.com / 123456');
    console.log('   - Médico: medico@medify.com / 123456');
    console.log('   - Enfermeiro: enfermeiro@medify.com / 123456\n');
  } catch (error) {
    console.error('\n❌ Erro durante o reset:', error.message);
    
    if (error.code === 'app/invalid-credential' || error.message.includes('invalid_grant')) {
      console.error('\n💡 A chave de serviço foi revogada ou está inválida.');
      console.error('   Gere uma nova chave em:');
      console.error('   https://console.firebase.google.com/project/medify-401a8/settings/serviceaccounts/adminsdk\n');
    } else {
      console.error('\n💡 Dica: Verifique se a chave de serviço (serviceAccountKey.json) está correta.');
    }
    
    process.exit(1);
  } finally {
    // Limpar instância ao finalizar
    try {
      if (admin.apps.length > 0) {
        await admin.app().delete();
      }
    } catch (e) {
      // Ignorar erros ao limpar
    }
  }
}

// Executar o reset
resetFirebase()
  .then(() => {
    console.log('✅ Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

