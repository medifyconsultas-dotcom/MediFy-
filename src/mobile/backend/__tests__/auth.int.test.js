import request from 'supertest';
import app from '../src/server.js';
import { auth, db } from '../src/config/firebase.js';

describe('Auth integration tests (using config/firebase test mocks)', () => {
  // not using jest globals explicitly here to remain compatible with ESM test runner
  beforeEach(() => {
    // noop - individual tests reset the mocks they need
  });

  it('POST /api/auth/register - cria novo usuário (201)', async () => {
    // Simular que getUserByEmail lança (email não existe)
    auth.getUserByEmail = async () => { throw new Error('not found'); };
    auth.createUser = async () => ({ uid: 'new-uid', email: 'novo@example.com' });
    auth.createCustomToken = async () => 'token-new-uid';

    // Mockar db.collection().doc().set
    db.collection = () => ({ doc: () => ({ set: async () => ({}) }) });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'novo@example.com', password: '123456', nome: 'Novo', perfil: 'paciente' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('uid');
    // auth.createUser was invoked internally; success validated by response
  });

  it('POST /api/auth/login - sucesso (200)', async () => {
    auth.getUserByEmail = async () => ({ uid: 'mock-uid', email: 'test@example.com' });
    auth.createCustomToken = async () => 'mock-token';

    // Mock db to return a user doc
    const getMock = async () => ({ exists: true, data: () => ({ nome: 'Teste', perfil: 'paciente' }) });
    db.collection = () => ({ doc: () => ({ get: getMock }) });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: '123456' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('test@example.com');
    // getMock was invoked internally; success validated by response
  });

  it('POST /api/auth/login - credenciais inválidas (401)', async () => {
    auth.getUserByEmail = async () => { throw new Error('not found'); };

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@example.com', password: 'qualquer' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login - sem email e senha (400)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
  });

  it('POST /api/auth/register - erro ao criar usuário no Firebase', async () => {
    auth.getUserByEmail = async () => { throw new Error('not found'); };
    auth.createUser = async () => { throw new Error('Firebase error'); };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'novo@example.com', password: '123456', nome: 'Novo', perfil: 'paciente' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
  });

  it('POST /api/auth/register - erro ao salvar no Firestore', async () => {
    auth.getUserByEmail = async () => { throw new Error('not found'); };
    auth.createUser = async () => ({ uid: 'new-uid', email: 'novo@example.com' });
    auth.createCustomToken = async () => 'token-new-uid';

    db.collection = () => {
      throw new Error('Firestore error');
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'novo@example.com', password: '123456', nome: 'Novo', perfil: 'paciente' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
  });

  it('GET /api/auth/verify - token válido retorna dados do usuário (200)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'user-uid', email: 'user@example.com' });

    db.collection = (col) => {
      if (col === 'users') {
        return {
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({
                nome: 'Usuário Teste',
                perfil: 'paciente',
              }),
            }),
          }),
        };
      }
    };

    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('uid');
    expect(res.body.data).toHaveProperty('email');
    expect(res.body.data).toHaveProperty('nome');
    expect(res.body.data).toHaveProperty('perfil');
  });

  it('GET /api/auth/verify - usuário não encontrado (404)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'user-uid', email: 'user@example.com' });

    db.collection = (col) => {
      if (col === 'users') {
        return {
          doc: () => ({
            get: async () => ({
              exists: false,
            }),
          }),
        };
      }
    };

    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept', 'application/json');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/verify - erro ao buscar usuário (500)', async () => {
    auth.verifyIdToken = async () => ({ uid: 'user-uid', email: 'user@example.com' });

    db.collection = () => {
      throw new Error('Database error');
    };

    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login - erro ao buscar perfil no Firestore', async () => {
    auth.getUserByEmail = async () => ({ uid: 'mock-uid', email: 'test@example.com' });

    db.collection = () => {
      throw new Error('Firestore error');
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: '123456' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(404);
  });
});
