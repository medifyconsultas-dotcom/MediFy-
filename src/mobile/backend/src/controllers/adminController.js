import admin from 'firebase-admin';
import { COLLECTIONS, USER_PROFILES } from '../config/constants.js';
import { auth, db } from '../config/firebase.js';
import { errorResponse, paginatedResponse, successResponse } from '../utils/response.js';
const { Timestamp } = admin.firestore;

/**
 * Dashboard do admin
 */
export const getDashboard = async (req, res) => {
  try {
    // Contar clínicas
    const clinicasSnap = await db.collection(COLLECTIONS.CLINICAS).get();
    const totalClinicas = clinicasSnap.size;

    // Contar profissionais ativos
    const profissionaisSnap = await db.collection(COLLECTIONS.PROFISSIONAIS).get();
    const totalProfissionais = profissionaisSnap.size;

    // Contar funcionários
    const funcionariosSnap = await db.collection(COLLECTIONS.FUNCIONARIOS).get();
    const totalFuncionarios = funcionariosSnap.size;

    // Contar pacientes
    const pacientesSnap = await db.collection(COLLECTIONS.PACIENTES).get();
    const totalPacientes = pacientesSnap.size;

    // Contar consultas (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const trintaDiasAtrasTimestamp = Timestamp.fromDate(trintaDiasAtras);

    const consultasSnap = await db
      .collection(COLLECTIONS.CONSULTAS)
      .where('dataCriacao', '>=', trintaDiasAtrasTimestamp)
      .get();

    const totalConsultas = consultasSnap.size;

    return successResponse(res, {
      totalClinicas,
      totalProfissionais,
      totalFuncionarios,
      totalPacientes,
      totalConsultas,
    }, 'Dashboard carregado com sucesso');
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Listar clínicas
 */
export const listClinicas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const clinicasSnap = await db.collection(COLLECTIONS.CLINICAS).get();
    const total = clinicasSnap.size;

    const clinicas = clinicasSnap.docs
      .slice(offset, offset + limit)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

    return paginatedResponse(res, clinicas, page, limit, total, 'Clínicas carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao listar clínicas:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Criar clínica
 */
export const createClinica = async (req, res) => {
  try {
    const { nome, email, telefone, endereco, cnpj } = req.body;

    // Verificar se email já existe
    try {
      await auth.getUserByEmail(email);
      return errorResponse(res, 'Email já cadastrado', 'Já existe uma clínica com este email', 409);
    } catch (error) {
      // Email não existe, pode continuar
    }

    // Criar usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password: Math.random().toString(36).slice(-12), // Senha aleatória
      emailVerified: false,
    });

    // Criar clínica no Firestore
    const clinicaData = {
      id: userRecord.uid,
      nome,
      email,
      telefone: telefone || null,
      endereco: endereco || null,
      cnpj: cnpj || null,
      perfil: 'clinica',
      dataCriacao: Timestamp.now(),
    };

    await db.collection(COLLECTIONS.CLINICAS).doc(userRecord.uid).set(clinicaData);
    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(clinicaData);

    return successResponse(res, {
      id: userRecord.uid,
      ...clinicaData,
    }, 'Clínica criada com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar clínica:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Atualizar clínica
 */
export const updateClinica = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const clinicaDoc = await db.collection(COLLECTIONS.CLINICAS).doc(id).get();

    if (!clinicaDoc.exists) {
      return errorResponse(res, 'Clínica não encontrada', 'Clínica não existe', 404);
    }

    await clinicaDoc.ref.update({
      ...updateData,
      dataAtualizacao: Timestamp.now(),
    });

    // Atualizar também na collection users
    await db.collection(COLLECTIONS.USERS).doc(id).update({
      ...updateData,
      dataAtualizacao: Timestamp.now(),
    });

    const clinicaAtualizada = await clinicaDoc.ref.get();

    return successResponse(res, {
      id: clinicaAtualizada.id,
      ...clinicaAtualizada.data(),
    }, 'Clínica atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar clínica:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Listar profissionais
 */
export const listProfissionais = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const profissionaisSnap = await db.collection(COLLECTIONS.PROFISSIONAIS).get();
    const total = profissionaisSnap.size;

    const profissionais = profissionaisSnap.docs
      .slice(offset, offset + limit)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

    return paginatedResponse(res, profissionais, page, limit, total, 'Profissionais carregados com sucesso');
  } catch (error) {
    console.error('Erro ao listar profissionais:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Criar profissional
 */
export const createProfissional = async (req, res) => {
  try {
    const { nome, email, telefone, especialidade, senha } = req.body;

    // Verificar se email já existe
    try {
      await auth.getUserByEmail(email);
      return errorResponse(res, 'Email já cadastrado', 'Já existe um profissional com este email', 409);
    } catch (error) {
      // Email não existe, pode continuar
    }

    // Criar usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password: senha || Math.random().toString(36).slice(-12),
      emailVerified: false,
    });

    // Criar profissional no Firestore
    const profissionalData = {
      id: userRecord.uid,
      nome,
      email,
      telefone: telefone || null,
      especialidade: especialidade || null,
      perfil: USER_PROFILES.PROFISSIONAL,
      idClinica: null, // Profissional autônomo
      dataCriacao: Timestamp.now(),
    };

    await db.collection(COLLECTIONS.PROFISSIONAIS).doc(userRecord.uid).set(profissionalData);
    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(profissionalData);

    return successResponse(res, {
      id: userRecord.uid,
      ...profissionalData,
    }, 'Profissional criado com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar profissional:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

/**
 * Atualizar profissional
 */
export const updateProfissional = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const profissionalDoc = await db.collection(COLLECTIONS.PROFISSIONAIS).doc(id).get();

    if (!profissionalDoc.exists) {
      return errorResponse(res, 'Profissional não encontrado', 'Profissional não existe', 404);
    }

    await profissionalDoc.ref.update({
      ...updateData,
      dataAtualizacao: Timestamp.now(),
    });

    // Atualizar também na collection users
    await db.collection(COLLECTIONS.USERS).doc(id).update({
      ...updateData,
      dataAtualizacao: Timestamp.now(),
    });

    const profissionalAtualizado = await profissionalDoc.ref.get();

    return successResponse(res, {
      id: profissionalAtualizado.id,
      ...profissionalAtualizado.data(),
    }, 'Profissional atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar profissional:', error);
    return errorResponse(res, 'Erro interno', error.message, 500);
  }
};

