import { db } from '../config/firebase.js';
import { COLLECTIONS, CONSULTA_STATUS } from '../config/constants.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import admin from 'firebase-admin';
const { Timestamp } = admin.firestore;

/**
 * Dashboard do paciente
 */
export const getDashboard = async (req, res) => {
  try {
    const pacienteId = req.user.uid;
    console.log('📊 Buscando dashboard para paciente:', pacienteId);

    // Buscar consultas em ambas as collections (autonomos e clinicas)
    const consultasFuturas = [];
    const consultasRealizadas = [];

    // Buscar em consultas_autonomos
    try {
      const consultasAutonomosQuery = db
        .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
        .where('id_paciente', '==', pacienteId);
      
      const consultasAutonomosSnap = await consultasAutonomosQuery.get();
      console.log(`✅ Consultas autônomos encontradas: ${consultasAutonomosSnap.docs.length}`);
      
      consultasAutonomosSnap.docs.forEach(doc => {
        const data = doc.data();
        const dataConsulta = data.data_consulta?.toDate?.() || 
                           (data.dataConsulta?.toDate?.() || new Date(data.data_consulta || data.dataConsulta));
        const status = (data.status || 'agendada').toLowerCase();
        const isFutura = dataConsulta >= new Date();
        const isAgendada = status === CONSULTA_STATUS.AGENDADA || status === CONSULTA_STATUS.CONFIRMADA;
        const isRealizada = status === CONSULTA_STATUS.REALIZADA;
        
        const consulta = {
          id: doc.id,
          nomeProfissional: data.nm_profissional || data.nomeProfissional || '',
          especialidade: data.especialidade || '',
          dataConsulta: dataConsulta instanceof Date ? dataConsulta.toISOString() : dataConsulta,
          status: data.status || 'agendada',
          observacoes: data.obs || data.observacoes || '',
          idClinica: data.id_clinica || data.idClinica || null,
          nomeClinica: data.nm_clinica || data.nomeClinica || null,
        };
        
        // Incluir apenas consultas agendadas/confirmadas com data futura
        if (isFutura && isAgendada) {
          consultasFuturas.push(consulta);
        } else if (isRealizada) {
          consultasRealizadas.push(consulta);
        }
      });
    } catch (error) {
      console.warn('⚠️ Erro ao buscar consultas autônomos:', error.message);
    }

    // Buscar em consultas_clinicas
    try {
      const consultasClinicasQuery = db
        .collection('consultas_clinicas')
        .where('id_paciente', '==', pacienteId);
      
      const consultasClinicasSnap = await consultasClinicasQuery.get();
      console.log(`✅ Consultas clínicas encontradas: ${consultasClinicasSnap.docs.length}`);
      
      consultasClinicasSnap.docs.forEach(doc => {
        const data = doc.data();
        const dataConsulta = data.data_consulta?.toDate?.() || 
                           (data.dataConsulta?.toDate?.() || new Date(data.data_consulta || data.dataConsulta));
        const status = (data.status || 'agendada').toLowerCase();
        const isFutura = dataConsulta >= new Date();
        const isAgendada = status === CONSULTA_STATUS.AGENDADA || status === CONSULTA_STATUS.CONFIRMADA;
        const isRealizada = status === CONSULTA_STATUS.REALIZADA;
        
        const consulta = {
          id: doc.id,
          nomeProfissional: data.nm_profissional || data.nomeProfissional || '',
          especialidade: data.especialidade || '',
          dataConsulta: dataConsulta instanceof Date ? dataConsulta.toISOString() : dataConsulta,
          status: data.status || 'agendada',
          observacoes: data.obs || data.observacoes || '',
          idClinica: data.id_clinica || data.idClinica || null,
          nomeClinica: data.nm_clinica || data.nomeClinica || null,
        };
        
        // Incluir apenas consultas agendadas/confirmadas com data futura
        if (isFutura && isAgendada) {
          consultasFuturas.push(consulta);
        } else if (isRealizada) {
          consultasRealizadas.push(consulta);
        }
      });
    } catch (error) {
      console.warn('⚠️ Erro ao buscar consultas clínicas:', error.message);
    }

    // Ordenar e limitar
    consultasFuturas.sort((a, b) => {
      const dateA = new Date(a.dataConsulta).getTime();
      const dateB = new Date(b.dataConsulta).getTime();
      return dateA - dateB;
    });
    consultasRealizadas.sort((a, b) => {
      const dateA = new Date(a.dataConsulta).getTime();
      const dateB = new Date(b.dataConsulta).getTime();
      return dateB - dateA;
    });

    const consultasFuturasLimitadas = consultasFuturas.slice(0, 5);
    const consultasRealizadasLimitadas = consultasRealizadas.slice(0, 5);

    console.log(`✅ Total consultas futuras: ${consultasFuturasLimitadas.length}`);
    console.log(`✅ Total consultas realizadas: ${consultasRealizadasLimitadas.length}`);

    return successResponse(res, {
      consultasFuturas: consultasFuturasLimitadas,
      consultasRealizadas: consultasRealizadasLimitadas,
      totalConsultasFuturas: consultasFuturas.length,
      totalConsultasRealizadas: consultasRealizadas.length,
    }, 'Dashboard carregado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao buscar dashboard:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Agendar nova consulta
 */
export const agendarConsulta = async (req, res) => {
  try {
    const pacienteId = req.user.uid;
    const { idClinica, idProfissional, dataConsulta, observacoes } = req.validatedData;

    // Buscar dados do paciente
    const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(pacienteId).get();
    if (!pacienteDoc.exists) {
      return errorResponse(res, 'Paciente não encontrado', 'Usuário não é um paciente válido', 404);
    }
    const pacienteData = pacienteDoc.data();

    // Buscar dados do profissional
    let profissionalData = null;
    let funcionarioData = null;
    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(idProfissional).get();
    if (profissionalDoc.exists) {
      profissionalData = profissionalDoc.data();
    } else {
      // Tentar buscar em funcionarios
      const funcionarioDoc = await db.collection(COLLECTIONS.FUNCIONARIOS).doc(idProfissional).get();
      if (funcionarioDoc.exists) {
        funcionarioData = funcionarioDoc.data();
      } else {
        return errorResponse(res, 'Profissional não encontrado', 'Profissional inválido', 404);
      }
    }

    // Determinar se é profissional autônomo ou de clínica
    const isAutonomo = profissionalData !== null;
    const targetCollection = isAutonomo ? COLLECTIONS.CONSULTAS_AUTONOMOS : 'consultas_clinicas';
    
    // Se for funcionário de clínica, usar idClinica do funcionário se não foi fornecido
    const finalIdClinica = idClinica || (funcionarioData?.idClinica || funcionarioData?.clinica_uid || null);

    // Formatar data para string no formato 'yyyy-MM-dd HH:mm'
    const dataConsultaDate = new Date(dataConsulta);
    const year = dataConsultaDate.getFullYear();
    const month = String(dataConsultaDate.getMonth() + 1).padStart(2, '0');
    const day = String(dataConsultaDate.getDate()).padStart(2, '0');
    const hours = String(dataConsultaDate.getHours()).padStart(2, '0');
    const minutes = String(dataConsultaDate.getMinutes()).padStart(2, '0');
    const dataConsultaString = `${year}-${month}-${day} ${hours}:${minutes}`;

    // Verificar conflitos de horário na collection correta
    // Buscar todas as consultas do profissional e verificar conflitos
    const conflitosQuery = db
      .collection(targetCollection)
      .where('id_profissional', '==', idProfissional);

    const conflitosSnap = await conflitosQuery.get();
    
    // Verificar se há conflito (mesmo profissional, mesmo horário, status agendada/confirmada)
    const conflito = conflitosSnap.docs.find(doc => {
      const data = doc.data();
      const status = String(data.status || '').toLowerCase();
      if (![CONSULTA_STATUS.AGENDADA, CONSULTA_STATUS.CONFIRMADA].includes(status)) {
        return false;
      }
      
      // Parse da data da consulta existente
      const rawData = data.data_consulta || data.dataConsulta;
      let parsedData;
      if (typeof rawData === 'string') {
        parsedData = new Date(rawData.replace(' ', 'T'));
      } else if (rawData?.toDate) {
        parsedData = rawData.toDate();
      } else {
        parsedData = new Date(rawData);
      }
      
      // Verificar se está no mesmo horário (diferença menor que 30 minutos)
      const diff = Math.abs(parsedData.getTime() - dataConsultaDate.getTime());
      return diff < 30 * 60 * 1000; // 30 minutos de diferença
    });

    if (conflito) {
      return errorResponse(res, 'Conflito de horário', 'Já existe uma consulta agendada para este profissional neste horário', 409);
    }

    // Criar consulta com campos em snake_case (formato do desktop)
    // Status com primeira letra maiúscula (como no desktop)
    const statusFormatado = CONSULTA_STATUS.AGENDADA.charAt(0).toUpperCase() + CONSULTA_STATUS.AGENDADA.slice(1);
    
    const consultaData = {
      id_paciente: pacienteId,
      nm_paciente: pacienteData.nome || pacienteData.nomePaciente || '',
      id_profissional: idProfissional,
      nm_profissional: profissionalData?.nome || funcionarioData?.nome || '',
      id_clinica: finalIdClinica,
      data_consulta: dataConsultaString,
      status: statusFormatado, // 'Agendada' (com A maiúsculo)
      obs: observacoes || '',
      created_at: Timestamp.now(),
      tipo_atendimento: isAutonomo ? 'autonomo' : 'clinica',
    };

    const consultaRef = await db.collection(targetCollection).add(consultaData);
    
    // Adicionar campo id ao documento
    await db.collection(targetCollection).doc(consultaRef.id).update({ id: consultaRef.id });

    return successResponse(res, {
      id: consultaRef.id,
      ...consultaData,
      dataConsulta: dataConsultaDate,
      dataCriacao: consultaData.created_at.toDate(),
    }, 'Consulta agendada com sucesso', 201);
  } catch (error) {
    console.error('Erro ao agendar consulta:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Histórico de consultas
 */
export const getHistorico = async (req, res) => {
  try {
    const pacienteId = req.user.uid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log('📋 Buscando histórico para paciente:', pacienteId);

    const allConsultas = [];

    // Buscar em consultas_autonomos
    try {
      const consultasAutonomosQuery = db
        .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
        .where('id_paciente', '==', pacienteId);
      
      const consultasAutonomosSnap = await consultasAutonomosQuery.get();
      console.log(`✅ Consultas autônomos encontradas: ${consultasAutonomosSnap.docs.length}`);
      
      for (const doc of consultasAutonomosSnap.docs) {
        const data = doc.data();
        const dataConsulta = data.data_consulta?.toDate?.() || 
                           (data.dataConsulta?.toDate?.() || new Date(data.data_consulta || data.dataConsulta));
        
        // Buscar especialidade do profissional se não estiver na consulta
        let especialidade = data.especialidade || '';
        if (!especialidade && data.id_profissional) {
          try {
            const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(data.id_profissional).get();
            if (profissionalDoc.exists) {
              especialidade = profissionalDoc.data().especialidade || 'Geral';
            }
          } catch (error) {
            console.warn('⚠️ Erro ao buscar especialidade do profissional:', error.message);
          }
        }
        
        allConsultas.push({
          id: doc.id,
          nomeProfissional: data.nm_profissional || data.nomeProfissional || '',
          especialidade: especialidade || 'Geral',
          idProfissional: data.id_profissional || '',
          dataConsulta: dataConsulta instanceof Date ? dataConsulta.toISOString() : dataConsulta,
          status: data.status || 'agendada',
          observacoes: data.obs || data.observacoes || '',
          idClinica: null,
          nomeClinica: null,
        });
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar consultas autônomos:', error.message);
    }

    // Buscar em consultas_clinicas
    try {
      const consultasClinicasQuery = db
        .collection('consultas_clinicas')
        .where('id_paciente', '==', pacienteId);
      
      const consultasClinicasSnap = await consultasClinicasQuery.get();
      console.log(`✅ Consultas clínicas encontradas: ${consultasClinicasSnap.docs.length}`);
      
      for (const doc of consultasClinicasSnap.docs) {
        const data = doc.data();
        const dataConsulta = data.data_consulta?.toDate?.() || 
                           (data.dataConsulta?.toDate?.() || new Date(data.data_consulta || data.dataConsulta));
        
        // Buscar especialidade do funcionário se não estiver na consulta
        let especialidade = data.especialidade || '';
        if (!especialidade && data.id_profissional) {
          try {
            const funcionarioDoc = await db.collection(COLLECTIONS.FUNCIONARIOS).doc(data.id_profissional).get();
            if (funcionarioDoc.exists) {
              especialidade = funcionarioDoc.data().especialidade || 'Geral';
            }
          } catch (error) {
            console.warn('⚠️ Erro ao buscar especialidade do funcionário:', error.message);
          }
        }
        
        allConsultas.push({
          id: doc.id,
          nomeProfissional: data.nm_profissional || data.nomeProfissional || '',
          especialidade: especialidade || 'Geral',
          idProfissional: data.id_profissional || '',
          dataConsulta: dataConsulta instanceof Date ? dataConsulta.toISOString() : dataConsulta,
          status: data.status || 'agendada',
          observacoes: data.obs || data.observacoes || '',
          idClinica: data.id_clinica || data.idClinica || null,
          nomeClinica: data.nm_clinica || data.nomeClinica || null,
        });
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar consultas clínicas:', error.message);
    }

    // Ordenar por data (mais recente primeiro)
    allConsultas.sort((a, b) => b.dataConsulta - a.dataConsulta);

    const total = allConsultas.length;
    const consultas = allConsultas.slice(offset, offset + limit);

    console.log(`✅ Total de consultas: ${total}, retornando: ${consultas.length}`);

    return paginatedResponse(res, consultas, page, limit, total, 'Histórico carregado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Detalhes de uma consulta
 */
export const getConsultaDetalhes = async (req, res) => {
  try {
    const { id } = req.params;
    const pacienteId = req.user.uid;

    console.log(`📋 Buscando detalhes da consulta ${id} para paciente ${pacienteId}`);

    // Buscar em consultas_autonomos
    let consultaDoc = null;
    let consultaData = null;

    try {
      consultaDoc = await db.collection(COLLECTIONS.CONSULTAS_AUTONOMOS).doc(id).get();
      if (consultaDoc.exists) {
        consultaData = consultaDoc.data();
        console.log('✅ Consulta encontrada em consultas_autonomos');
      }
    } catch (error) {
      console.warn('Erro ao buscar em consultas_autonomos:', error);
    }

    // Se não encontrou, buscar em consultas_clinicas
    if (!consultaDoc || !consultaDoc.exists) {
      try {
        consultaDoc = await db.collection('consultas_clinicas').doc(id).get();
        if (consultaDoc.exists) {
          consultaData = consultaDoc.data();
          console.log('✅ Consulta encontrada em consultas_clinicas');
        }
      } catch (error) {
        console.warn('Erro ao buscar em consultas_clinicas:', error);
      }
    }

    // Se ainda não encontrou, tentar na collection consultas
    if (!consultaDoc || !consultaDoc.exists) {
      try {
        consultaDoc = await db.collection(COLLECTIONS.CONSULTAS).doc(id).get();
        if (consultaDoc.exists) {
          consultaData = consultaDoc.data();
          console.log('✅ Consulta encontrada em consultas');
        }
      } catch (error) {
        console.warn('Erro ao buscar em consultas:', error);
      }
    }

    if (!consultaDoc || !consultaDoc.exists) {
      return errorResponse(res, 'Consulta não encontrada', 'Consulta não existe', 404);
    }

    // Verificar se a consulta pertence ao paciente
    const idPaciente = consultaData.id_paciente || consultaData.idPaciente;
    if (idPaciente !== pacienteId) {
      return errorResponse(res, 'Acesso negado', 'Esta consulta não pertence a você', 403);
    }

    // Formatar data
    let dataConsulta = null;
    if (consultaData.data_consulta) {
      dataConsulta = consultaData.data_consulta?.toDate ? consultaData.data_consulta.toDate() : new Date(consultaData.data_consulta);
    } else if (consultaData.dataConsulta) {
      dataConsulta = consultaData.dataConsulta?.toDate ? consultaData.dataConsulta.toDate() : new Date(consultaData.dataConsulta);
    }

    return successResponse(res, {
      id: consultaDoc.id,
      ...consultaData,
      dataConsulta: dataConsulta,
      idProfissional: consultaData.id_profissional || consultaData.idProfissional || '',
      idPaciente: idPaciente,
    }, 'Consulta encontrada');
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Atualizar perfil do paciente
 */
export const updatePerfil = async (req, res) => {
  try {
    const pacienteId = req.user.uid;
    const updateData = req.validatedData;

    console.log('📝 Atualizando perfil do paciente:', pacienteId);
    console.log('📦 Dados recebidos:', Object.keys(updateData));

    // Atualizar no Firestore - collection pacientes
    const pacienteRef = db.collection(COLLECTIONS.PACIENTES).doc(pacienteId);
    const pacienteDoc = await pacienteRef.get();
    
    if (!pacienteDoc.exists) {
      return errorResponse(res, 'Paciente não encontrado', 'Perfil não existe', 404);
    }

    // Garantir que foto e fotoURL estejam sincronizados
    const updateDataFinal = { ...updateData };
    if (updateDataFinal.foto && !updateDataFinal.fotoURL) {
      updateDataFinal.fotoURL = updateDataFinal.foto;
    } else if (updateDataFinal.fotoURL && !updateDataFinal.foto) {
      updateDataFinal.foto = updateDataFinal.fotoURL;
    }

    await pacienteRef.update({
      ...updateDataFinal,
      dataAtualizacao: Timestamp.now(),
    });

    console.log('✅ Perfil atualizado na collection pacientes');

    // Atualizar também na collection users (se existir)
    try {
      const userRef = db.collection(COLLECTIONS.USERS).doc(pacienteId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        await userRef.update({
          ...updateDataFinal,
          dataAtualizacao: Timestamp.now(),
        });
        console.log('✅ Perfil atualizado na collection users');
      } else {
        console.log('⚠️ Documento não encontrado na collection users, pulando atualização');
      }
    } catch (userError) {
      console.warn('⚠️ Erro ao atualizar collection users (não crítico):', userError.message);
      // Não falhar se não conseguir atualizar users
    }

    // Buscar dados atualizados
    const pacienteAtualizado = await pacienteRef.get();
    const pacienteDataAtualizado = pacienteAtualizado.data();
    
    // Converter todos os Timestamps para strings ISO
    const pacienteDataConverted = convertFirestoreTimestamps(pacienteDataAtualizado);

    return successResponse(res, {
      id: pacienteAtualizado.id,
      ...pacienteDataConverted,
    }, 'Perfil atualizado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Buscar perfil do paciente
 */
// Função helper para converter Timestamps do Firestore
const convertFirestoreTimestamps = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // Se for um Timestamp do Firestore
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  
  // Se for um objeto com _seconds e _nanoseconds (Timestamp serializado)
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000).toISOString();
  }
  
  // Se for um array, converter cada item
  if (Array.isArray(obj)) {
    return obj.map(item => convertFirestoreTimestamps(item));
  }
  
  // Se for um objeto, converter cada propriedade
  const converted = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      converted[key] = convertFirestoreTimestamps(obj[key]);
    }
  }
  return converted;
};

export const getPerfil = async (req, res) => {
  try {
    const pacienteId = req.user.uid;

    const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(pacienteId).get();

    if (!pacienteDoc.exists) {
      return errorResponse(res, 'Paciente não encontrado', 'Perfil não existe', 404);
    }

    const pacienteData = pacienteDoc.data();
    
    console.log('📋 Dados do Firestore (antes da conversão):', {
      nome: pacienteData.nome,
      endereco: pacienteData.endereco,
      endereço: pacienteData.endereço,
      dataNascimento: pacienteData.dataNascimento,
      data_nascimento: pacienteData.data_nascimento,
      dataNasc: pacienteData.dataNasc,
      plano: pacienteData.plano,
      planoSaude: pacienteData.planoSaude,
      plano_saude: pacienteData.plano_saude,
      foto: pacienteData.foto ? 'Sim' : 'Não',
      todosCampos: Object.keys(pacienteData),
    });
    
    // Converter todos os Timestamps para strings ISO
    const pacienteDataConverted = convertFirestoreTimestamps(pacienteData);
    
    console.log('📋 Dados convertidos:', {
      nome: pacienteDataConverted.nome,
      endereco: pacienteDataConverted.endereco,
      dataNascimento: pacienteDataConverted.dataNascimento,
      plano: pacienteDataConverted.plano,
      planoSaude: pacienteDataConverted.planoSaude,
      foto: pacienteDataConverted.foto ? 'Sim' : 'Não',
    });
    
    // Tratar foto: se for URL relativa do Django, converter para URL absoluta ou null
    // URLs relativas do Django não são acessíveis pelo mobile diretamente
    let foto = pacienteDataConverted.foto || pacienteDataConverted.fotoURL || pacienteDataConverted.photo || pacienteDataConverted.avatar_url || null;
    
    if (foto && foto.startsWith('/media/')) {
      // URL relativa do Django - não é acessível pelo mobile
      // Retornar null para que o mobile use o ícone padrão
      // Ou você pode configurar uma URL absoluta do Django aqui se necessário
      foto = null;
    }

    // Buscar campos em diferentes formatos (compatibilidade mobile/web)
    // Data de nascimento pode estar em: dataNascimento, data_nascimento, dataNasc
    const dataNascimento = pacienteDataConverted.dataNascimento || 
                          pacienteDataConverted.data_nascimento || 
                          pacienteDataConverted.dataNasc || 
                          null;
    
    // Endereço pode estar em: endereco, endereço
    const endereco = pacienteDataConverted.endereco || 
                     pacienteDataConverted.endereço || 
                     '';
    
    // Plano pode estar em: plano, planoSaude, plano_saude
    const plano = pacienteDataConverted.plano || 
                  pacienteDataConverted.planoSaude || 
                  pacienteDataConverted.plano_saude || 
                  '';
    
    // Garantir que todos os campos necessários estejam presentes
    const responseData = {
      id: pacienteDoc.id,
      nome: pacienteDataConverted.nome || '',
      email: pacienteDataConverted.email || '',
      telefone: pacienteDataConverted.telefone || '',
      cpf: pacienteDataConverted.cpf || '',
      dataNascimento: dataNascimento,
      endereco: endereco,
      plano: plano,
      planoSaude: plano,
      notificacoes: pacienteDataConverted.notificacoes !== undefined ? pacienteDataConverted.notificacoes : true,
      marketingEmails: pacienteDataConverted.marketingEmails !== undefined ? pacienteDataConverted.marketingEmails : false,
      foto: foto,
      fotoURL: foto,
      ...pacienteDataConverted, // Manter outros campos
    };

    console.log('📤 Retornando dados:', {
      nome: responseData.nome,
      endereco: responseData.endereco,
      plano: responseData.plano,
      planoSaude: responseData.planoSaude,
      endereco: responseData.endereco,
      dataNascimento: responseData.dataNascimento,
      plano: responseData.plano,
      foto: responseData.foto ? 'Sim' : 'Não',
    });

    return successResponse(res, responseData, 'Perfil carregado com sucesso');
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Remarcar consulta (PATCH /consultas/:id)
 */
export const updateConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const pacienteId = req.user.uid;
    const { dataConsulta } = req.body;

    const consultaDoc = await db.collection(COLLECTIONS.CONSULTAS).doc(id).get();
    if (!consultaDoc.exists) {
      return errorResponse(res, 'Consulta não encontrada', 'Consulta não existe', 404);
    }

    const consultaData = consultaDoc.data();
    if (consultaData.idPaciente !== pacienteId) {
      return errorResponse(res, 'Acesso negado', 'Esta consulta não pertence a você', 403);
    }

    const newTimestamp = dataConsulta ? Timestamp.fromDate(new Date(dataConsulta)) : Timestamp.now();

    const docRef = db.collection(COLLECTIONS.CONSULTAS).doc(id);

    if (docRef && typeof docRef.update === 'function') {
      await docRef.update({ dataConsulta: newTimestamp, dataAtualizacao: Timestamp.now() });
    } else if (consultaDoc.ref && typeof consultaDoc.ref.update === 'function') {
      await consultaDoc.ref.update({ dataConsulta: newTimestamp, dataAtualizacao: Timestamp.now() });
    }

    let updated;
    if (docRef && typeof docRef.get === 'function') {
      updated = await docRef.get();
    } else if (consultaDoc.ref && typeof consultaDoc.ref.get === 'function') {
      updated = await consultaDoc.ref.get();
    } else {
      updated = consultaDoc;
    }

    return successResponse(res, {
      id: updated.id,
      ...updated.data(),
      dataConsulta: updated.data().dataConsulta?.toDate(),
    }, 'Consulta atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar consulta:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Deletar consulta (DELETE /consultas/:id)
 * Agora aceita motivo no body para cancelamento
 */
export const deleteConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const pacienteId = req.user.uid;
    const { motivo } = req.body || {};

    console.log(`🗑️ Cancelando consulta ${id} com motivo: ${motivo || 'não informado'}`);

    // Buscar consulta em consultas_autonomos
    let consultaDoc = null;
    let consultaData = null;
    let collectionName = null;

    try {
      consultaDoc = await db.collection(COLLECTIONS.CONSULTAS_AUTONOMOS).doc(id).get();
      if (consultaDoc.exists) {
        consultaData = consultaDoc.data();
        collectionName = COLLECTIONS.CONSULTAS_AUTONOMOS;
      }
    } catch (error) {
      console.warn('Erro ao buscar em consultas_autonomos:', error);
    }

    // Se não encontrou, buscar em consultas_clinicas
    if (!consultaDoc || !consultaDoc.exists) {
      try {
        consultaDoc = await db.collection('consultas_clinicas').doc(id).get();
        if (consultaDoc.exists) {
          consultaData = consultaDoc.data();
          collectionName = 'consultas_clinicas';
        }
      } catch (error) {
        console.warn('Erro ao buscar em consultas_clinicas:', error);
      }
    }

    // Se ainda não encontrou, tentar na collection consultas
    if (!consultaDoc || !consultaDoc.exists) {
      try {
        consultaDoc = await db.collection(COLLECTIONS.CONSULTAS).doc(id).get();
        if (consultaDoc.exists) {
          consultaData = consultaDoc.data();
          collectionName = COLLECTIONS.CONSULTAS;
        }
      } catch (error) {
        console.warn('Erro ao buscar em consultas:', error);
      }
    }

    if (!consultaDoc || !consultaDoc.exists) {
      return errorResponse(res, 'Consulta não encontrada', 'Consulta não existe', 404);
    }

    // Verificar se a consulta pertence ao paciente
    const idPaciente = consultaData.id_paciente || consultaData.idPaciente;
    if (idPaciente !== pacienteId) {
      return errorResponse(res, 'Acesso negado', 'Esta consulta não pertence a você', 403);
    }

    // Atualizar status para cancelada ao invés de deletar
    const updateData = {
      status: 'cancelada',
      dataCancelamento: Timestamp.now(),
    };

    if (motivo) {
      updateData.motivoCancelamento = motivo;
    }

    // Atualizar na collection correta
    const docRef = db.collection(collectionName).doc(id);
    await docRef.update(updateData);

    console.log(`✅ Consulta ${id} cancelada com sucesso`);

    return successResponse(res, { motivo: motivo || null }, 'Consulta cancelada com sucesso');
  } catch (error) {
    console.error('Erro ao cancelar consulta:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Upload simples associado à consulta (POST /consultas/:id/upload)
 * Nota: este handler é propositalmente simples para testes (não processa o arquivo),
 * apenas marca a consulta como contendo um anexo.
 */
export const uploadConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const pacienteId = req.user.uid;

    const consultaDoc = await db.collection(COLLECTIONS.CONSULTAS).doc(id).get();
    if (!consultaDoc.exists) {
      return errorResponse(res, 'Consulta não encontrada', 'Consulta não existe', 404);
    }

    const consultaData = consultaDoc.data();
    if (consultaData.idPaciente !== pacienteId) {
      return errorResponse(res, 'Acesso negado', 'Esta consulta não pertence a você', 403);
    }

    // Simular gravação de metadados de upload
    const docRef = db.collection(COLLECTIONS.CONSULTAS).doc(id);

    if (docRef && typeof docRef.update === 'function') {
      await docRef.update({ attachments: ['uploaded-file.jpg'], dataAtualizacao: Timestamp.now() });
    } else if (consultaDoc.ref && typeof consultaDoc.ref.update === 'function') {
      await consultaDoc.ref.update({ attachments: ['uploaded-file.jpg'], dataAtualizacao: Timestamp.now() });
    }

    let updated;
    if (docRef && typeof docRef.get === 'function') {
      updated = await docRef.get();
    } else if (consultaDoc.ref && typeof consultaDoc.ref.get === 'function') {
      updated = await consultaDoc.ref.get();
    } else {
      updated = consultaDoc;
    }

    return successResponse(res, { id: updated.id, ...updated.data() }, 'Upload realizado', 201);
  } catch (error) {
    console.error('Erro ao processar upload:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Listar profissionais disponíveis para agendamento
 */
export const getProfissionais = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    
    console.log('🔍 Buscando profissionais...', { searchQuery });
    
    // Buscar TODOS os profissionais e filtrar (mais confiável que where com null)
    let profissionaisAutonomosSnap;
    try {
      const allProfissionaisSnap = await db.collection(COLLECTIONS.PROFISSIONAIS).get();
      console.log(`📋 Total de profissionais na collection: ${allProfissionaisSnap.docs.length}`);
      
      // Filtrar profissionais autônomos (idClinica é null, undefined ou não existe)
      profissionaisAutonomosSnap = {
        docs: allProfissionaisSnap.docs.filter(doc => {
          const data = doc.data();
          const idClinica = data.idClinica;
          // Profissional autônomo: idClinica é null, undefined, ou não existe
          const isAutonomo = !idClinica || idClinica === null || idClinica === undefined;
          
          if (isAutonomo) {
            console.log(`  ✅ Profissional autônomo encontrado: ${data.nome || doc.id}`);
          }
          
          return isAutonomo;
        })
      };
    } catch (error) {
      console.error('❌ Erro ao buscar profissionais:', error);
      profissionaisAutonomosSnap = { docs: [] };
    }
    
    console.log(`✅ Profissionais autônomos encontrados: ${profissionaisAutonomosSnap.docs.length}`);
    
    // Buscar funcionários (médicos) de clínicas
    let funcionariosSnap;
    try {
      // Tentar query com where primeiro
      const funcionariosMedicosQuery = db
        .collection(COLLECTIONS.FUNCIONARIOS)
        .where('cargo', '==', 'medico');
      
      funcionariosSnap = await funcionariosMedicosQuery.get();
    } catch (error) {
      // Se a query falhar, buscar todos e filtrar
      console.log('⚠️ Query com where falhou, buscando todos e filtrando...');
      const allFuncionariosSnap = await db.collection(COLLECTIONS.FUNCIONARIOS).get();
      funcionariosSnap = {
        docs: allFuncionariosSnap.docs.filter(doc => {
          const data = doc.data();
          return data.cargo === 'medico';
        })
      };
    }
    
    console.log(`✅ Funcionários médicos encontrados: ${funcionariosSnap.docs.length}`);
    
    const profissionais = [];
    
    // Adicionar profissionais autônomos
    profissionaisAutonomosSnap.docs.forEach(doc => {
      const data = doc.data();
      const nome = data.nome || '';
      const especialidade = data.especialidade || 'Geral';
      
      if (!searchQuery || 
          nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          especialidade.toLowerCase().includes(searchQuery.toLowerCase())) {
        profissionais.push({
          id: doc.id,
          nome: nome,
          especialidade: especialidade,
          email: data.email || null,
          telefone: data.telefone || null,
          tipo: 'autonomo',
          idClinica: null,
          foto: data.foto || null,
          fotoURL: data.fotoURL || data.foto || null,
          descricao: data.bio || data.biografia || data.descricao || data.descrição || null,
          bio: data.bio || data.biografia || data.descricao || data.descrição || null,
          endereco: data.endereco || null,
          crm: data.crm || null,
        });
      }
    });
    
    // Adicionar funcionários de clínicas (médicos)
    funcionariosSnap.docs.forEach(doc => {
      const data = doc.data();
      const nome = data.nome || '';
      const especialidade = data.especialidade || 'Geral';
      const idClinica = data.idClinica || null;
      
      if (!searchQuery || 
          nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          especialidade.toLowerCase().includes(searchQuery.toLowerCase())) {
        profissionais.push({
          id: doc.id,
          nome: nome,
          especialidade: especialidade,
          email: data.email || null,
          telefone: data.telefone || null,
          idClinica: idClinica,
          tipo: 'clinica',
          cargo: data.cargo || null,
          foto: data.foto || null,
          fotoURL: data.fotoURL || data.foto || null,
          descricao: data.bio || data.biografia || data.descricao || data.descrição || null,
          bio: data.bio || data.biografia || data.descricao || data.descrição || null,
          endereco: data.endereco || null,
          crm: data.crm || null,
        });
      }
    });
    
    console.log(`✅ Total de profissionais retornados: ${profissionais.length}`);
    console.log(`   - Autônomos: ${profissionais.filter(p => p.tipo === 'autonomo').length}`);
    console.log(`   - Clínicas: ${profissionais.filter(p => p.tipo === 'clinica').length}`);
    
    return successResponse(res, profissionais, 'Profissionais carregados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao buscar profissionais:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Listar clínicas disponíveis
 */
export const getClinicas = async (req, res) => {
  try {
    const clinicasSnap = await db.collection(COLLECTIONS.CLINICAS).get();
    
    const clinicas = clinicasSnap.docs.map(doc => {
      const data = doc.data();
      // Priorizar nomeFantasia, depois nome, depois id
      return {
        id: doc.id,
        ...data,
        nome: data.nomeFantasia || data.nome || data.nomeClinica || `Clínica ${doc.id.substring(0, 8)}`,
      };
    });
    
    return successResponse(res, clinicas, 'Clínicas carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao buscar clínicas:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Buscar médicos de uma clínica específica
 */
export const getMedicosClinica = async (req, res) => {
  try {
    const { clinicaId } = req.params;
    
    if (!clinicaId) {
      return errorResponse(res, 'ID da clínica obrigatório', 'É necessário informar o ID da clínica', 400);
    }

    console.log(`🏥 Buscando médicos da clínica ${clinicaId}`);

    // Buscar funcionários médicos da clínica
    const funcionariosQuery = db
      .collection(COLLECTIONS.FUNCIONARIOS)
      .where('idClinica', '==', clinicaId)
      .where('cargo', '==', 'medico');
    
    const funcionariosSnap = await funcionariosQuery.get();
    
    const medicos = funcionariosSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome || '',
        especialidade: data.especialidade || 'Geral',
        email: data.email || null,
        telefone: data.telefone || null,
        idClinica: data.idClinica || clinicaId,
        tipo: 'clinica',
        cargo: data.cargo || 'medico',
        foto: data.foto || null,
        fotoURL: data.fotoURL || data.foto || null,
      };
    });

    // Agrupar por especialidade
    const medicosPorEspecialidade = {};
    medicos.forEach(medico => {
      const esp = medico.especialidade || 'Geral';
      if (!medicosPorEspecialidade[esp]) {
        medicosPorEspecialidade[esp] = [];
      }
      medicosPorEspecialidade[esp].push(medico);
    });

    // Obter lista de especialidades únicas
    const especialidades = Object.keys(medicosPorEspecialidade).sort();

    console.log(`✅ ${medicos.length} médicos encontrados na clínica, ${especialidades.length} especialidades`);

    return successResponse(res, {
      medicos,
      especialidades,
      medicosPorEspecialidade,
      total: medicos.length,
    }, 'Médicos carregados com sucesso');
  } catch (error) {
    console.error('Erro ao buscar médicos da clínica:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Buscar horários disponíveis de um profissional para uma data específica
 */
export const getHorariosDisponiveisProfissional = async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const { data } = req.query; // Data no formato YYYY-MM-DD
    const pacienteId = req.user.uid;

    if (!data) {
      return errorResponse(res, 'Data obrigatória', 'É necessário informar a data (YYYY-MM-DD)', 400);
    }

    console.log(`📅 Buscando horários para profissional ${profissionalId} na data ${data}`);
    
    // Verificar se é profissional autônomo ou funcionário de clínica
    let horariosSnap;
    let isFuncionario = false;
    
    // Primeiro, tentar buscar como profissional autônomo
    try {
      const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).get();
      if (profissionalDoc.exists) {
        const horariosRef = db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).collection('horarios');
        horariosSnap = await horariosRef.get();
        console.log(`✅ Profissional autônomo encontrado. Horários encontrados: ${horariosSnap.docs.length}`);
      } else {
        // Se não encontrou em profissionais, tentar em funcionarios
        const funcionarioDoc = await db.collection(COLLECTIONS.FUNCIONARIOS).doc(profissionalId).get();
        if (funcionarioDoc.exists) {
          isFuncionario = true;
          const horariosRef = db.collection(COLLECTIONS.FUNCIONARIOS).doc(profissionalId).collection('horarios');
          horariosSnap = await horariosRef.get();
          console.log(`✅ Funcionário de clínica encontrado. Horários encontrados: ${horariosSnap.docs.length}`);
        } else {
          // Se não encontrou em nenhum lugar, retornar vazio
          horariosSnap = { docs: [] };
          console.log(`⚠️ Profissional não encontrado em profissionais nem em funcionarios`);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar profissional:', error);
      // Tentar buscar em funcionarios como fallback
      try {
        const funcionarioDoc = await db.collection(COLLECTIONS.FUNCIONARIOS).doc(profissionalId).get();
        if (funcionarioDoc.exists) {
          const horariosRef = db.collection(COLLECTIONS.FUNCIONARIOS).doc(profissionalId).collection('horarios');
          horariosSnap = await horariosRef.get();
          isFuncionario = true;
          console.log(`✅ Funcionário encontrado (fallback). Horários encontrados: ${horariosSnap.docs.length}`);
        } else {
          horariosSnap = { docs: [] };
          console.log(`⚠️ Profissional não encontrado em funcionarios (fallback)`);
        }
      } catch (error2) {
        console.error('❌ Erro ao buscar em funcionarios:', error2);
        horariosSnap = { docs: [] };
      }
    }

    console.log(`📋 Total de horários encontrados: ${horariosSnap.docs.length}`);
    console.log(`🔍 É funcionário: ${isFuncionario}`);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const horariosDisponiveisList = [];
    const horariosOcupadosList = [];

    // Processar horários disponíveis
    if (horariosSnap.docs.length === 0) {
      console.log(`⚠️ Nenhum horário encontrado na collection ${isFuncionario ? 'funcionarios' : 'profissionais'}`);
    }
    
    horariosSnap.docs.forEach((doc, index) => {
      const horarioData = doc.data();
      console.log(`  📝 Horário ${index + 1}:`, { 
        id: doc.id,
        tipo: horarioData.tipo, 
        diaSemana: horarioData.diaSemana, 
        data: horarioData.data, 
        hora: horarioData.hora, 
        disponivel: horarioData.disponivel 
      });
      
      // Horários recorrentes (por dia da semana)
      if (horarioData.tipo === 'recorrente' && horarioData.diaSemana !== undefined) {
        const dataObj = new Date(data + 'T00:00:00');
        const diaSemanaData = dataObj.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
        
        const horarioDiaSemana = Number(horarioData.diaSemana);
        
        // Se o horário recorrente tem uma data específica, verificar se corresponde
        let dataCorresponde = true;
        if (horarioData.data) {
          let horarioDataFormatada = horarioData.data;
          if (horarioData.data.includes('/')) {
            const [dia, mes, ano] = horarioData.data.split('/');
            horarioDataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
          dataCorresponde = horarioDataFormatada === data;
        }
        
        console.log(`    🔍 Recorrente: diaSemanaData=${diaSemanaData}, horarioDiaSemana=${horarioDiaSemana}, dataCorresponde=${dataCorresponde}, dataObj >= hoje: ${dataObj >= hoje}`);
        
        // Verificar se o dia da semana da data selecionada corresponde ao horário recorrente
        // E se houver data específica, ela também deve corresponder
        if (diaSemanaData === horarioDiaSemana && dataCorresponde && dataObj >= hoje) {
          if (horarioData.disponivel !== false && horarioData.hora) {
            horariosDisponiveisList.push(horarioData.hora);
            console.log(`    ✅ Adicionado horário recorrente disponível: ${horarioData.hora}`);
          }
        }
      }
      
      // Horários específicos (por data)
      if (horarioData.tipo === 'especifico' && horarioData.data) {
        let horarioDataFormatada = horarioData.data;
        if (horarioData.data.includes('/')) {
          // Converter DD/MM/YYYY para YYYY-MM-DD
          const [dia, mes, ano] = horarioData.data.split('/');
          horarioDataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        
        console.log(`    🔍 Comparando datas: horarioDataFormatada=${horarioDataFormatada}, data=${data}`);
        
        if (horarioDataFormatada === data) {
          const dataObj = new Date(horarioDataFormatada + 'T00:00:00');
          if (dataObj >= hoje && horarioData.disponivel !== false && horarioData.hora) {
            horariosDisponiveisList.push(horarioData.hora);
            console.log(`    ✅ Adicionado horário específico disponível: ${horarioData.hora}`);
          }
        }
      }
      
      // Compatibilidade com dados antigos (sem tipo)
      if (!horarioData.tipo && horarioData.data) {
        let horarioDataFormatada = horarioData.data;
        if (horarioData.data.includes('/')) {
          const [dia, mes, ano] = horarioData.data.split('/');
          horarioDataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        
        if (horarioDataFormatada === data) {
          const dataObj = new Date(horarioDataFormatada + 'T00:00:00');
          if (dataObj >= hoje && horarioData.disponivel !== false && horarioData.hora) {
            horariosDisponiveisList.push(horarioData.hora);
          }
        }
      }
    });

    // Buscar horários ocupados (consultas agendadas/confirmadas do profissional)
    try {
      // Buscar em consultas_autonomos
      const consultasAutonomosQuery = db
        .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
        .where('id_profissional', '==', profissionalId);
      
      const consultasAutonomosSnap = await consultasAutonomosQuery.get();
      
      consultasAutonomosSnap.docs.forEach(doc => {
        const consultaData = doc.data();
        let dataConsulta = null;
        
        if (consultaData.data && consultaData.hora) {
          // Formato: data (YYYY-MM-DD) e hora (HH:MM)
          const dataStr = consultaData.data;
          if (dataStr === data) {
            const status = String(consultaData.status || '').toLowerCase();
            if (status === 'agendada' || status === 'confirmada') {
              horariosOcupadosList.push(consultaData.hora);
            }
          }
        } else if (consultaData.dataConsulta) {
          // Formato: Timestamp
          dataConsulta = consultaData.dataConsulta?.toDate ? consultaData.dataConsulta.toDate() : new Date(consultaData.dataConsulta);
          const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
          if (dataConsultaStr === data) {
            const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
            const status = String(consultaData.status || '').toLowerCase();
            if (status === 'agendada' || status === 'confirmada') {
              horariosOcupadosList.push(horaStr);
            }
          }
        } else if (consultaData.data_consulta) {
          dataConsulta = consultaData.data_consulta?.toDate ? consultaData.data_consulta.toDate() : new Date(consultaData.data_consulta);
          const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
          if (dataConsultaStr === data) {
            const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
            const status = String(consultaData.status || '').toLowerCase();
            if (status === 'agendada' || status === 'confirmada') {
              horariosOcupadosList.push(horaStr);
            }
          }
        }
      });

      // Buscar em consultas_clinicas (se o profissional for de clínica)
      try {
        const consultasClinicasQuery = db
          .collection('consultas_clinicas')
          .where('id_profissional', '==', profissionalId);
        
        const consultasClinicasSnap = await consultasClinicasQuery.get();
        
        consultasClinicasSnap.docs.forEach(doc => {
          const consultaData = doc.data();
          let dataConsulta = null;
          
          if (consultaData.data && consultaData.hora) {
            const dataStr = consultaData.data;
            if (dataStr === data) {
              const status = String(consultaData.status || '').toLowerCase();
              if (status === 'agendada' || status === 'confirmada') {
                horariosOcupadosList.push(consultaData.hora);
              }
            }
          } else if (consultaData.dataConsulta) {
            dataConsulta = consultaData.dataConsulta?.toDate ? consultaData.dataConsulta.toDate() : new Date(consultaData.dataConsulta);
            const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
            if (dataConsultaStr === data) {
              const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
              const status = String(consultaData.status || '').toLowerCase();
              if (status === 'agendada' || status === 'confirmada') {
                horariosOcupadosList.push(horaStr);
              }
            }
          } else if (consultaData.data_consulta) {
            dataConsulta = consultaData.data_consulta?.toDate ? consultaData.data_consulta.toDate() : new Date(consultaData.data_consulta);
            const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
            if (dataConsultaStr === data) {
              const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
              const status = String(consultaData.status || '').toLowerCase();
              if (status === 'agendada' || status === 'confirmada') {
                horariosOcupadosList.push(horaStr);
              }
            }
          }
        });
      } catch (error) {
        console.warn('Erro ao buscar consultas clínicas:', error);
      }
    } catch (error) {
      console.warn('Erro ao buscar consultas ocupadas:', error);
    }

    // Buscar consultas do paciente para mostrar quais horários ele já tem
    const consultasPaciente = [];
    try {
      // Buscar em consultas_autonomos
      const consultasPacienteQuery1 = db
        .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
        .where('id_paciente', '==', pacienteId);
      
      const consultasPacienteSnap1 = await consultasPacienteQuery1.get();
      
      consultasPacienteSnap1.docs.forEach(doc => {
        const consultaData = doc.data();
        let dataConsulta = null;
        
        if (consultaData.data && consultaData.hora) {
          const dataStr = consultaData.data;
          if (dataStr === data) {
            consultasPaciente.push({
              hora: consultaData.hora,
              profissional: consultaData.nm_profissional || consultaData.nomeProfissional || '',
            });
          }
        } else if (consultaData.dataConsulta) {
          dataConsulta = consultaData.dataConsulta?.toDate ? consultaData.dataConsulta.toDate() : new Date(consultaData.dataConsulta);
          const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
          if (dataConsultaStr === data) {
            const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
            consultasPaciente.push({
              hora: horaStr,
              profissional: consultaData.nm_profissional || consultaData.nomeProfissional || '',
            });
          }
        } else if (consultaData.data_consulta) {
          dataConsulta = consultaData.data_consulta?.toDate ? consultaData.data_consulta.toDate() : new Date(consultaData.data_consulta);
          const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
          if (dataConsultaStr === data) {
            const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
            consultasPaciente.push({
              hora: horaStr,
              profissional: consultaData.nm_profissional || consultaData.nomeProfissional || '',
            });
          }
        }
      });

      // Buscar em consultas_clinicas
      try {
        const consultasPacienteQuery2 = db
          .collection('consultas_clinicas')
          .where('id_paciente', '==', pacienteId);
        
        const consultasPacienteSnap2 = await consultasPacienteQuery2.get();
        
        consultasPacienteSnap2.docs.forEach(doc => {
          const consultaData = doc.data();
          let dataConsulta = null;
          
          if (consultaData.data && consultaData.hora) {
            const dataStr = consultaData.data;
            if (dataStr === data) {
              consultasPaciente.push({
                hora: consultaData.hora,
                profissional: consultaData.nm_profissional || consultaData.nomeProfissional || '',
              });
            }
          } else if (consultaData.dataConsulta) {
            dataConsulta = consultaData.dataConsulta?.toDate ? consultaData.dataConsulta.toDate() : new Date(consultaData.dataConsulta);
            const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
            if (dataConsultaStr === data) {
              const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
              consultasPaciente.push({
                hora: horaStr,
                profissional: consultaData.nm_profissional || consultaData.nomeProfissional || '',
              });
            }
          } else if (consultaData.data_consulta) {
            dataConsulta = consultaData.data_consulta?.toDate ? consultaData.data_consulta.toDate() : new Date(consultaData.data_consulta);
            const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
            if (dataConsultaStr === data) {
              const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
              consultasPaciente.push({
                hora: horaStr,
                profissional: consultaData.nm_profissional || consultaData.nomeProfissional || '',
              });
            }
          }
        });
      } catch (error) {
        console.warn('Erro ao buscar consultas clínicas do paciente:', error);
      }
    } catch (error) {
      console.warn('Erro ao buscar consultas do paciente:', error);
    }

    // Remover duplicatas e ordenar
    const horariosUnicos = Array.from(new Set(horariosDisponiveisList)).sort();
    const horariosOcupadosUnicos = Array.from(new Set(horariosOcupadosList));

    console.log(`✅ Horários processados:`, {
      totalEncontrados: horariosSnap.docs.length,
      disponiveis: horariosUnicos.length,
      ocupados: horariosOcupadosUnicos.length,
      consultasPaciente: consultasPaciente.length,
      horariosDisponiveisList: horariosDisponiveisList,
      horariosUnicos: horariosUnicos,
    });

    return successResponse(res, {
      disponiveis: horariosUnicos,
      ocupados: horariosOcupadosUnicos,
      consultasPaciente: consultasPaciente,
    }, 'Horários carregados com sucesso');
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

