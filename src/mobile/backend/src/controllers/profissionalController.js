import admin from 'firebase-admin';
import { COLLECTIONS, CONSULTA_STATUS } from '../config/constants.js';
import { db } from '../config/firebase.js';
import { errorResponse, paginatedResponse, successResponse } from '../utils/response.js';
const { Timestamp } = admin.firestore;

/**
 * Dashboard do profissional
 */
export const getDashboard = async (req, res) => {
  try {
    const profissionalId = req.user.uid;

    // Consultas do dia - buscar todas e filtrar por data
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];

    // Buscar todas as consultas do profissional (tentar múltiplos campos)
    let todasConsultasSnap;
    try {
      // Tentar primeiro com id_profissional (formato do banco)
      todasConsultasSnap = await db
        .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
        .where('id_profissional', '==', profissionalId)
        .get();
    } catch (error) {
      console.log('Erro ao buscar com id_profissional, tentando idProfissional:', error.message);
      try {
        // Tentar com idProfissional
        todasConsultasSnap = await db
          .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
          .where('idProfissional', '==', profissionalId)
          .get();
      } catch (error2) {
        console.log('Erro ao buscar com idProfissional, tentando profissional_uid:', error2.message);
        try {
          // Tentar com profissional_uid
          todasConsultasSnap = await db
            .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
            .where('profissional_uid', '==', profissionalId)
            .get();
        } catch (error3) {
          console.log('Erro ao buscar com profissional_uid, buscando todas e filtrando:', error3.message);
          // Se ainda falhar, buscar todas e filtrar manualmente
          const allDocs = await db.collection(COLLECTIONS.CONSULTAS_AUTONOMOS).get();
          todasConsultasSnap = {
            docs: allDocs.docs.filter(doc => {
              const data = doc.data();
              return data.idProfissional === profissionalId || 
                     data.profissional_uid === profissionalId ||
                     data.id_profissional === profissionalId;
            })
          };
        }
      }
    }
    
    console.log(`Total de consultas encontradas: ${todasConsultasSnap.docs.length}`);
    
    // Filtrar consultas do dia de hoje e preparar dados
    const consultasComDados = await Promise.all(
      todasConsultasSnap.docs.map(async (doc) => {
        const data = doc.data();
        // Verificar se tem data e hora separados ou dataConsulta
        let dataConsulta = null;
        let dataStr = null;
        
        if (data.data && data.hora) {
          // Formato: data (YYYY-MM-DD) e hora (HH:MM)
          dataStr = data.data;
          try {
            const [ano, mes, dia] = data.data.split('-');
            const [hora, minuto] = data.hora.split(':');
            dataConsulta = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto));
          } catch (e) {
            console.warn('Erro ao parsear data/hora:', e);
          }
        } else if (data.dataConsulta) {
          // Formato: Timestamp
          dataConsulta = data.dataConsulta?.toDate ? data.dataConsulta.toDate() : new Date(data.dataConsulta);
          dataStr = dataConsulta.toISOString().split('T')[0];
        } else if (data.data_consulta) {
          dataConsulta = data.data_consulta?.toDate ? data.data_consulta.toDate() : new Date(data.data_consulta);
          dataStr = dataConsulta.toISOString().split('T')[0];
        }
        
        // Buscar nome do paciente
        let pacienteNome = data.paciente_nome || data.nomePaciente || data.nm_paciente;
        
        // Se não tiver o nome na consulta, buscar do documento do paciente
        if (!pacienteNome && (data.id_paciente || data.idPaciente)) {
          try {
            const pacienteId = data.id_paciente || data.idPaciente;
            const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(pacienteId).get();
            if (pacienteDoc.exists) {
              const pacienteData = pacienteDoc.data();
              pacienteNome = pacienteData.nome || 'Paciente';
              console.log(`Nome do paciente encontrado: ${pacienteNome} (ID: ${pacienteId})`);
            } else {
              console.warn(`Paciente não encontrado: ${pacienteId}`);
            }
          } catch (e) {
            console.warn('Erro ao buscar nome do paciente:', e);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          data: dataStr || data.data,
          hora: data.hora,
          dataConsulta: dataConsulta,
          paciente_nome: pacienteNome || 'Paciente',
          nomePaciente: pacienteNome || 'Paciente',
          nm_paciente: pacienteNome || 'Paciente',
        };
      })
    );
    
    // Filtrar consultas do dia de hoje
    const consultasHoje = consultasComDados
      .filter(c => {
        if (!c.data) return false;
        const consultaDataStr = c.data;
        return consultaDataStr >= hojeStr && consultaDataStr < amanhaStr;
      })
      .sort((a, b) => {
        if (a.dataConsulta && b.dataConsulta) {
          return a.dataConsulta.getTime() - b.dataConsulta.getTime();
        }
        if (a.hora && b.hora) {
          return a.hora.localeCompare(b.hora);
        }
        return 0;
      });

    // Estatísticas - normalizar status para minúsculas para comparação
    const todasConsultas = todasConsultasSnap.docs.map(doc => {
      const data = doc.data();
      const statusRaw = data.status || '';
      const statusNormalizado = String(statusRaw).toLowerCase().trim();
      return {
        ...data,
        status: statusNormalizado
      };
    });

    console.log('📊 Total de consultas para stats:', todasConsultas.length);
    console.log('📊 Status encontrados (primeiros 10):', todasConsultas.slice(0, 10).map(c => ({ id: c.id, status: c.status, statusRaw: c.status })));

    const stats = {
      total: todasConsultas.length,
      agendadas: todasConsultas.filter(c => {
        const status = String(c.status || '').toLowerCase().trim();
        return status === 'agendada' || status === CONSULTA_STATUS.AGENDADA?.toLowerCase();
      }).length,
      confirmadas: todasConsultas.filter(c => {
        const status = String(c.status || '').toLowerCase().trim();
        return status === 'confirmada' || status === CONSULTA_STATUS.CONFIRMADA?.toLowerCase();
      }).length,
      realizadas: todasConsultas.filter(c => {
        const status = String(c.status || '').toLowerCase().trim();
        return status === 'realizada' || status === CONSULTA_STATUS.REALIZADA?.toLowerCase();
      }).length,
      canceladas: todasConsultas.filter(c => {
        const status = String(c.status || '').toLowerCase().trim();
        return status === 'cancelada' || status === CONSULTA_STATUS.CANCELADA?.toLowerCase();
      }).length,
    };

    console.log('📊 Stats calculados no backend:', stats);
    console.log('📊 Detalhamento por status:');
    todasConsultas.forEach(c => {
      console.log(`  - ID: ${c.id}, Status: "${c.status}" (tipo: ${typeof c.status})`);
    });

    return successResponse(res, {
      consultasHoje,
      stats,
    }, 'Dashboard carregado com sucesso');
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Listar todas as consultas do profissional
 */
export const getConsultas = async (req, res) => {
  try {
    const profissionalId = req.user.uid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const offset = (page - 1) * limit;

    // Buscar consultas (tentar múltiplos campos)
    let consultasSnap;
    try {
      // Tentar primeiro com id_profissional (formato do banco)
      let consultasQuery = db
        .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
        .where('id_profissional', '==', profissionalId);
      
      if (status) {
        consultasQuery = consultasQuery.where('status', '==', status);
      }
      
      consultasSnap = await consultasQuery.get();
    } catch (error) {
      console.log('Erro ao buscar com id_profissional, tentando idProfissional:', error.message);
      try {
        let consultasQuery = db
          .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
          .where('idProfissional', '==', profissionalId);
        
        if (status) {
          consultasQuery = consultasQuery.where('status', '==', status);
        }
        
        consultasSnap = await consultasQuery.get();
      } catch (error2) {
        console.log('Erro ao buscar com idProfissional, buscando todas e filtrando:', error2.message);
        // Se ainda falhar, buscar todas e filtrar manualmente
        const allDocs = await db.collection(COLLECTIONS.CONSULTAS_AUTONOMOS).get();
        consultasSnap = {
          docs: allDocs.docs.filter(doc => {
            const data = doc.data();
            const matchesProfissional = data.idProfissional === profissionalId || 
                   data.profissional_uid === profissionalId ||
                   data.id_profissional === profissionalId;
            const matchesStatus = !status || data.status === status;
            return matchesProfissional && matchesStatus;
          })
        };
      }
    }

    const total = consultasSnap.docs.length;

    // Buscar nomes dos pacientes e preparar dados
    const consultasComDados = await Promise.all(
      consultasSnap.docs
        .slice(offset, offset + limit)
        .map(async (doc) => {
          const data = doc.data();
          
          // Buscar nome do paciente
          let pacienteNome = data.paciente_nome || data.nomePaciente || data.nm_paciente;
          
          // Se não tiver o nome na consulta, buscar do documento do paciente
          if (!pacienteNome && (data.id_paciente || data.idPaciente)) {
            try {
              const pacienteId = data.id_paciente || data.idPaciente;
              const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(pacienteId).get();
              if (pacienteDoc.exists) {
                const pacienteData = pacienteDoc.data();
                pacienteNome = pacienteData.nome || 'Paciente';
              }
            } catch (e) {
              console.warn('Erro ao buscar nome do paciente:', e);
            }
          }
          
          // Processar data
          let dataConsulta = null;
          if (data.dataConsulta) {
            dataConsulta = data.dataConsulta?.toDate ? data.dataConsulta.toDate() : new Date(data.dataConsulta);
          } else if (data.data && data.hora) {
            try {
              const [ano, mes, dia] = data.data.split('-');
              const [hora, minuto] = data.hora.split(':');
              dataConsulta = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto));
            } catch (e) {
              console.warn('Erro ao parsear data/hora:', e);
            }
          } else if (data.data_consulta) {
            dataConsulta = data.data_consulta?.toDate ? data.data_consulta.toDate() : new Date(data.data_consulta);
          }
          
          return {
            id: doc.id,
            ...data,
            dataConsulta: dataConsulta,
            dataCriacao: data.dataCriacao?.toDate(),
            paciente_nome: pacienteNome || 'Paciente',
            nomePaciente: pacienteNome || 'Paciente',
            nm_paciente: pacienteNome || 'Paciente',
          };
        })
    );

    // Ordenar por data (mais recente primeiro)
    consultasComDados.sort((a, b) => {
      if (a.dataConsulta && b.dataConsulta) {
        return b.dataConsulta.getTime() - a.dataConsulta.getTime();
      }
      return 0;
    });

    return paginatedResponse(res, consultasComDados, page, limit, total, 'Consultas carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao buscar consultas:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Detalhes de uma consulta
 */
export const getConsultaDetalhes = async (req, res) => {
  try {
    const { id } = req.params;
    const profissionalId = req.user.uid;

    const consultaDoc = await db.collection(COLLECTIONS.CONSULTAS_AUTONOMOS).doc(id).get();

    if (!consultaDoc.exists) {
      return errorResponse(res, 'Consulta não encontrada', 'Consulta não existe', 404);
    }

    const consultaData = consultaDoc.data();

    // Verificar se a consulta pertence ao profissional
    if (consultaData.idProfissional !== profissionalId) {
      return errorResponse(res, 'Acesso negado', 'Esta consulta não pertence a você', 403);
    }

    return successResponse(res, {
      id: consultaDoc.id,
      ...consultaData,
      dataConsulta: consultaData.dataConsulta?.toDate(),
      dataCriacao: consultaData.dataCriacao?.toDate(),
    }, 'Consulta encontrada');
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Buscar prontuário do paciente
 */
export const getProntuario = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const profissionalId = req.user.uid;

    // Buscar prontuário
    const prontuariosQuery = db
      .collection(COLLECTIONS.PRONTUARIOS)
      .where('idPaciente', '==', idPaciente)
      .where('idProfissional', '==', profissionalId)
      .limit(1);

    const prontuariosSnap = await prontuariosQuery.get();

    if (prontuariosSnap.empty) {
      return successResponse(res, null, 'Nenhum prontuário encontrado');
    }

    const prontuarioDoc = prontuariosSnap.docs[0];
    const prontuarioData = prontuarioDoc.data();

    return successResponse(res, {
      id: prontuarioDoc.id,
      ...prontuarioData,
      dataRegistro: prontuarioData.dataRegistro?.toDate(),
      dataAtualizacao: prontuarioData.dataAtualizacao?.toDate(),
      historico: prontuarioData.historico?.map(h => ({
        ...h,
        data: h.data?.toDate(),
      })) || [],
    }, 'Prontuário encontrado');
  } catch (error) {
    console.error('Erro ao buscar prontuário:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Adicionar observação ao prontuário
 */
export const addObservacao = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const profissionalId = req.user.uid;
    const { observacao } = req.validatedData;

    // Buscar prontuário existente
    const prontuariosQuery = db
      .collection(COLLECTIONS.PRONTUARIOS)
      .where('idPaciente', '==', idPaciente)
      .where('idProfissional', '==', profissionalId)
      .limit(1);

    const prontuariosSnap = await prontuariosQuery.get();

    // Buscar dados do profissional
    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).get();
    const profissionalData = profissionalDoc.exists ? profissionalDoc.data() : null;

    // Buscar dados do paciente
    const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(idPaciente).get();
    if (!pacienteDoc.exists) {
      return errorResponse(res, 'Paciente não encontrado', 'Paciente inválido', 404);
    }
    const pacienteData = pacienteDoc.data();

    const novaObservacao = {
      data: Timestamp.now(),
      profissional: profissionalData?.nome || req.user.email,
      observacao,
    };

    if (prontuariosSnap.empty) {
      // Criar novo prontuário
      const novoProntuario = {
        idPaciente,
        nomePaciente: pacienteData.nome,
        idProfissional: profissionalId,
        nomeProfissional: profissionalData?.nome || req.user.email,
        idClinica: null,
        observacoes: observacao,
        historico: [novaObservacao],
        dataRegistro: Timestamp.now(),
        dataAtualizacao: Timestamp.now(),
      };

      const prontuarioRef = await db.collection(COLLECTIONS.PRONTUARIOS).add(novoProntuario);

      return successResponse(res, {
        id: prontuarioRef.id,
        ...novoProntuario,
        dataRegistro: novoProntuario.dataRegistro.toDate(),
        dataAtualizacao: novoProntuario.dataAtualizacao.toDate(),
        historico: novoProntuario.historico.map(h => ({
          ...h,
          data: h.data.toDate(),
        })),
      }, 'Observação adicionada com sucesso', 201);
    } else {
      // Atualizar prontuário existente
      const prontuarioDoc = prontuariosSnap.docs[0];
      const prontuarioData = prontuarioDoc.data();
      const historico = prontuarioData.historico || [];

      await prontuarioDoc.ref.update({
        observacoes: observacao,
        historico: [...historico, novaObservacao],
        dataAtualizacao: Timestamp.now(),
      });

      // Buscar prontuário atualizado
      const prontuarioAtualizado = await prontuarioDoc.ref.get();

      return successResponse(res, {
        id: prontuarioAtualizado.id,
        ...prontuarioAtualizado.data(),
        dataRegistro: prontuarioAtualizado.data().dataRegistro?.toDate(),
        dataAtualizacao: prontuarioAtualizado.data().dataAtualizacao?.toDate(),
        historico: prontuarioAtualizado.data().historico?.map(h => ({
          ...h,
          data: h.data?.toDate(),
        })) || [],
      }, 'Observação adicionada com sucesso');
    }
  } catch (error) {
    console.error('Erro ao adicionar observação:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Atualizar status da consulta
 */
export const updateStatusConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const profissionalId = req.user.uid;

    // Validar status
    const statusValidos = Object.values(CONSULTA_STATUS);
    if (!statusValidos.includes(status)) {
      return errorResponse(res, 'Status inválido', `Status deve ser um dos: ${statusValidos.join(', ')}`, 400);
    }

    const consultaDoc = await db.collection(COLLECTIONS.CONSULTAS_AUTONOMOS).doc(id).get();

    if (!consultaDoc.exists) {
      return errorResponse(res, 'Consulta não encontrada', 'Consulta não existe', 404);
    }

    const consultaData = consultaDoc.data();

    // Verificar se a consulta pertence ao profissional (verificar múltiplos campos)
    const pertenceAoProfissional = 
      consultaData.idProfissional === profissionalId ||
      consultaData.id_profissional === profissionalId ||
      consultaData.profissional_uid === profissionalId;

    if (!pertenceAoProfissional) {
      return errorResponse(res, 'Acesso negado', 'Esta consulta não pertence a você', 403);
    }

    // Atualizar status
    await consultaDoc.ref.update({
      status,
      dataAtualizacao: Timestamp.now(),
    });

    // Buscar consulta atualizada
    const consultaAtualizada = await consultaDoc.ref.get();

    return successResponse(res, {
      id: consultaAtualizada.id,
      ...consultaAtualizada.data(),
      dataConsulta: consultaAtualizada.data().dataConsulta?.toDate(),
      dataCriacao: consultaAtualizada.data().dataCriacao?.toDate(),
    }, 'Status atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Atualizar perfil do profissional
 */
export const updatePerfil = async (req, res) => {
  try {
    const profissionalId = req.user.uid;
    const updateData = req.validatedData;

    // Atualizar no Firestore
    await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).update({
      ...updateData,
      dataAtualizacao: Timestamp.now(),
    });

    // Atualizar também na collection users
    await db.collection(COLLECTIONS.USERS).doc(profissionalId).update({
      ...updateData,
      dataAtualizacao: Timestamp.now(),
    });

    // Buscar dados atualizados
    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).get();

    return successResponse(res, {
      id: profissionalDoc.id,
      ...profissionalDoc.data(),
    }, 'Perfil atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Buscar perfil do profissional
 */
export const getPerfil = async (req, res) => {
  try {
    const profissionalId = req.user.uid;

    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).get();

    if (!profissionalDoc.exists) {
      return errorResponse(res, 'Profissional não encontrado', 'Perfil não existe', 404);
    }

    return successResponse(res, {
      id: profissionalDoc.id,
      ...profissionalDoc.data(),
    }, 'Perfil carregado com sucesso');
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Criar nova consulta
 */
export const createConsulta = async (req, res) => {
  try {
    const profissionalId = req.user.uid;
    const { idPaciente, dataConsulta, horaConsulta, status, observacoes } = req.validatedData;

    // Buscar dados do paciente
    const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(idPaciente).get();
    if (!pacienteDoc.exists) {
      return errorResponse(res, 'Paciente não encontrado', 'Paciente inválido', 404);
    }
    const pacienteData = pacienteDoc.data();

    // Buscar dados do profissional
    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).get();
    const profissionalData = profissionalDoc.exists ? profissionalDoc.data() : null;

    // Validar se a data não é no passado
    const dataHora = new Date(`${dataConsulta}T${horaConsulta}`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataHora < hoje) {
      return errorResponse(res, 'Data inválida', 'Não é possível agendar consultas no passado', 400);
    }

    // Criar consulta
    const consultaData = {
      id_paciente: idPaciente,
      nm_paciente: pacienteData.nome,
      id_profissional: profissionalId,
      nm_profissional: profissionalData?.nome || req.user.email,
      id_clinica: null,
      data_consulta: `${dataConsulta} ${horaConsulta}`,
      status: (status || 'agendada').charAt(0).toUpperCase() + (status || 'agendada').slice(1),
      obs: observacoes || '',
      created_at: Timestamp.now(),
      tipo_atendimento: 'autonomo',
    };

    const consultaRef = await db.collection(COLLECTIONS.CONSULTAS_AUTONOMOS).add(consultaData);
    await consultaRef.update({ id: consultaRef.id });

    return successResponse(res, {
      id: consultaRef.id,
      ...consultaData,
      dataConsulta: dataHora,
    }, 'Consulta criada com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar consulta:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Criar novo prontuário completo
 */
export const createProntuario = async (req, res) => {
  try {
    const profissionalId = req.user.uid;
    const prontuarioData = req.validatedData;

    // Buscar dados do paciente
    const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(prontuarioData.idPaciente).get();
    if (!pacienteDoc.exists) {
      return errorResponse(res, 'Paciente não encontrado', 'Paciente inválido', 404);
    }
    const pacienteData = pacienteDoc.data();

    // Buscar dados do profissional
    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).get();
    const profissionalData = profissionalDoc.exists ? profissionalDoc.data() : null;

    // Criar prontuário
    const novoProntuario = {
      idPaciente: prontuarioData.idPaciente,
      nomePaciente: pacienteData.nome,
      dataNascimento: pacienteData.dataNascimento || null,
      telefone: pacienteData.telefone || '',
      cpf: pacienteData.cpf || '',
      idProfissional: profissionalId,
      nomeProfissional: profissionalData?.nome || req.user.email,
      idClinica: null,
      titulo: prontuarioData.titulo || null,
      conteudo: prontuarioData.conteudo || null,
      anamnese: prontuarioData.anamnese || null,
      exame_fisico: prontuarioData.exame_fisico || null,
      sinais_vitais: prontuarioData.sinais_vitais || null,
      diagnosticos: prontuarioData.diagnosticos || null,
      prescricoes: prontuarioData.prescricoes || null,
      medicamentos: prontuarioData.medicamentos || null,
      alergias: prontuarioData.alergias || null,
      antecedentes: prontuarioData.antecedentes || null,
      exames_solicitados: prontuarioData.exames_solicitados || null,
      plano: prontuarioData.plano || null,
      follow_up: prontuarioData.follow_up || null,
      observacoes: prontuarioData.observacoes?.trim() || null,
      historico: prontuarioData.observacoes?.trim() ? [
        {
          data: Timestamp.now(),
          profissional: profissionalData?.nome || req.user.email,
          observacao: prontuarioData.observacoes.trim(),
        },
      ] : [],
      dataRegistro: Timestamp.now(),
      dataAtualizacao: Timestamp.now(),
    };

    const prontuarioRef = await db.collection(COLLECTIONS.PRONTUARIOS).add(novoProntuario);

    return successResponse(res, {
      id: prontuarioRef.id,
      ...novoProntuario,
      dataRegistro: novoProntuario.dataRegistro.toDate(),
      dataAtualizacao: novoProntuario.dataAtualizacao.toDate(),
      historico: novoProntuario.historico.map(h => ({
        ...h,
        data: h.data.toDate(),
      })),
    }, 'Prontuário criado com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar prontuário:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Listar prontuários do profissional
 */
export const getProntuarios = async (req, res) => {
  try {
    const profissionalId = req.user.uid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log(`Buscando prontuários para profissional: ${profissionalId}`);

    // Buscar prontuários do profissional (sem filtro de idClinica para evitar índice composto)
    let prontuariosSnap;
    try {
      prontuariosSnap = await db
        .collection(COLLECTIONS.PRONTUARIOS)
        .where('idProfissional', '==', profissionalId)
        .get();
    } catch (error) {
      console.log('Erro ao buscar prontuários, tentando buscar todos e filtrar:', error.message);
      // Se falhar, buscar todas e filtrar manualmente
      const allDocs = await db.collection(COLLECTIONS.PRONTUARIOS).get();
      prontuariosSnap = {
        docs: allDocs.docs.filter(doc => {
          const data = doc.data();
          return data.idProfissional === profissionalId;
        })
      };
    }
    
    console.log(`Total de prontuários encontrados: ${prontuariosSnap.docs.length}`);
    
    // Filtrar por idClinica === null e ordenar manualmente
    let prontuarios = prontuariosSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataRegistro: data.dataRegistro?.toDate ? data.dataRegistro.toDate() : (data.dataRegistro instanceof Date ? data.dataRegistro : new Date()),
          dataAtualizacao: data.dataAtualizacao?.toDate ? data.dataAtualizacao.toDate() : (data.dataAtualizacao instanceof Date ? data.dataAtualizacao : new Date()),
          historico: (data.historico || []).map((h) => ({
            ...h,
            data: h.data?.toDate ? h.data.toDate() : (h.data instanceof Date ? h.data : new Date()),
          })),
        };
      })
      .filter(p => p.idClinica === null || p.idClinica === undefined)
      .sort((a, b) => {
        // Ordenar por dataAtualizacao descendente
        const dataA = a.dataAtualizacao || new Date(0);
        const dataB = b.dataAtualizacao || new Date(0);
        return dataB.getTime() - dataA.getTime();
      });

    console.log(`Prontuários após filtro: ${prontuarios.length}`);

    const total = prontuarios.length;
    const paginatedProntuarios = prontuarios.slice(offset, offset + limit);

    console.log(`Prontuários paginados: ${paginatedProntuarios.length}`);

    return paginatedResponse(res, paginatedProntuarios, page, limit, total, 'Prontuários carregados com sucesso');
  } catch (error) {
    console.error('Erro ao buscar prontuários:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Atualizar prontuário completo
 */
export const updateProntuario = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const profissionalId = req.user.uid;
    const prontuarioData = req.validatedData;

    // Buscar prontuário existente
    const prontuariosQuery = db
      .collection(COLLECTIONS.PRONTUARIOS)
      .where('idPaciente', '==', idPaciente)
      .where('idProfissional', '==', profissionalId)
      .limit(1);

    const prontuariosSnap = await prontuariosQuery.get();

    if (prontuariosSnap.empty) {
      return errorResponse(res, 'Prontuário não encontrado', 'Prontuário não existe', 404);
    }

    const prontuarioDoc = prontuariosSnap.docs[0];
    const prontuarioAtual = prontuarioDoc.data();

    // Processar histórico
    let historicoParaSalvar = prontuarioData.historico || prontuarioAtual.historico || [];
    
    // Converter datas do histórico para Timestamp
    historicoParaSalvar = historicoParaSalvar.map(h => {
      let dataTimestamp;
      if (h.data instanceof Date) {
        dataTimestamp = Timestamp.fromDate(h.data);
      } else if (h.data && typeof h.data === 'object' && 'toDate' in h.data) {
        dataTimestamp = h.data;
      } else if (h.data) {
        dataTimestamp = Timestamp.fromDate(new Date(h.data));
      } else {
        dataTimestamp = Timestamp.now();
      }
      
      return {
        data: dataTimestamp,
        profissional: h.profissional || prontuarioAtual.nomeProfissional || req.user.email,
        observacao: h.observacao || '',
      };
    });

    // Se houver nova observação, SEMPRE adicionar ao histórico
    // O campo de observações é sempre tratado como uma NOVA observação
    if (prontuarioData.observacoes && prontuarioData.observacoes.trim()) {
      historicoParaSalvar.push({
        data: Timestamp.now(),
        profissional: prontuarioAtual.nomeProfissional || req.user.email,
        observacao: prontuarioData.observacoes.trim(),
      });
    }

    // Buscar dados do profissional
    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(profissionalId).get();
    const profissionalData = profissionalDoc.exists ? profissionalDoc.data() : null;

    // Atualizar prontuário
    await prontuarioDoc.ref.update({
      titulo: prontuarioData.titulo !== undefined ? prontuarioData.titulo : prontuarioAtual.titulo,
      conteudo: prontuarioData.conteudo !== undefined ? prontuarioData.conteudo : prontuarioAtual.conteudo,
      anamnese: prontuarioData.anamnese !== undefined ? prontuarioData.anamnese : prontuarioAtual.anamnese,
      exame_fisico: prontuarioData.exame_fisico !== undefined ? prontuarioData.exame_fisico : prontuarioAtual.exame_fisico,
      sinais_vitais: prontuarioData.sinais_vitais !== undefined ? prontuarioData.sinais_vitais : prontuarioAtual.sinais_vitais,
      diagnosticos: prontuarioData.diagnosticos !== undefined ? prontuarioData.diagnosticos : prontuarioAtual.diagnosticos,
      prescricoes: prontuarioData.prescricoes !== undefined ? prontuarioData.prescricoes : prontuarioAtual.prescricoes,
      medicamentos: prontuarioData.medicamentos !== undefined ? prontuarioData.medicamentos : prontuarioAtual.medicamentos,
      alergias: prontuarioData.alergias !== undefined ? prontuarioData.alergias : prontuarioAtual.alergias,
      antecedentes: prontuarioData.antecedentes !== undefined ? prontuarioData.antecedentes : prontuarioAtual.antecedentes,
      exames_solicitados: prontuarioData.exames_solicitados !== undefined ? prontuarioData.exames_solicitados : prontuarioAtual.exames_solicitados,
      plano: prontuarioData.plano !== undefined ? prontuarioData.plano : prontuarioAtual.plano,
      follow_up: prontuarioData.follow_up !== undefined ? prontuarioData.follow_up : prontuarioAtual.follow_up,
      observacoes: prontuarioData.observacoes !== undefined ? prontuarioData.observacoes.trim() : prontuarioAtual.observacoes,
      historico: historicoParaSalvar,
      dataAtualizacao: Timestamp.now(),
    });

    // Buscar prontuário atualizado
    const prontuarioAtualizado = await prontuarioDoc.ref.get();

    return successResponse(res, {
      id: prontuarioAtualizado.id,
      ...prontuarioAtualizado.data(),
      dataRegistro: prontuarioAtualizado.data().dataRegistro?.toDate(),
      dataAtualizacao: prontuarioAtualizado.data().dataAtualizacao?.toDate(),
      historico: prontuarioAtualizado.data().historico?.map(h => ({
        ...h,
        data: h.data?.toDate(),
      })) || [],
    }, 'Prontuário atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar prontuário:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Buscar pacientes vinculados ao profissional
 */
export const getPacientes = async (req, res) => {
  try {
    const profissionalId = req.user.uid;

    // Buscar pacientes que já tiveram consultas com o profissional
    const consultasQuery = db
      .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
      .where('id_profissional', '==', profissionalId);

    const consultasSnap = await consultasQuery.get();
    const pacientesIds = new Set();
    
    consultasSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.id_paciente) {
        pacientesIds.add(data.id_paciente);
      }
    });

    // Buscar dados dos pacientes
    const pacientes = [];
    for (const pacienteId of pacientesIds) {
      const pacienteDoc = await db.collection(COLLECTIONS.PACIENTES).doc(pacienteId).get();
      if (pacienteDoc.exists) {
        pacientes.push({
          id: pacienteDoc.id,
          ...pacienteDoc.data(),
        });
      }
    }

    return successResponse(res, pacientes, 'Pacientes carregados com sucesso');
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Buscar horários disponíveis do profissional
 */
export const getHorariosDisponiveis = async (req, res) => {
  try {
    const profissionalId = req.user.uid;
    const { data } = req.query; // Data no formato YYYY-MM-DD

    if (!data) {
      return errorResponse(res, 'Data obrigatória', 'É necessário informar a data (YYYY-MM-DD)', 400);
    }

    // Buscar horários do profissional
    const horariosRef = db.collection('profissionais').doc(profissionalId).collection('horarios');
    const horariosSnap = await horariosRef.get();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const horariosDisponiveisList = [];
    const horariosOcupadosList = [];

    // Processar horários disponíveis
    horariosSnap.docs.forEach(doc => {
      const horarioData = doc.data();
      
      // Horários recorrentes (por dia da semana)
      if (horarioData.tipo === 'recorrente' && horarioData.diaSemana !== undefined) {
        const dataObj = new Date(data + 'T00:00:00');
        const diaSemanaData = dataObj.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
        
        const horarioDiaSemana = Number(horarioData.diaSemana);
        
        // Verificar se o dia da semana da data selecionada corresponde ao horário recorrente
        if (diaSemanaData === horarioDiaSemana && dataObj >= hoje) {
          if (horarioData.disponivel !== false && horarioData.hora) {
            horariosDisponiveisList.push(horarioData.hora);
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
        
        if (horarioDataFormatada === data) {
          const dataObj = new Date(horarioDataFormatada + 'T00:00:00');
          if (dataObj >= hoje && horarioData.disponivel !== false && horarioData.hora) {
            horariosDisponiveisList.push(horarioData.hora);
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

    // Buscar horários ocupados (consultas agendadas/confirmadas)
    try {
      const consultasQuery = db
        .collection(COLLECTIONS.CONSULTAS_AUTONOMOS)
        .where('id_profissional', '==', profissionalId);
      
      const consultasSnap = await consultasQuery.get();
      
      consultasSnap.docs.forEach(doc => {
        const consultaData = doc.data();
        let dataConsulta = null;
        
        if (consultaData.data && consultaData.hora) {
          // Formato: data (YYYY-MM-DD) e hora (HH:MM)
          const dataStr = consultaData.data;
          if (dataStr === data) {
            horariosOcupadosList.push(consultaData.hora);
          }
        } else if (consultaData.dataConsulta) {
          // Formato: Timestamp
          dataConsulta = consultaData.dataConsulta?.toDate ? consultaData.dataConsulta.toDate() : new Date(consultaData.dataConsulta);
          const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
          if (dataConsultaStr === data) {
            const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
            horariosOcupadosList.push(horaStr);
          }
        } else if (consultaData.data_consulta) {
          dataConsulta = consultaData.data_consulta?.toDate ? consultaData.data_consulta.toDate() : new Date(consultaData.data_consulta);
          const dataConsultaStr = dataConsulta.toISOString().split('T')[0];
          if (dataConsultaStr === data) {
            const horaStr = dataConsulta.toTimeString().split(' ')[0].substring(0, 5);
            horariosOcupadosList.push(horaStr);
          }
        }
      });
    } catch (error) {
      console.warn('Erro ao buscar consultas ocupadas:', error);
    }

    // Remover duplicatas e ordenar
    const horariosUnicos = Array.from(new Set(horariosDisponiveisList)).sort();
    const horariosOcupadosUnicos = Array.from(new Set(horariosOcupadosList));

    return successResponse(res, {
      disponiveis: horariosUnicos,
      ocupados: horariosOcupadosUnicos,
    }, 'Horários carregados com sucesso');
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

