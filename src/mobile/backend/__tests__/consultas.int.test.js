import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Consultas - agendamento, status e prontuários', () => {
  beforeEach(() => {
    // noop
  });

  it('POST /api/paciente/consultas - agendar sucesso (201)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'p@x' });

    // mocks: paciente exists
    db.collection = (col) => {
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }) }) };
      }
      if (col === 'pacientes') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }) }) };
      }

      if (col === 'profissionais') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ nome: 'Dr X' }) }) }) };
      }

      if (col === 'consultas') {
        // conflito query returns empty (empty: true)
        const chain = {};
        chain.where = () => chain;
        chain.orderBy = () => chain;
        chain.get = async () => ({ docs: [], empty: true });

        return {
          where: () => chain,
          add: async (data) => ({ id: 'new-consulta', ...data }),
        };
      }

      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .post('/api/paciente/consultas')
      .set('Authorization', 'Bearer token')
      .send({ idProfissional: 'prof-1', dataConsulta: new Date().toISOString(), observacoes: 'teste' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('nomePaciente');
  });

  it('POST /api/paciente/consultas - conflito de horário (409)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'p@x' });

    db.collection = (col) => {
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }) }) };
      }
      if (col === 'pacientes') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }) }) };
      }

      if (col === 'profissionais') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ nome: 'Dr X' }) }) }) };
      }

      if (col === 'consultas') {
        const chain = {};
        chain.where = () => chain;
        chain.orderBy = () => chain;
        chain.get = async () => ({ docs: [ { id: 'c1' } ], empty: false });
        return { where: () => chain };
      }

      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .post('/api/paciente/consultas')
      .set('Authorization', 'Bearer token')
      .send({ idProfissional: 'prof-1', dataConsulta: new Date().toISOString(), observacoes: 'teste' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(409);
  });

  it('PATCH /api/profissional/consultas/:id/status - atualiza status com sucesso (200)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@x' });

    // Mock consulta pertence ao profissional
    db.collection = (col) => {
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }) }) };
      }
      if (col === 'consultas_autonomos') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ idProfissional: 'prof-uid', status: 'agendada' }), ref: { update: async () => ({}), get: async () => ({ id: 'consulta-1', data: () => ({ idProfissional: 'prof-uid', status: 'confirmada' }) }) } }) }) };
      }

      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .patch('/api/profissional/consultas/consulta-1/status')
      .set('Authorization', 'Bearer token')
      .send({ status: 'confirmada' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('status', 'confirmada');
  });

  it('POST /api/profissional/prontuarios/:idPaciente/observacoes - cria novo prontuário (201)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@x' });

    db.collection = (col) => {
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }) }) };
      }
      if (col === 'prontuarios') {
        const chain = {};
        chain.where = () => chain;
        chain.limit = () => ({ get: async () => ({ empty: true, docs: [] }) });
        chain.get = async () => ({ empty: true, docs: [] });
        return { where: () => chain, add: async (d) => ({ id: 'pront-1', ...d }) };
      }

      if (col === 'profissionais') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ nome: 'Dr Test' }) }) }) };
      }

      if (col === 'pacientes') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ nome: 'Paciente' }) }) }) };
      }

      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .post('/api/profissional/prontuarios/pac-1/observacoes')
      .set('Authorization', 'Bearer token')
      .send({ observacao: 'Nova observação' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('historico');
  });
});
