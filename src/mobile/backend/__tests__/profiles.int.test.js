import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Perfis - paciente e profissional', () => {
  beforeEach(() => {
    // noop
  });

  it('PUT /api/paciente/perfil - atualiza perfil do paciente (200)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'pac-uid', email: 'p@x' });

    let storedPaciente = { nome: 'Antigo', perfil: 'paciente' };
    let storedUser = { nome: 'Antigo', perfil: 'paciente' };

    db.collection = (col) => {
      if (col === 'users') {
        return {
          doc: () => ({
            update: async (d) => { storedUser = { ...storedUser, ...d }; },
            get: async () => ({ exists: true, id: 'pac-uid', data: () => storedUser }),
          }),
        };
      }

      if (col === 'pacientes') {
        return {
          doc: () => ({
            update: async (d) => { storedPaciente = { ...storedPaciente, ...d }; },
            get: async () => ({ exists: true, id: 'pac-uid', data: () => storedPaciente }),
          }),
        };
      }

      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .put('/api/paciente/perfil')
      .set('Authorization', 'Bearer token')
      .send({ nome: 'NovoNome', telefone: '999' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('nome', 'NovoNome');
    expect(res.body.data).toHaveProperty('id');
  });

  it('GET /api/profissional/perfil - retorna 200 com perfil', async () => {
    auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@x' });

    db.collection = (col) => {
      if (col === 'users') {
        return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ perfil: 'profissional' }) }) }) };
      }

      if (col === 'profissionais') {
        return { doc: () => ({ get: async () => ({ exists: true, id: 'prof-uid', data: () => ({ nome: 'Dr. Teste' }) }) }) };
      }

      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .get('/api/profissional/perfil')
      .set('Authorization', 'Bearer token')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('nome', 'Dr. Teste');
    expect(res.body.data).toHaveProperty('id');
  });

  it('PUT /api/profissional/perfil - atualiza perfil do profissional (200)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'prof-uid', email: 'prof@x' });

    let storedProf = { nome: 'Velho', perfil: 'profissional' };
    let storedUser = { nome: 'Velho', perfil: 'profissional' };

    db.collection = (col) => {
      if (col === 'users') {
        return {
          doc: () => ({
            update: async (d) => { storedUser = { ...storedUser, ...d }; },
            get: async () => ({ exists: true, id: 'prof-uid', data: () => storedUser }),
          }),
        };
      }

      if (col === 'profissionais') {
        return {
          doc: () => ({
            update: async (d) => { storedProf = { ...storedProf, ...d }; },
            get: async () => ({ exists: true, id: 'prof-uid', data: () => storedProf }),
          }),
        };
      }

      return { doc: () => ({ get: async () => ({ exists: false }) }) };
    };

    const res = await request(app)
      .put('/api/profissional/perfil')
      .set('Authorization', 'Bearer token')
      .send({ nome: 'Dr. Novo', especialidade: 'Cardio' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('nome', 'Dr. Novo');
    expect(res.body.data).toHaveProperty('id');
  });
});
