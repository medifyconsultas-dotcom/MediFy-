import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Dashboards - paciente e profissional', () => {
  beforeEach(() => {
    // noop
  });

  it('GET /api/paciente/dashboard - retorna consultas futuras e realizadas', async () => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'p@x' });

    // Criar mocks para consultas futuras e realizadas
    const futureConsulta = { idPaciente: 'pac-uid', dataConsulta: { toDate: () => new Date(Date.now() + 86400000) }, dataCriacao: { toDate: () => new Date() } };
    const doneConsulta = { idPaciente: 'pac-uid', status: 'realizada', dataConsulta: { toDate: () => new Date(Date.now() - 86400000) }, dataCriacao: { toDate: () => new Date() } };

    // Mock genérico para consultas que suporta encadeamento e doc()
    db.collection = (col) => {
      const chain = {};
      chain.where = () => chain;
      chain.orderBy = () => chain;
      chain.limit = () => ({ get: async () => ({ docs: [ { id: '1', data: () => futureConsulta } ] }) });
      chain.get = async () => ({ docs: [ { id: '1', data: () => futureConsulta }, { id: '2', data: () => doneConsulta } ], size: 2 });
      chain.doc = () => ({ get: async () => ({ exists: false }) });

      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'paciente' }) }) }) };
      }

      if (col === 'consultas') {
        return { where: chain.where, orderBy: chain.orderBy, limit: chain.limit, get: chain.get, doc: chain.doc };
      }

      return { where: chain.where, orderBy: chain.orderBy, limit: chain.limit, get: chain.get, doc: chain.doc };
    };

    const res = await request(app)
      .get('/api/paciente/dashboard')
      .set('Authorization', 'Bearer token')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('consultasFuturas');
    expect(res.body.data).toHaveProperty('consultasRealizadas');
  });

  it('GET /api/profissional/dashboard - retorna consultasHoje e stats', async () => {
    auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@x' });

    const consulta1 = { idProfissional: 'prof-uid', status: 'agendada', dataConsulta: { toDate: () => new Date() }, dataCriacao: { toDate: () => new Date() } };
    const consulta2 = { idProfissional: 'prof-uid', status: 'realizada', dataConsulta: { toDate: () => new Date() }, dataCriacao: { toDate: () => new Date() } };

    // Mock genérico para profissional: users e consultas_autonomos
    db.collection = (col) => {
      const chain = {};
      chain.where = () => chain;
      chain.orderBy = () => chain;
      chain.get = async () => ({ docs: [ { id: '1', data: () => consulta1 }, { id: '2', data: () => consulta2 } ], size: 2 });
      chain.doc = () => ({ get: async () => ({ exists: false }) });

      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }) }) };
      }

      if (col === 'consultas_autonomos') {
        return { where: chain.where, orderBy: chain.orderBy, get: chain.get, doc: chain.doc };
      }

      return { where: chain.where, orderBy: chain.orderBy, get: chain.get, doc: chain.doc };
    };

    const res = await request(app)
      .get('/api/profissional/dashboard')
      .set('Authorization', 'Bearer token')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('consultasHoje');
    expect(res.body.data).toHaveProperty('stats');
    expect(res.body.data.stats).toHaveProperty('total');
  });
});
