// Script para simular uma semana de dados no Firebase
// Execute: node scripts/seedData.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Helper para formatar data (simples, sem date-fns para não precisar instalar)
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

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Função para criar dados simulados
async function seedData() {
  console.log('🌱 Iniciando seed de dados...\n');

  try {
    // Buscar todos os usuários existentes
    const users = await auth.listUsers();
    const userMap = {};
    
    for (const user of users.users) {
      // Buscar o perfil de cada usuário
      const collections = ['pacientes', 'profissionais', 'clinicas', 'funcionarios'];
      for (const collection of collections) {
        try {
          const doc = await db.collection(collection).doc(user.uid).get();
          if (doc.exists) {
            const data = doc.data();
            userMap[data.perfil || data.cargo || collection] = {
              uid: user.uid,
              email: user.email,
              ...data
            };
            break;
          }
        } catch (e) {}
      }
    }

    console.log('📋 Usuários encontrados:', Object.keys(userMap));

    const clinica = userMap['clinica'];
    const recepcionista = userMap['recepcionista'];
    const medico = userMap['medico'];
    const enfermeiro = userMap['enfermeiro'];
    const profissional = userMap['profissional'];

    if (!clinica) {
      console.error('❌ Clínica não encontrada! Execute npm run init:firebase primeiro');
      process.exit(1);
    }

    // Criar pacientes se não existirem
    const pacientes = [];
    const nomesPacientes = [
      'Maria Silva', 'João Santos', 'Ana Costa', 'Carlos Oliveira',
      'Julia Ferreira', 'Pedro Alves', 'Fernanda Lima', 'Ricardo Souza',
      'Camila Rodrigues', 'Lucas Martins', 'Patricia Gomes', 'Roberto Dias',
      'Beatriz Ribeiro', 'Felipe Araujo', 'Larissa Castro'
    ];

    console.log('\n👥 Criando pacientes...');
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

      const pacienteRef = db.collection('pacientes').doc(`paciente-${i + 1}`);
      await pacienteRef.set({ ...pacienteData, id: pacienteRef.id });
      pacientes.push({ ...pacienteData, id: pacienteRef.id });
      console.log(`✅ Paciente criado: ${pacienteData.nome}`);
    }

    // Criar consultas - Uma semana de dados, 2 vezes por dia
    console.log('\n📅 Criando consultas (1 semana, ~2 por dia)...');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0, 0);

    const profissionaisDisponiveis = [];
    if (medico) profissionaisDisponiveis.push({ ...medico, nome: medico.nome || 'Dr. Carlos Oliveira' });
    if (enfermeiro) profissionaisDisponiveis.push({ ...enfermeiro, nome: enfermeiro.nome || 'Ana Costa' });
    if (profissional) profissionaisDisponiveis.push({ ...profissional, nome: profissional.nome || 'Dr. João Silva' });

    if (profissionaisDisponiveis.length === 0) {
      console.log('⚠️  Nenhum profissional encontrado, criando consultas genéricas...');
    }

    const statusOptions = ['agendada', 'confirmada', 'realizada', 'cancelada'];
    let consultaCount = 0;

    // 7 dias de dados
    for (let dia = 0; dia < 7; dia++) {
      const dataConsulta = new Date(hoje);
      dataConsulta.setDate(hoje.getDate() + dia);

      // 2 consultas por dia (manhã e tarde)
      const horarios = [9, 14]; // 9h e 14h

      for (const hora of horarios) {
        const profissional = profissionaisDisponiveis[Math.floor(Math.random() * profissionaisDisponiveis.length)] || 
          { uid: 'profissional-1', nome: 'Dr. Exemplo' };
        const paciente = pacientes[Math.floor(Math.random() * pacientes.length)];
        const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

        const dataConsultaCompleta = new Date(dataConsulta);
        dataConsultaCompleta.setHours(hora, Math.floor(Math.random() * 60), 0, 0);

        // Formatar data no padrão usado pelo Django: "YYYY-MM-DD HH:MM"
        const dataStr = formatDate(dataConsultaCompleta, 'yyyy-MM-dd');
        const horaStr = formatDate(dataConsultaCompleta, 'HH:mm');
        
        // Usar a mesma estrutura que o Django espera
        const consultaData = {
          id_paciente: paciente.id,
          nm_paciente: paciente.nome,
          id_profissional: profissional.uid,
          nm_profissional: profissional.nome,
          id_clinica: clinica.uid,
          nm_clinica: clinica.nome || clinica.nomeFantasia || 'Clínica Medify',
          data_consulta: `${dataStr} ${horaStr}`, // Formato usado pelo Django: "YYYY-MM-DD HH:MM"
          status: status.charAt(0).toUpperCase() + status.slice(1), // Capitalizado como Django espera
          tipo_atendimento: 'clinica',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          obs: status === 'realizada' ? 'Consulta realizada com sucesso' : 
               status === 'cancelada' ? 'Paciente cancelou' : 
               'Consulta agendada',
        };

        // Usar consultas_clinicas como o Django faz
        const consultaRef = db.collection('consultas_clinicas').doc();
        consultaData.id = consultaRef.id;
        await consultaRef.set(consultaData);
        
        // Também criar na coleção 'consultas' para compatibilidade com Electron
        const consultaRef2 = db.collection('consultas').doc();
        await consultaRef2.set({
          id: consultaRef2.id,
          idPaciente: paciente.id,
          nomePaciente: paciente.nome,
          idProfissional: profissional.uid,
          nomeProfissional: profissional.nome,
          idClinica: clinica.uid,
          dataConsulta: admin.firestore.Timestamp.fromDate(dataConsultaCompleta),
          status: status,
          observacoes: consultaData.obs,
          dataCriacao: admin.firestore.Timestamp.now(),
        });
        
        consultaCount++;
      }
    }

    console.log(`✅ ${consultaCount} consultas criadas`);

    // Criar prontuários - 2 por profissional (aproximadamente)
    console.log('\n📋 Criando prontuários...');
    let prontuarioCount = 0;

    for (const profissional of profissionaisDisponiveis) {
      // 2 prontuários por profissional
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
          dataNascimento: paciente.dataNascimento || null,
          telefone: paciente.telefone || '',
          cpf: paciente.cpf || '',
          idProfissional: profissional.uid,
          nomeProfissional: profissional.nome,
          observacoes: historico[historico.length - 1].observacao,
          historico: historico,
          idClinica: clinica.uid,
          dataRegistro: admin.firestore.Timestamp.fromDate(new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)),
          dataAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
        };

        const prontuarioRef = db.collection('prontuarios').doc();
        await prontuarioRef.set({ ...prontuarioData, id: prontuarioRef.id });
        prontuarioCount++;
      }
    }

    console.log(`✅ ${prontuarioCount} prontuários criados`);

    console.log('\n✨ Seed de dados concluído!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Resumo:`);
    console.log(`   👥 Pacientes: ${pacientes.length}`);
    console.log(`   📅 Consultas: ${consultaCount}`);
    console.log(`   📋 Prontuários: ${prontuarioCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro ao criar dados:', error);
  } finally {
    process.exit(0);
  }
}

// Executar
if (require.main === module) {
  seedData();
}

module.exports = { seedData };

