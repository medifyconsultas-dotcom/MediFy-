import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('API Users integration tests (register variations)', () => {
  beforeEach(() => {
    // noop - tests configure mocks explicitly
  });

  it('POST /api/auth/register - conflito de email (409)', async () => {
    // Simular que o email já existe
    auth.getUserByEmail = async () => ({ uid: 'exists-uid', email: 'exists@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'exists@example.com', password: '123456', nome: 'Existe', perfil: 'paciente' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/register - cria profissional e escreve nas collections corretas (201)', async () => {
    // Simular que email não existe
    auth.getUserByEmail = async () => { throw new Error('not found'); };
    auth.createUser = async () => ({ uid: 'prof-uid', email: 'profi@example.com' });
    auth.createCustomToken = async () => 'token-prof-uid';

    // Capturar qual collection foi escrita
    let writtenCollections = [];
    db.collection = (col) => ({
      doc: () => ({
        set: async () => { writtenCollections.push(col); return {}; },
      }),
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'profi@example.com', password: '123456', nome: 'Profi', perfil: 'profissional' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('token');
    // Verificar que pelo menos gravou em 'profissionais' e em 'users'
    expect(writtenCollections).toEqual(expect.arrayContaining(['profissionais', 'users']));
  });
});
